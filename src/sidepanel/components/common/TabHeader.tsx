import React from 'react';
import type { EditorTab } from '../../types';

interface TabHeaderProps {
    tabs: EditorTab[];
    activeTabId: string | null;
    setActiveTabId: (id: string) => void;
    // Fix: Swapped argument order to match the hook logic
    closeTab: (id: string, e?: React.MouseEvent) => void;
}

export default function TabHeader({ tabs, activeTabId, setActiveTabId, closeTab }: TabHeaderProps) {
    return (
        <header className="h-9 bg-[#252526] flex items-center overflow-x-auto no-scrollbar border-b border-[#1e1e1e] shrink-0">
            {tabs.map(tab => (
                <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`px-3 h-full flex items-center text-xs cursor-pointer border-r border-[#1e1e1e] shrink-0 group transition-colors ${
                        activeTabId === tab.id
                            ? 'bg-[#1e1e1e] text-white'
                            : 'bg-[#2d2d2d] text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    {tab.isNew && <span className="mr-1 text-green-400">✨</span>}
                    <span className="truncate max-w-[150px]">{tab.filename}</span>

                    {/* Status Indicator (Dirty vs Saved) */}
                    {tab.isDirty ? (
                        <span className="w-2 h-2 rounded-full bg-white ml-2 shrink-0"></span>
                    ) : (
                        <button
                            onClick={(e) => {
                                // Stop selection when clicking close
                                e.stopPropagation();
                                // Fix: Passing ID first, then the Event
                                closeTab(tab.id, e);
                            }}
                            className="ml-2 opacity-0 group-hover:opacity-100 hover:bg-[#444] rounded px-1 transition-opacity text-sm leading-none"
                        >
                            ×
                        </button>
                    )}
                </div>
            ))}
        </header>
    );
}