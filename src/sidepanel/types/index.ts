export type ViewState = 'EDITOR' | 'CONTEXT' | 'LOGS' | 'DIFF' | 'TERMINAL' | 'SETTINGS';

export interface EditorTab {
    id: string;
    filename: string;
    code: string;
    originalCode: string;
    isDirty: boolean;
    isNew?: boolean;
}

export interface FileNode {
    name: string;
    kind: 'file' | 'directory';
    handle: FileSystemFileHandle | FileSystemDirectoryHandle;
    path: string;
    children?: FileNode[];
}

export interface DiffLine {
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber: number;
}

export interface PendingFile {
    filename: string;
    code: string;
    existingPath?: string;
}