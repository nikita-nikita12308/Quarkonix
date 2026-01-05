export default function Footer({ workspaceName, onConnect, version }: any) {
    return (
        <footer className="h-6 bg-[#007acc] text-white flex items-center px-3 text-[11px] shrink-0 justify-between">
            <button onClick={onConnect} className="hover:bg-[#1f8ad2] px-2 h-full flex items-center gap-2">
                📂 {workspaceName || 'Connect Project'}
            </button>
            <span>{version}</span>
        </footer>
    );
}