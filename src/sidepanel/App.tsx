import { useState, useEffect, useCallback, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { EditorView } from '@codemirror/view';

const scrollFix = `
  .cm-theme-vscode-dark, .cm-editor { 
    height: 100% !important; 
    width: 100% !important; 
  }
  .cm-scroller { 
    overflow: auto !important; 
    display: block !important;
  }
  .cm-scroller::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.cm-scroller::-webkit-scrollbar-thumb {
  background-color: #555;
  border-radius: 6px;
}

.cm-scroller::-webkit-scrollbar-track {
  background-color: #1e1e1e;
}
  .ask-ai-button {
    position: fixed;
    background: linear-gradient(135deg, #007acc, #5b9bd5);
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    font-weight: 600;
    box-shadow: 0 4px 16px rgba(0, 122, 204, 0.5);
    z-index: 10000;
    transition: all 0.15s ease;
    border: 1px solid rgba(255,255,255,0.3);
    pointer-events: auto;
    user-select: none;
  }
  .ask-ai-button:hover { 
    transform: translateY(-2px) scale(1.05); 
    background: linear-gradient(135deg, #1f8ad2, #6eb0e6);
    box-shadow: 0 6px 20px rgba(0, 122, 204, 0.7);
  }
`;

type ViewState = 'EDITOR' | 'CONTEXT' | 'LOGS' | 'DIFF';

interface EditorTab {
    id: string;
    filename: string;
    code: string;
    originalCode: string;
    isDirty: boolean;
    isNew?: boolean;
}

interface FileNode {
    name: string;
    kind: 'file' | 'directory';
    handle: FileSystemFileHandle | FileSystemDirectoryHandle;
    path: string;
    children?: FileNode[];
}

interface DiffLine {
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber: number;
}

interface PendingFile {
    filename: string;
    code: string;
    existingPath?: string;
}

export default function App() {
    const [activeView, setActiveView] = useState<ViewState>('EDITOR');
    const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [projectMap, setProjectMap] = useState<string>("");
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [tabs, setTabs] = useState<EditorTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>(["[SYSTEM] V2.2 Ready. AI Selection Mode Active."]);
    const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
    const [showModal, setShowModal] = useState(false);

    const [aiQuestion, setAiQuestion] = useState("");
    const [isPrompting, setIsPrompting] = useState(false);
    const [capturedSelection, setCapturedSelection] = useState("");
    const [showAskButton, setShowAskButton] = useState(false);
    const [buttonPos, setButtonPos] = useState({ x: 0, y: 0 });
    const editorViewRef = useRef<EditorView | null>(null);

    const activeTab = tabs.find(t => t.id === activeTabId) || null;

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
    };

    // Selection tooltip field - creates the "Ask AI" button
    const selectionListener = EditorView.updateListener.of((update) => {
        if (!update.selectionSet) return;

        const sel = update.state.selection.main;
        if (sel.empty) {
            setShowAskButton(false);
            return;
        }

        const selectedText = update.state.sliceDoc(sel.from, sel.to).trim();
        if (!selectedText) {
            setShowAskButton(false);
            return;
        }

        const domSel = window.getSelection();
        if (!domSel || domSel.rangeCount === 0) return;

        const rect = domSel.getRangeAt(0).getBoundingClientRect();

        setCapturedSelection(selectedText);
        setButtonPos({
            x: rect.left + 80,
            y: rect.top - 28,
        });
        setShowAskButton(true);
    });


    const handleAskAI = (selection: string) => {
        setCapturedSelection(selection);
        setIsPrompting(true);
        addLog(`AI: Selected ${selection.split('\n').length} line(s)`);
    };

    const submitToAI = () => {
        const payload = {
            question: aiQuestion,
            selectedCode: capturedSelection,
            filePath: activeTab?.id || 'unknown',
            fullFileCode: activeTab?.code || '',
            projectSkeleton: projectMap
        };

        // Copy to clipboard
        const textToCopy = `
# Question
${aiQuestion}

# Selected Code (${activeTab?.id})
\`\`\`
${capturedSelection}
\`\`\`

# Full File Context
\`\`\`
${activeTab?.code}
\`\`\`

# Project Skeleton
\`\`\`
${projectMap}
\`\`\`
`.trim();

        navigator.clipboard.writeText(textToCopy);

        addLog(`AI CONTEXT COPIED: "${aiQuestion.slice(0, 30)}..."`);
        console.log("AI Payload:", payload);

        setIsPrompting(false);
        setAiQuestion("");
        setCapturedSelection("");
    };

    // --- ENHANCED SKELETON LOGIC ---
    const generateSkeleton = (code: string) => {
        let result = code;

        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        result = result.replace(/\/\/.*/g, '');

        result = result.replace(
            /(\bfunction\s+[\w$]+\s*(<[^>]*>)?\s*\([^)]*\)(\s*:\s*[^{]+)?\s*)\{[\s\S]*?\n\}/gm,
            "$1{ /* ... */ }"
        );

        result = result.replace(
            /(\b(?:const|let|var)\s+[\w$]+\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?\([^)]*\)(\s*:\s*[^=>{]+)?\s*=>\s*)\{[\s\S]*?\n\}/gm,
            "$1{ /* ... */ }"
        );

        result = result.replace(
            /(\s+(?:async\s+)?[\w$]+\s*(<[^>]*>)?\s*\([^)]*\)(\s*:\s*[^{]+)?\s*)\{[\s\S]*?\n\s{2}\}/gm,
            "$1{ /* ... */ }"
        );

        result = result.replace(
            /(constructor\s*\([^)]*\)\s*)\{[\s\S]*?\n\s{2}\}/gm,
            "$1{ /* ... */ }"
        );

        const lines = result.split('\n');
        const structural = lines.filter(line => {
            const trimmed = line.trim();
            if (!trimmed) return false;

            if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) return true;
            if (trimmed.startsWith('type ') || trimmed.startsWith('interface ') ||
                trimmed.startsWith('enum ') || trimmed.startsWith('declare ')) return true;
            if (trimmed.startsWith('class ') || trimmed.startsWith('abstract class ')) return true;
            if (trimmed.startsWith('function ') || trimmed.startsWith('async function ')) return true;
            if (/^(?:const|let|var)\s+[\w$]+/.test(trimmed)) return true;
            if (trimmed === '}' || trimmed === '};') return true;
            if (/^\s+(?:public|private|protected|static|async)?\s*[\w$]+\s*\(/.test(line)) return true;

            return false;
        });

        return structural.join('\n');
    };

    const scanProject = async (handle: FileSystemDirectoryHandle, path = ""): Promise<string> => {
        let fullContext = "";
        for await (const entry of handle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file' && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
                const file = await entry.getFile();
                const text = await file.text();
                fullContext += `\n// ${entryPath}\n${generateSkeleton(text)}\n`;
            } else if (entry.kind === 'directory' && !['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
                fullContext += await scanProject(entry as FileSystemDirectoryHandle, entryPath);
            }
        }
        return fullContext;
    };

    const updateContextMap = async (handle: FileSystemDirectoryHandle) => {
        addLog("Scanning project skeleton...");
        const context = await scanProject(handle);
        setProjectMap(context);
        addLog("Context Map updated.");
    };

    // --- DIFF LOGIC ---
    const generateDiff = (original: string, modified: string): DiffLine[] => {
        const originalLines = original.split('\n');
        const modifiedLines = modified.split('\n');
        const diff: DiffLine[] = [];

        let i = 0, j = 0;

        while (i < originalLines.length || j < modifiedLines.length) {
            if (i < originalLines.length && j < modifiedLines.length && originalLines[i] === modifiedLines[j]) {
                diff.push({ type: 'unchanged', content: originalLines[i], lineNumber: j + 1 });
                i++;
                j++;
            } else if (i < originalLines.length && (j >= modifiedLines.length || !modifiedLines.includes(originalLines[i], j))) {
                diff.push({ type: 'removed', content: originalLines[i], lineNumber: i + 1 });
                i++;
            } else if (j < modifiedLines.length) {
                diff.push({ type: 'added', content: modifiedLines[j], lineNumber: j + 1 });
                j++;
            }
        }

        return diff;
    };

    // --- FILE SEARCH LOGIC ---
    const findFileInProject = async (handle: FileSystemDirectoryHandle, filename: string, path = ""): Promise<string | null> => {
        for await (const entry of handle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;

            if (entry.kind === 'file' && entry.name === filename) {
                return entryPath;
            } else if (entry.kind === 'directory' && !['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
                const found = await findFileInProject(entry as FileSystemDirectoryHandle, filename, entryPath);
                if (found) return found;
            }
        }
        return null;
    };

    // --- TREE & FOLDER LOGIC ---
    const buildTree = async (handle: FileSystemDirectoryHandle, path = ""): Promise<FileNode[]> => {
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
    };

    const selectFolder = async () => {
        try {
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            setDirHandle(handle);
            const tree = await buildTree(handle);
            setFileTree(tree);
            await updateContextMap(handle);
            addLog(`WORKSPACE: ${handle.name}`);
        } catch (e) { addLog("Folder selection cancelled."); }
    };

    // --- FILE OPS ---
    const getNestedFileHandle = async (root: FileSystemDirectoryHandle, path: string) => {
        const parts = path.split('/');
        let currentHandle = root;
        for (let i = 0; i < parts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(parts[i], { create: true });
        }
        return await currentHandle.getFileHandle(parts[parts.length - 1], { create: true });
    };

    const saveFile = async () => {
        if (!dirHandle || !activeTab) return;
        try {
            const fileHandle = await getNestedFileHandle(dirHandle, activeTab.id);
            const writable = await fileHandle.createWritable();
            await writable.write(activeTab.code);
            await writable.close();
            setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, isDirty: false, originalCode: t.code, isNew: false } : t));
            addLog(`SAVED: ${activeTab.filename}`);

            if (activeTab.isNew) {
                const tree = await buildTree(dirHandle);
                setFileTree(tree);
            }

            updateContextMap(dirHandle);
        } catch (e) { addLog("WRITE ERROR: Check permissions."); }
    };

    const openTab = (path: string, code: string, isNew = false) => {
        setTabs(prev => {
            const existingTab = prev.find(t => t.id === path);
            if (existingTab) {
                return prev.map(t => t.id === path ? { ...t, code, isDirty: t.originalCode !== code } : t);
            }
            const filename = path.split('/').pop() || path;
            return [...prev, { id: path, filename, code, originalCode: isNew ? '' : code, isDirty: isNew, isNew }];
        });
        setActiveTabId(path);
        setActiveView(isNew ? 'DIFF' : 'EDITOR');
    };

    const closeTab = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);
        if (activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1]?.id || null);
    };

    const onCodeChange = useCallback((value: string) => {
        if (activeTabId) setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, code: value, isDirty: t.originalCode !== value } : t));
    }, [activeTabId]);

    // --- SMART SYNC HANDLER ---
    const handleSyncCode = async (filename: string, code: string) => {
        if (!dirHandle) {
            addLog("ERROR: No workspace connected. Please select a folder first.");
            return;
        }

        addLog(`SYNC: Received ${filename}`);

        const existingPath = await findFileInProject(dirHandle, filename);

        if (existingPath) {
            try {
                const fileHandle = await getNestedFileHandle(dirHandle, existingPath);
                const file = await fileHandle.getFile();
                const existingCode = await file.text();

                if (existingCode === code) {
                    addLog(`SKIP: ${filename} - No changes detected`);
                    return;
                }

                const existingTab = tabs.find(t => t.id === existingPath);
                if (existingTab) {
                    setTabs(prev => prev.map(t =>
                        t.id === existingPath
                            ? { ...t, code, isDirty: true }
                            : t
                    ));
                } else {
                    const filename = existingPath.split('/').pop() || existingPath;
                    setTabs(prev => [...prev, {
                        id: existingPath,
                        filename,
                        code,
                        originalCode: existingCode,
                        isDirty: true,
                        isNew: false
                    }]);
                }

                setActiveTabId(existingPath);
                setActiveView('DIFF');
                addLog(`DIFF: ${filename} - Review changes before saving`);
            } catch (e) {
                addLog(`ERROR: Could not read ${filename}`);
            }
        } else {
            setPendingFile({ filename, code });
            setShowModal(true);
            addLog(`NEW: ${filename} - Select location to create`);
        }
    };

    useEffect(() => {
        const listener = (message: any) => {
            if (message.type === 'SYNC_CODE') {
                handleSyncCode(message.payload.filename, message.payload.code);
            }
        };
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener(listener);
            return () => chrome.runtime.onMessage.removeListener(listener);
        }
    }, [dirHandle, tabs]);

    const createNewFile = (path: string) => {
        if (!pendingFile) return;

        openTab(path, pendingFile.code, true);
        setShowModal(false);
        setPendingFile(null);
        addLog(`NEW FILE: ${path} - Ready to save`);
    };

    const renderTree = (nodes: FileNode[]) => nodes.map(node => (
        <div key={node.path} className="select-none">
            <div onClick={async () => {
                if (node.kind === 'file') {
                    const file = await (node.handle as FileSystemFileHandle).getFile();
                    openTab(node.path, await file.text());
                } else {
                    const next = new Set(expandedFolders);
                    next.has(node.path) ? next.delete(node.path) : next.add(node.path);
                    setExpandedFolders(next);
                }
            }} className={`flex items-center py-1 px-4 cursor-pointer hover:bg-[#2a2d2e] text-[13px] ${activeTabId === node.path ? 'bg-[#37373d] text-white' : 'text-zinc-400'}`}>
                <span className="mr-2 w-4">{node.kind === 'directory' ? (expandedFolders.has(node.path) ? '▼' : '📂') : '📄'}</span>
                <span className="truncate">{node.name}</span>
            </div>
            {node.kind === 'directory' && expandedFolders.has(node.path) && node.children && (
                <div className="pl-4 border-l border-[#333] ml-4">{renderTree(node.children)}</div>
            )}
        </div>
    ));

    const diffLines = activeTab ? generateDiff(activeTab.originalCode, activeTab.code) : [];

    return (
        <>
            <style>{scrollFix}</style>
            <div className="flex h-screen w-screen bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden">
                {/* AI Prompt Modal */}
                {isPrompting && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-[#252526] border-2 border-[#007acc] rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl">
                                    ✨
                                </div>
                                <h2 className="text-lg font-bold text-white">Ask AI about Selection</h2>
                            </div>

                            <div className="mb-4 p-3 bg-[#1e1e1e] rounded-lg border border-[#333]">
                                <div className="text-[10px] uppercase text-zinc-500 mb-2">Selected Code ({capturedSelection.split('\n').length} lines)</div>
                                <pre className="text-xs text-zinc-400 max-h-32 overflow-auto scrollbar font-mono">{capturedSelection}</pre>
                            </div>

                            <textarea
                                value={aiQuestion}
                                onChange={(e) => setAiQuestion(e.target.value)}
                                placeholder="What would you like to know about this code?"
                                className="w-full h-24 bg-[#1e1e1e] border border-[#444] rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#007acc] resize-none"
                                autoFocus
                            />

                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsPrompting(false);
                                        setAiQuestion("");
                                        setCapturedSelection("");
                                    }}
                                    className="flex-1 px-4 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitToAI}
                                    disabled={!aiQuestion.trim()}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold transition-all"
                                >
                                    📋 Copy Context to Clipboard
                                </button>
                            </div>

                            <div className="mt-3 text-[10px] text-zinc-600 text-center">
                                Context will include: selected code, full file, and project skeleton
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal for new file creation */}
                {showModal && pendingFile && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                        <div className="bg-[#252526] border border-[#444] rounded-lg p-6 max-w-lg w-full mx-4">
                            <h2 className="text-lg font-bold mb-4 text-white">Create New File</h2>
                            <p className="text-sm text-zinc-400 mb-4">
                                File <span className="text-[#4fc1ff] font-mono">{pendingFile.filename}</span> doesn't exist in the project.
                                Where would you like to create it?
                            </p>

                            <div className="space-y-2 mb-6 max-h-64 overflow-auto scrollbar">
                                <button
                                    onClick={() => createNewFile(pendingFile.filename)}
                                    className="w-full text-left px-4 py-2 bg-[#1e1e1e] hover:bg-[#2a2d2e] rounded text-sm"
                                >
                                    📄 Root: <span className="text-[#4fc1ff] font-mono">{pendingFile.filename}</span>
                                </button>

                                {fileTree.filter(n => n.kind === 'directory').map(dir => (
                                    <button
                                        key={dir.path}
                                        onClick={() => createNewFile(`${dir.path}/${pendingFile.filename}`)}
                                        className="w-full text-left px-4 py-2 bg-[#1e1e1e] hover:bg-[#2a2d2e] rounded text-sm"
                                    >
                                        📂 {dir.path}/<span className="text-[#4fc1ff] font-mono">{pendingFile.filename}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setPendingFile(null);
                                        addLog("File creation cancelled");
                                    }}
                                    className="flex-1 px-4 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const customPath = prompt(`Enter path for ${pendingFile.filename}:`, pendingFile.filename);
                                        if (customPath) createNewFile(customPath);
                                    }}
                                    className="flex-1 px-4 py-2 bg-[#007acc] hover:bg-[#1f8ad2] rounded text-sm font-bold"
                                >
                                    Custom Path
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <aside className="w-[50px] bg-[#333333] flex flex-col items-center py-4 shrink-0">
                    <button onClick={() => setActiveView('EDITOR')} className={`w-full py-4 ${activeView === 'EDITOR' ? 'text-white border-l-2 border-[#007acc]' : 'text-zinc-500'}`}>📄</button>
                    <button onClick={() => setActiveView('DIFF')} className={`w-full py-4 relative ${activeView === 'DIFF' ? 'text-white border-l-2 border-[#007acc]' : 'text-zinc-500'}`}>
                        🔄
                        {activeTab?.isDirty && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500">👹</span>}
                    </button>
                    <button onClick={() => setActiveView('CONTEXT')} className={`w-full py-4 ${activeView === 'CONTEXT' ? 'text-white border-l-2 border-[#007acc]' : 'text-zinc-500'}`}>🪾</button>
                    <button onClick={() => setActiveView('LOGS')} className={`w-full mt-auto py-4 ${activeView === 'LOGS' ? 'text-white border-l-2 border-[#007acc]' : 'text-zinc-500'}`}>🗃️</button>
                </aside>

                <aside className="w-42 bg-[#252526] border-r border-[#1e1e1e] flex flex-col shrink-0 h-full overflow-hidden">
                    <div className="p-3 text-[11px] uppercase font-bold border-b border-[#1e1e1e] flex justify-between">
                        <span>Explorer 🗻</span>
                        {dirHandle && <button onClick={() => buildTree(dirHandle).then(setFileTree)} className="hover:text-white">↻</button>}
                    </div>
                    <div className="flex-1 overflow-auto scrollbar py-2 custom-scrollbar">{renderTree(fileTree)}</div>
                </aside>

                <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                    <header className="h-9 bg-[#252526] flex items-center overflow-x-auto no-scrollbar border-b border-[#1e1e1e] shrink-0">
                        {tabs.map(tab => (
                            <div key={tab.id} onClick={() => setActiveTabId(tab.id)} className={`px-3 h-full flex items-center text-xs cursor-pointer border-r border-[#1e1e1e] shrink-0 group ${activeTabId === tab.id ? 'bg-[#1e1e1e] text-white' : 'bg-[#2d2d2d] text-zinc-500'}`}>
                                {tab.isNew && <span className="mr-1 text-green-400">✨</span>}
                                <span className="truncate max-w-[150px]">{tab.filename}</span>
                                {tab.isDirty && <span className="w-2 h-2 rounded-full bg-white ml-2 shrink-0"></span>}
                                <button onClick={(e) => closeTab(e, tab.id)} className="ml-2 opacity-0 group-hover:opacity-100 hover:bg-[#444] rounded px-1 transition-opacity">×</button>
                            </div>
                        ))}
                    </header>

                    <main className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-[#1e1e1e]">
                        {activeView === 'EDITOR' && (
                            activeTab ? (
                                <div className="flex flex-col h-full w-full">
                                    <div className="h-10 px-4 flex justify-between items-center border-b border-[#2d2d2d] shrink-0">
                                        <span className="text-base text-[#4fc1ff] font-mono truncate mr-4">
                                            {activeTab.isNew && <span className="text-green-400">NEW: </span>}
                                            {activeTab.id}
                                        </span>
                                        <div className="flex gap-2">
                                            {activeTab.isDirty && (
                                                <button onClick={() => setActiveView('DIFF')} className="bg-[#5a5a5a] text-white px-3 py-1 text-[11px] rounded hover:bg-[#6a6a6a] uppercase font-bold shrink-0">🎏 Diff</button>
                                            )}
                                            <button onClick={saveFile} className="bg-[#007acc] text-white px-3 py-1 text-[11px] rounded hover:bg-[#1f8ad2] uppercase font-bold shrink-0">
                                                {activeTab.isNew ? 'Create' : '💾 Save'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0 relative overflow-hidden bg-[#1e1e1e]">
                                        {showAskButton && (
                                            <div
                                                className="ask-ai-button"
                                                style={{ left: `${buttonPos.x}px`, top: `${buttonPos.y}px` }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleAskAI(capturedSelection);
                                                }}
                                            >
                                                ✨ Ask AI
                                            </div>
                                        )}
                                        <CodeMirror
                                            value={activeTab.code}
                                            theme={vscodeDark}
                                            height="100%"
                                            width="100%"
                                            className="absolute inset-0"
                                            extensions={[
                                                javascript({ jsx: true, typescript: true }),
                                                selectionListener
                                            ]}
                                            onChange={onCodeChange}
                                            onCreateEditor={(view) => {
                                                editorViewRef.current = view;
                                            }}
                                            basicSetup={{
                                                lineNumbers: true,
                                                highlightActiveLine: true,
                                                bracketMatching: true,
                                                autocompletion: true,
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : <div className="h-full flex items-center justify-center text-zinc-700 italic">
                                {!dirHandle ? 'Connect a workspace to get started' : 'Select a file from Explorer or sync code from chat'}
                            </div>
                        )}

                        {activeView === 'DIFF' && (
                            activeTab ? (
                                <div className="h-full flex flex-col overflow-hidden">
                                    <div className="p-3 bg-[#252526] border-b border-[#333] flex justify-between items-center shrink-0">
                                        <div>
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                                {activeTab.isNew ? 'New File' : 'Changes'}: {activeTab.filename}
                                            </span>
                                            {activeTab.isNew && (
                                                <p className="text-[10px] text-zinc-600 mt-1">This file will be created at: {activeTab.id}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => {
                                                if (activeTab.isNew) {
                                                    closeTab(new MouseEvent('click') as any, activeTab.id);
                                                } else {
                                                    setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, code: t.originalCode, isDirty: false } : t));
                                                }
                                                addLog("Changes discarded");
                                            }} className="text-[10px] text-red-400 hover:text-red-300 uppercase px-2 py-1 bg-red-900/20 rounded">
                                                {activeTab.isNew ? 'Cancel' : 'Discard'}
                                            </button>
                                            <button onClick={saveFile} className="text-[10px] text-green-400 hover:text-green-300 uppercase px-2 py-1 bg-green-900/20 rounded">
                                                {activeTab.isNew ? 'Create File' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-auto scrollbar min-h-0 bg-[#1e1e1e] font-medium tracking-wide text-[13px]">
                                        {!activeTab.isDirty && !activeTab.isNew ? (
                                            <div className="h-full flex items-center justify-center text-zinc-600 italic">No changes to display</div>
                                        ) : (
                                            <div className="p-4">
                                                {diffLines.map((line, i) => (
                                                    <div key={i} className={`flex ${
                                                        line.type === 'added' ? 'bg-green-900/20 text-green-300' :
                                                            line.type === 'removed' ? 'bg-red-900/20 text-red-300' :
                                                                'text-zinc-500'
                                                    }`}>
                                                        <span className={`w-12 text-right pr-4 select-none ${
                                                            line.type === 'unchanged' ? 'text-zinc-700' : 'font-bold'
                                                        }`}>
                                                            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}{line.lineNumber}
                                                        </span>
                                                        <span className="flex-1 whitespace-pre">{line.content || ' '}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : <div className="h-full flex items-center justify-center text-zinc-700 italic">Open a file to view changes</div>
                        )}

                        {activeView === 'CONTEXT' && (
                            <div className="h-full flex flex-col overflow-hidden">
                                <div className="p-3 bg-[#252526] border-b border-[#333] flex justify-between shrink-0">
                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">PROJECT SKELETON 🪧</span>
                                    <button onClick={() => {
                                        navigator.clipboard.writeText(projectMap);
                                        addLog("Copied Map to Clipboard");
                                    }} className="text-[10px] text-[#007acc] hover:underline uppercase">Copy Map</button>
                                </div>
                                <div className="flex-1 overflow-auto scrollbar min-h-0 bg-[#1e1e1e]">
                                    <pre className="p-6 text-[16px] font-bold tracking-wide text-zinc-500 whitespace-pre">{projectMap || "// Connect project to see skeleton..."}</pre>
                                </div>
                            </div>
                        )}

                        {activeView === 'LOGS' && (
                            <div className="flex-1 overflow-auto scrollbar p-4 font-bold tracking-wide text-base text-zinc-500">
                                {logs.map((log, i) => <div key={i} className="mb-1 border-l border-[#333] pl-2">{log}</div>)}
                            </div>
                        )}
                    </main>

                    <footer className="h-6 bg-[#007acc] text-white flex items-center px-3 text-[11px] shrink-0 justify-between">
                        <button onClick={selectFolder} className="hover:bg-[#1f8ad2] px-2 h-full flex items-center gap-2">📂 {dirHandle ? dirHandle.name : 'Connect Project'}</button>
                        <span>V2.2.0</span>
                    </footer>
                </div>
            </div>
        </>
    );
}