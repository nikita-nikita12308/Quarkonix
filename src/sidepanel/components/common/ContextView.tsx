export default function ContextView({ projectMap, onCopy }: any) {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="p-3 bg-[#252526] border-b border-[#333] flex justify-between shrink-0">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">PROJECT SKELETON 🪧</span>
                <button onClick={onCopy} className="text-[10px] text-[#007acc] hover:underline uppercase">Copy Map</button>
            </div>
            <div className="flex-1 overflow-auto scrollbar min-h-0 bg-[#1e1e1e]">
                <pre className="p-6 text-[16px] font-bold tracking-wide text-zinc-500 whitespace-pre">
                    {projectMap || "// Connect project to see skeleton..."}
                </pre>
            </div>
        </div>
    );
}