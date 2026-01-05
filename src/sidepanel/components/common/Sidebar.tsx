import type {ViewState} from '../../types';

interface SidebarProps {
    activeView: ViewState;
    setActiveView: (view: ViewState) => void;
    hasDirtyTabs: boolean;
}

export default function Sidebar({ activeView, setActiveView, hasDirtyTabs }: SidebarProps) {
    const navItems = [
        { id: 'EDITOR', icon: '📄' },
        { id: 'DIFF', icon: '🔄', badge: hasDirtyTabs },
        { id: 'CONTEXT', icon: '🪧' },
        { id: 'TERMINAL', icon: '🐚' },
    ] as const;

    return (
        <aside className="w-[50px] bg-[#333333] flex flex-col items-center py-4 shrink-0">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full py-4 relative transition-colors ${
                        activeView === item.id ? 'text-white border-l-2 border-[#007acc]' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    {item.icon}
                    {item.badge && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500" />}
                </button>
            ))}

            <button
                onClick={() => setActiveView('LOGS')}
                className={`w-full mt-auto py-4 ${activeView === 'LOGS' ? 'text-white border-l-2 border-[#007acc]' : 'text-zinc-500'}`}
            >
                🗃️
            </button>
            <button
                onClick={() => setActiveView('SETTINGS')}
                className={`w-full mt-2 py-4 ${activeView === 'SETTINGS' ? 'text-white border-l-2 border-[#007acc]' : 'text-zinc-500'}`}
            >
                ⚙️
            </button>
        </aside>
    );
}