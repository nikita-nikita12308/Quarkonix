export default function EmptyState({ connected }: { connected: boolean }) {
    return (
        <div className="h-full flex items-center justify-center text-zinc-700 italic">
            {!connected
                ? 'Connect a workspace to get started'
                : 'Select a file from Explorer or sync code from chat'}
        </div>
    );
}