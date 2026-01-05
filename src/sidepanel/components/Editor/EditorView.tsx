import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { getLanguageExtension, getLanguageName } from '../../utils/languageUtils';
import type {EditorTab} from '../../types';

interface EditorViewProps {
    activeTab: EditorTab;
    onCodeChange: (value: string) => void;
    onSave: () => void;
    onSwitchToDiff: () => void;
    showAskButton: boolean;
    buttonPos: { x: number; y: number };
    onAskAI: (selection: string) => void;
    capturedSelection: string;
    selectionListener: any; // The Extension from App.tsx
}

export default function EditorView({
                                       activeTab,
                                       onCodeChange,
                                       onSave,
                                       onSwitchToDiff,
                                       showAskButton,
                                       buttonPos,
                                       onAskAI,
                                       capturedSelection,
                                       selectionListener
                                   }: EditorViewProps) {
    return (
        <div className="flex flex-col h-full w-full">
            {/* Editor Toolbar */}
            <div className="h-10 px-4 flex justify-between items-center border-b border-[#2d2d2d] shrink-0">
                <span className="text-base text-[#4fc1ff] font-mono truncate mr-4">
                    {activeTab.isNew && <span className="text-green-400">NEW: </span>}
                    {activeTab.id}
                    <span className="text-[#858585] text-xs ml-2">({getLanguageName(activeTab.filename)})</span>
                </span>
                <div className="flex gap-2">
                    {activeTab.isDirty && (
                        <button
                            onClick={onSwitchToDiff}
                            className="bg-[#5a5a5a] text-white px-3 py-1 text-[11px] rounded hover:bg-[#6a6a6a] uppercase font-bold shrink-0"
                        >
                            🎏 Diff
                        </button>
                    )}
                    <button
                        onClick={onSave}
                        className="bg-[#007acc] text-white px-3 py-1 text-[11px] rounded hover:bg-[#1f8ad2] uppercase font-bold shrink-0"
                    >
                        {activeTab.isNew ? 'Create' : '💾 Save'}
                    </button>
                </div>
            </div>

            {/* Editor Container */}
            <div className="flex-1 min-h-0 relative overflow-hidden bg-[#1e1e1e]">
                {/* Floating Ask AI Button */}
                {showAskButton && (
                    <div
                        className="ask-ai-button"
                        style={{
                            left: `${buttonPos.x}px`,
                            top: `${buttonPos.y}px`
                        }}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onAskAI(capturedSelection);
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
                        getLanguageExtension(activeTab.filename),
                        selectionListener
                    ]}
                    onChange={onCodeChange}
                    basicSetup={{
                        lineNumbers: true,
                        highlightActiveLine: true,
                        bracketMatching: true,
                        autocompletion: true,
                    }}
                />
            </div>
        </div>
    );
}