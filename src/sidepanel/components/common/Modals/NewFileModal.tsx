import type { PendingFile, FileNode } from '../../../types';

interface NewFileModalProps {
    pendingFile: PendingFile;
    fileTree: FileNode[];
    onClose: () => void;
    onCreate: (path: string) => void;
    onCustomPath: () => void;
}

export default function NewFileModal({ pendingFile, fileTree, onClose, onCreate, onCustomPath }: NewFileModalProps) {

    // Helper to get ALL directories in the project, including nested ones
    const getAllDirectories = (nodes: FileNode[]): string[] => {
        let dirs: string[] = [];
        nodes.forEach(node => {
            if (node.kind === 'directory') {
                dirs.push(node.path);
                if (node.children) {
                    dirs = [...dirs, ...getAllDirectories(node.children)];
                }
            }
        });
        return dirs.sort();
    };

    const allDirs = getAllDirectories(fileTree);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="bg-[#252526] border border-[#444] rounded-lg p-6 max-w-lg w-full mx-4 shadow-2xl">
                <h2 className="text-lg font-bold mb-2 text-white">Create New File</h2>
                <p className="text-sm text-zinc-400 mb-6">
                    File <span className="text-[#4fc1ff] font-mono font-bold">{pendingFile.filename}</span> not found. Choose a location:
                </p>

                <div className="space-y-1 mb-6 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                    {/* Option: Root Directory */}
                    <button
                        onClick={() => onCreate(pendingFile.filename)}
                        className="w-full text-left px-4 py-3 bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#333] rounded text-sm transition-colors flex items-center gap-2"
                    >
                        <span className="opacity-70">📄</span>
                        <span>Root: <span className="text-zinc-500">{pendingFile.filename}</span></span>
                    </button>

                    {/* Options: All Sub-directories */}
                    {allDirs.map(path => (
                        <button
                            key={path}
                            onClick={() => onCreate(`${path}/${pendingFile.filename}`)}
                            className="w-full text-left px-4 py-3 bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#333] rounded text-sm transition-colors flex items-center gap-2"
                        >
                            <span className="opacity-70">📂</span>
                            <span className="truncate">{path}/<span className="text-[#4fc1ff]">{pendingFile.filename}</span></span>
                        </button>
                    ))}
                </div>

                <div className="flex gap-3 pt-2 border-t border-[#333]">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-[#3a3a3a] hover:bg-[#454545] text-white rounded text-sm transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onCustomPath}
                        className="flex-1 px-4 py-2 bg-[#007acc] hover:bg-[#118ad4] text-white rounded text-sm font-bold transition-colors"
                    >
                        Custom Path...
                    </button>
                </div>
            </div>
        </div>
    );
}