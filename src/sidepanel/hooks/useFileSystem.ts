import { useState, useCallback } from 'react';
import type { FileNode } from '../types';
// Import only generateSkeleton since we are defining scanProject locally
import { generateSkeleton } from '../utils/fileUtils';

export const useFileSystem = (addLog: (msg: string) => void) => {
    const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [projectMap, setProjectMap] = useState<string>("");
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    // --- 1. Build Visual Tree ---
    const buildTree = useCallback(async (handle: FileSystemDirectoryHandle, path = ""): Promise<FileNode[]> => {
        const nodes: FileNode[] = [];
        for await (const entry of handle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            const node: FileNode = { name: entry.name, kind: entry.kind, handle: entry, path: entryPath };

            if (entry.kind === 'directory' && !['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
                node.children = await buildTree(entry as FileSystemDirectoryHandle, entryPath);
            }
            nodes.push(node);
        }
        return nodes.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1));
    }, []);

    // --- 2. Build Context Map (Skeletons) ---
    const scanProject = useCallback(async (handle: FileSystemDirectoryHandle, path = ""): Promise<string> => {
        let fullContext = "";
        for await (const entry of handle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) continue;

            if (entry.kind === 'file' && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
                const file = await (entry as FileSystemFileHandle).getFile();
                const text = await file.text();
                const skeleton = generateSkeleton(text);
                fullContext += `\n// --- FILE: ${entryPath} ---\n${skeleton}\n`;
            } else if (entry.kind === 'directory') {
                fullContext += await scanProject(entry as FileSystemDirectoryHandle, entryPath);
            }
        }
        return fullContext;
    }, []);

    // --- 3. Folder Navigation & Search ---
    const findFileInProject = async (handle: FileSystemDirectoryHandle, filename: string, path = ""): Promise<string | null> => {
        for await (const entry of handle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file' && entry.name === filename) return entryPath;
            if (entry.kind === 'directory' && !['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                const found = await findFileInProject(entry as FileSystemDirectoryHandle, filename, entryPath);
                if (found) return found;
            }
        }
        return null;
    };

    const getNestedFileHandle = async (root: FileSystemDirectoryHandle, path: string) => {
        const parts = path.split('/');
        let currentHandle = root;
        for (let i = 0; i < parts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(parts[i], { create: true });
        }
        return await currentHandle.getFileHandle(parts[parts.length - 1], { create: true });
    };

    // --- 4. Main Actions ---
    const selectFolder = async () => {
        try {
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            setDirHandle(handle);

            addLog("Indexing file tree...");
            const tree = await buildTree(handle);
            setFileTree(tree);

            addLog("Generating project skeleton...");
            const context = await scanProject(handle);
            setProjectMap(context);

            addLog(`WORKSPACE READY: ${handle.name}`);
        } catch (e) {
            addLog("Folder selection cancelled or failed.");
            console.error(e);
        }
    };

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };

    return {
        dirHandle,
        fileTree,
        setFileTree,
        projectMap,
        setProjectMap,
        expandedFolders,
        setExpandedFolders,
        selectFolder,
        scanProject,
        toggleFolder,
        findFileInProject,
        getNestedFileHandle,
        refreshTree: async () => {
            if (dirHandle) {
                const tree = await buildTree(dirHandle);
                setFileTree(tree);
                const context = await scanProject(dirHandle);
                setProjectMap(context);
                addLog("Project refreshed.");
            }
        }
    };
};