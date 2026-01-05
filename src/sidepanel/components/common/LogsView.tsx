export default function LogsView({ logs }: { logs: string[] }) {
    return (
        <div className="flex-1 overflow-auto scrollbar p-4 font-bold tracking-wide text-base text-zinc-500">
            {logs.map((log, i) => (
                <div key={i} className="mb-1 border-l border-[#333] pl-2">
                    {log}
                </div>
            ))}
        </div>
    );
}