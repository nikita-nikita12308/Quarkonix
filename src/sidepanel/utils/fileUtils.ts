import type { FileNode } from '../types';
import { detectLanguage } from './languageUtils';

/**
 * Generates a text-based tree structure of the project
 * to give the AI context of the folder layout.
 */
export const scanProject = async (handle: FileSystemDirectoryHandle, indent = ""): Promise<string> => {
    let structure = "";
    for await (const entry of handle.values()) {
        if (['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.pytest_cache', '.venv', 'venv'].includes(entry.name)) continue;

        structure += `${indent}${entry.kind === 'directory' ? '📂' : '📄'} ${entry.name}\n`;

        if (entry.kind === 'directory') {
            structure += await scanProject(entry as FileSystemDirectoryHandle, indent + "  ");
        }
    }
    return structure;
};

/**
 * Builds the nested FileNode array used by the Explorer UI.
 */
export const buildTree = async (handle: FileSystemDirectoryHandle, path = ""): Promise<FileNode[]> => {
    const nodes: FileNode[] = [];
    for await (const entry of handle.values()) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;
        const node: FileNode = {
            name: entry.name,
            kind: entry.kind as 'file' | 'directory',
            handle: entry,
            path: entryPath
        };

        if (entry.kind === 'directory' && !['node_modules', '.git', 'dist', 'build', '__pycache__', '.pytest_cache', '.venv', 'venv'].includes(entry.name)) {
            node.children = await buildTree(entry as FileSystemDirectoryHandle, entryPath);
        }
        nodes.push(node);
    }
    // Sort: Folders first, then Alphabetical
    return nodes.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1));
};

/**
 * Remove comments and collapse function/class bodies
 */
export const generateSkeleton = (code: string, filename: string = ''): string => {
    const language = filename ? detectLanguage(filename) : 'javascript';
    
    if (language === 'python') {
        return generatePythonSkeleton(code);
    }
    
    return generateJavaScriptSkeleton(code);
};

/**
 * Generate skeleton for JavaScript/TypeScript files
 */
const generateJavaScriptSkeleton = (code: string): string => {
    let result = code;

    // Remove block comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove line comments
    result = result.replace(/\/\/.*/g, '');

    // Collapse function bodies
    result = result.replace(
        /(\bfunction\s+[\w$]+\s*(<[^>]*>)?\s*\([^)]*\)(\s*:\s*[^{]+)?\s*)\{[\s\S]*?\n\}/gm,
        "$1{ /* ... */ }"
    );

    // Collapse arrow functions
    result = result.replace(
        /(\b(?:const|let|var)\s+[\w$]+\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?\([^)]*\)(\s*:\s*[^=>{]+)?\s*=>\s*)\{[\s\S]*?\n\}/gm,
        "$1{ /* ... */ }"
    );

    // Collapse class methods
    result = result.replace(
        /(\s+(?:async\s+)?[\w$]+\s*(<[^>]*>)?\s*\([^)]*\)(\s*:\s*[^{]+)?\s*)\{[\s\S]*?\n\s{2}\}/gm,
        "$1{ /* ... */ }"
    );

    // Collapse constructors
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

/**
 * Generate skeleton for Python files
 */
const generatePythonSkeleton = (code: string): string => {
    let result = code;

    // Remove docstrings (triple quotes)
    result = result.replace(/"""[\s\S]*?"""/g, '""""""');
    result = result.replace(/'''[\s\S]*?'''/g, "''''''");

    // Remove line comments
    result = result.replace(/#.*/g, '');

    // Collapse function bodies - match def and indented content
    result = result.replace(
        /^(\s*(?:async\s+)?def\s+[\w_]+\s*\([^)]*\)\s*(?:->\s*[^:]+)?\s*:)\n((?:\n|.)+?)(?=\n(?=\S|\Z))/gm,
        "$1\n    pass"
    );

    // Collapse class bodies
    result = result.replace(
        /^(\s*class\s+[\w_]+\s*(?:\([^)]*\))?\s*:)\n((?:\n|.)+?)(?=\n(?=\S|\Z))/gm,
        "$1\n    pass"
    );

    const lines = result.split('\n');
    const structural = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;

        // Import statements
        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) return true;
        // Class definitions
        if (trimmed.startsWith('class ')) return true;
        // Function definitions (including async)
        if (trimmed.startsWith('def ') || trimmed.startsWith('async def ')) return true;
        // Special methods
        if (trimmed.startsWith('@')) return true;
        // Module-level variables
        if (/^[A-Z_][A-Z0-9_]*\s*=/.test(trimmed)) return true;

        return false;
    });

    return structural.join('\n');
};