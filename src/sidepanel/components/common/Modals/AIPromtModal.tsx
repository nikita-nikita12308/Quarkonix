
interface AIPromptModalProps {
    isOpen: boolean;
    capturedSelection: string;
    aiQuestion: string;
    setAiQuestion: (val: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}

export default function AIPromptModal({
                                          isOpen, capturedSelection, aiQuestion, setAiQuestion, onClose, onSubmit
                                      }: AIPromptModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-[#252526] border-2 border-[#007acc] rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl">✨</div>
                    <h2 className="text-lg font-bold text-white">Ask AI about Selection</h2>
                </div>

                <div className="mb-4 p-3 bg-[#1e1e1e] rounded-lg border border-[#333]">
                    <div className="text-[10px] uppercase text-zinc-500 mb-2">Selected Code</div>
                    <pre className="text-[15px] text-zinc-400 max-h-64 overflow-auto scrollbar font-bold tracking-wide">
                        {capturedSelection}
                    </pre>
                </div>

                <textarea
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="What would you like to know about this code?"
                    className="w-full h-24 bg-[#1e1e1e] border border-[#444] rounded-lg p-3 text-sm text-white focus:border-[#007acc] resize-none"
                    autoFocus
                />

                <div className="mt-4 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg text-sm">
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={!aiQuestion.trim()}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm font-bold disabled:opacity-50"
                    >
                        📋 Copy Context to Clipboard
                    </button>
                </div>
            </div>
        </div>
    );
}