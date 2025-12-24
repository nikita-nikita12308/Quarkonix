
export interface UserSettings {
    executionMode: 'CLI' | 'BROWSER';
    autoSync: boolean;
    aiModel: string;
}

interface SettingsProps {
    settings: UserSettings;
    updateSettings: (newSettings: Partial<UserSettings>) => void;
}

export default function Settings({ settings, updateSettings }: SettingsProps) {
    return (
        <div className="flex-1 bg-[#1e1e1e] h-full overflow-y-auto scrollbar p-10">
            <div className="max-w-2xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-zinc-500 text-sm">Configure your AI bridge and file execution preferences.</p>
                </header>

                <div className="space-y-8">
                    {/* EXECUTION STRATEGY */}
                    <div className="bg-[#252526] border border-[#333] rounded-xl p-6 shadow-xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-base font-semibold text-zinc-200">Execution Mode</h3>
                                <p className="text-xs text-zinc-500 mt-1">Where should file changes be applied?</p>
                            </div>
                            <div className="flex p-1 bg-[#1e1e1e] rounded-lg border border-[#444]">
                                <button
                                    onClick={() => updateSettings({ executionMode: 'CLI' })}
                                    className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                                        settings.executionMode === 'CLI' ? 'bg-[#007acc] text-white' : 'text-zinc-500'
                                    }`}
                                >
                                    TERMINAL CLI
                                </button>
                                <button
                                    onClick={() => updateSettings({ executionMode: 'BROWSER' })}
                                    className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                                        settings.executionMode === 'BROWSER' ? 'bg-[#007acc] text-white' : 'text-zinc-500'
                                    }`}
                                >
                                    BROWSER API
                                </button>
                            </div>
                        </div>
                        <div className="text-[11px] text-zinc-400 bg-[#1a1a1a] p-3 rounded border-l-2 border-[#007acc]">
                            {settings.executionMode === 'CLI'
                                ? "⚡ Using Terminal Bridge: Files update instantly in the background via Node.js."
                                : "🌐 Using Browser API: Files update via Chrome's File System Access (requires manual permission)."}
                        </div>
                    </div>

                    {/* AUTO-SYNC TOGGLE */}
                    <div className="bg-[#252526] border border-[#333] rounded-xl p-6 shadow-xl flex justify-between items-center">
                        <div>
                            <h3 className="text-base font-semibold text-zinc-200">Auto-Sync Code</h3>
                            <p className="text-xs text-zinc-500 mt-1">Automatically process code blocks when AI finishes response.</p>
                        </div>
                        <button
                            onClick={() => updateSettings({ autoSync: !settings.autoSync })}
                            className={`w-12 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${
                                settings.autoSync ? 'bg-green-600' : 'bg-zinc-700'
                            }`}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                                settings.autoSync ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    {/* AI MODEL */}
                    <div className="bg-[#252526] border border-[#333] rounded-xl p-6 shadow-xl">
                        <h3 className="text-base font-semibold text-zinc-200 mb-4">AI Context Strategy</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {['GPT-4o (Full)', 'DeepSeek (Fast)', 'Claude (Refactor)'].map((model) => (
                                <label key={model} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                    settings.aiModel === model ? 'border-[#007acc] bg-[#007acc]/10' : 'border-[#444] bg-[#1e1e1e]'
                                }`}>
                                    <input
                                        type="radio"
                                        className="hidden"
                                        name="aiModel"
                                        checked={settings.aiModel === model}
                                        onChange={() => updateSettings({ aiModel: model })}
                                    />
                                    <span className={`w-3 h-3 rounded-full border-2 mr-3 ${
                                        settings.aiModel === model ? 'border-white bg-white' : 'border-zinc-600'
                                    }`} />
                                    <span className="text-sm text-zinc-300">{model}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}