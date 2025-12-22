import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export default function TerminalView({ onCaptureError }: { onCaptureError: (error: string) => void }) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xterm = useRef<Terminal | null>(null);
    const ws = useRef<WebSocket | null>(null);

    // TerminalView.tsx

    useEffect(() => {
        if (!terminalRef.current) return;

        // 1. Initialize with convertEol: true
        xterm.current = new Terminal({
            convertEol: true, // Fixes Windows "staircase" text
            cursorBlink: true,
            theme: { /* your colors */ },
            fontFamily: "'Cascadia Code', monospace",
        });

        const fitAddon = new FitAddon();
        xterm.current.loadAddon(fitAddon);
        xterm.current.open(terminalRef.current);

        // Initial fit
        setTimeout(() => fitAddon.fit(), 100);

        // 2. Connect and Handshake
        ws.current = new WebSocket('ws://localhost:8080');

        ws.current.onopen = () => {
            // Tell the bridge we are ready and give dimensions
            const dims = fitAddon.proposeDimensions();
            ws.current?.send(JSON.stringify({
                type: 'READY',
                cols: dims?.cols || 80,
                rows: dims?.rows || 24
            }));
        };

        ws.current.onmessage = (event) => {
            xterm.current?.write(event.data);
        };

        // 3. Handle User Input
        xterm.current.onData((data) => {
            ws.current?.send(JSON.stringify({ type: 'INPUT', input: data }));
        });

        // 4. Handle Resize Events
        window.addEventListener('resize', () => {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims) {
                ws.current?.send(JSON.stringify({
                    type: 'RESIZE',
                    cols: dims.cols,
                    rows: dims.rows
                }));
            }
        });

        return () => {
            ws.current?.close();
            xterm.current?.dispose();
        };
    }, []);

    const handleCopySelection = () => {
        const selection = xterm.current?.getSelection();
        if (selection) {
            onCaptureError(selection);
        }
    };

    return (

        <div className="h-full flex flex-col bg-[#1e1e1e]">
            <div className="flex justify-between p-2 border-b border-[#333]">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Local Terminal</span>
                <button
                    onClick={handleCopySelection}
                    className="text-[10px] bg-[#333] px-2 py-1 rounded hover:bg-[#444]"
                >
                    📋 Copy Selection to Chat
                </button>
            </div>
            <div className="flex flex-col h-full bg-[#1e1e1e] border border-[#333] rounded-lg overflow-hidden shadow-2xl">
                {/* Quarkonix Header / Status Bar */}
                <div className="h-8 bg-[#2d2d2d] flex items-center justify-between px-3 border-b border-[#1e1e1e]">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-cyan-400 font-bold tracking-widest">QUARKONIX-CLI</span>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                    <div className="flex gap-4 text-[10px] text-zinc-500 font-mono">
                        <span>PORT: 8080</span>
                        <span>CHROME: CONNECTED</span>
                    </div>
                </div>

                {/* The Terminal Surface */}
                <div ref={terminalRef} className="flex-1 p-2" />
            </div>
        </div>
    );
}