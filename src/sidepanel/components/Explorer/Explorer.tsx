import type {FileNode} from '../../types';

interface ExplorerProps {
    fileTree: FileNode[];
    expandedFolders: Set<string>;
    toggleFolder: (path: string) => void;
    onFileClick: (path: string, handle: FileSystemFileHandle) => void;
    activeTabId: string | null;
    onRefresh: () => void;
    workspaceName?: string;
}

export default function Explorer({
                                     fileTree, expandedFolders, toggleFolder, onFileClick, activeTabId, onRefresh, workspaceName
                                 }: ExplorerProps) {

    const renderTree = (nodes: FileNode[]) => nodes.map(node => (
        <div key={node.path} className="select-none">
            <div
                onClick={() => node.kind === 'file'
                    ? onFileClick(node.path, node.handle as FileSystemFileHandle)
                    : toggleFolder(node.path)
                }
                className={`flex items-center py-1 px-4 cursor-pointer hover:bg-[#2a2d2e] text-[13px] ${
                    activeTabId === node.path ? 'bg-[#37373d] text-white' : 'text-zinc-400'
                }`}
            >
                <span className="mr-2 w-4">{node.kind === 'directory' ? (expandedFolders.has(node.path) ? '▼' : '📂') : '📄'}</span>
                <span className="truncate">{node.name}</span>
            </div>
            {node.kind === 'directory' && expandedFolders.has(node.path) && node.children && (
                <div className="pl-4 border-l border-[#333] ml-4">{renderTree(node.children)}</div>
            )}
        </div>
    ));

    return (
        <aside className="w-48 bg-[#252526] border-r border-[#1e1e1e] flex flex-col shrink-0 h-full overflow-hidden">
            <div className="p-3 text-[11px] uppercase font-bold border-b border-[#1e1e1e] flex justify-between">
                <span className="truncate">{workspaceName || 'Explorer'}</span>
                <button onClick={onRefresh} className="hover:text-white">↻</button>
            </div>
            <div className="flex-1 overflow-auto scrollbar py-2">{renderTree(fileTree)}</div>
        </aside>
    );
}