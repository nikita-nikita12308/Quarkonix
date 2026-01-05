import type {EditorTab, DiffLine} from '../../types';

interface DiffViewProps {
    activeTab: EditorTab;
    diffLines: DiffLine[];
    onDiscard: () => void;
    onSave: () => void;
    addLog: (msg: string) => void;
}
export default function DiffView({ activeTab, diffLines, onDiscard, onSave, addLog }: DiffViewProps) {

    const handleSave = () => {
        addLog(`SAVE: Applying changes to ${activeTab.filename}...`);
        onSave();
    };

    const handleDiscard = () => {
        addLog(`DISCARD: Reverting changes in ${activeTab.filename}.`);
        onDiscard();
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#1e1e1e]">
            {/* Header */}
            <div className="p-3 bg-[#252526] border-b border-[#333] flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${activeTab.isNew ? 'bg-blue-400' : 'bg-yellow-400'}`}></span>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        {activeTab.isNew ? 'New File' : 'Diff'}: {activeTab.id}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDiscard}
                        className="text-[10px] text-zinc-300 hover:text-white uppercase px-3 py-1.5 bg-[#3a3a3a] hover:bg-[#454545] rounded font-bold transition-colors"
                    >
                        {activeTab.isNew ? 'Cancel' : 'Discard'}
                    </button>
                    <button
                        onClick={handleSave}
                        className="text-[10px] text-white uppercase px-3 py-1.5 bg-[#007acc] hover:bg-[#118ad4] rounded font-bold transition-colors"
                    >
                        {activeTab.isNew ? 'Create File' : 'Apply Changes'}
                    </button>
                </div>
            </div>

            {/* Diff Content */}
            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-zinc-700 bg-[#1e1e1e]">
                <div className="py-4 font-mono text-[13px] leading-6">
                    {diffLines.length > 0 ? (diffLines.map((line, i) => (
                                <div key={i} className={`flex font-mono text-[12px] leading-5 ${
                                    line.type === 'added' ? 'bg-green-950/30 text-green-300' :
                                        line.type === 'removed' ? 'bg-red-950/30 text-red-300' :
                                            'text-zinc-400 hover:bg-white/5'
                                }`}>
                                    {/* Sign Indicator */}
                                    <span className="w-6 flex justify-center select-none opacity-50">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
        </span>

                                    {/* Line Number */}
                                    <span className="w-10 text-right pr-4 select-none text-zinc-600 border-r border-zinc-800 mr-4">
            {line.lineNumber}
        </span>

                                    {/* The Actual Content */}
                                    <span className="flex-1 whitespace-pre">{line.content || ' '}</span>
                                </div>
                            ))
                    ) : (
                        <div className="text-center py-20 text-zinc-600 italic">
                            No changes detected between working copy and disk.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}