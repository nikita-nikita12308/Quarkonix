import {useEffect, useRef, useState} from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export default function TerminalView({ onCaptureError }: { onCaptureError: (error: string) => void }) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xterm = useRef<Terminal | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState('OFFLINE');
    // TerminalView.tsx

    useEffect(() => {
        if (!terminalRef.current) return;

        // 1. Initialize with convertEol: true
        xterm.current = new Terminal({
            convertEol: true, // Fixes Windows "staircase" text
            cursorBlink: true,
            theme: {
                background: '#000000', // Pitch black to match the frame
                foreground: '#00ffcc', // Cyan text
                cursor: '#00ffcc',
                selectionBackground: 'rgba(0, 255, 204, 0.3)',
            },
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
            // Wait a tiny bit longer for the layout to "settle" before measuring
            setTimeout(() => {
                fitAddon.fit();
                const dims = fitAddon.proposeDimensions();
                if (dims) {
                    ws.current?.send(JSON.stringify({
                        type: 'READY',
                        cols: dims.cols,
                        rows: dims.rows
                    }));
                }
            }, 250); // 250ms is the sweet spot for browser animations
        };

        // TerminalView.tsx

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'TERMINAL_DATA') {
                    setStatus('CONNECTED'); // Update status when data flows
                    xterm.current?.write(data.payload);
                }

                if (data.type === 'AI_CHAT') {
                    // You could trigger a notification or a chat bubble here!
                    console.log("AI Message received:", data.prompt);
                }
            } catch (e) {
                // Fallback: if it's not JSON, just write it raw
                xterm.current?.write(event.data);
            }
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
        <div className="h-full flex flex-col bg-[#050505] p-3 font-mono">
            {/* MATCHING ASCII HEADER */}
            <div className="border-2 border-cyan-600 rounded-t-xl bg-black p-4 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <pre className="text-cyan-600 leading-none text-[10px] sm:text-[12px] font-bold overflow-hidden">
{` █▀█ █   █ ▄▀█ █▀█ █▄▀ █▀█ █▄ █ █ ▀▄▀
 ▀▀█ █▄█ █▀█ █▀▄  █ █ █▄█  █ ▀█ █ █  █`}
            </pre>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-cyan-900/50">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${status === 'CONNECTED' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 animate-pulse'}`}></div>
                            <span className="text-[10px] text-cyan-500/70 tracking-widest uppercase">Bridge Status</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {status}
                    </span>
                    </div>

                    <div className="text-[9px] text-zinc-500 flex gap-4">
                        <span>PORT: 8080</span>
                        <span className="text-cyan-700">v1.0.4</span>
                    </div>
                </div>
            </div>

            {/* TERMINAL BODY */}
            <div className="flex-1 border-x-2 border-b-2 border-cyan-600/40 bg-black relative">
                {/* This button should be the only thing that hides/shows on hover */}
                <div className="absolute top-2 right-4 z-50 opacity-0 hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleCopySelection}
                        className="bg-cyan-900/80 text-cyan-400 text-[10px] px-2 py-1 rounded border border-cyan-700"
                    >
                        Capture Logs
                    </button>
                </div>

                {/* THE ACTUAL TERMINAL - Ensure no 'opacity-0' here! */}
                <div
                    ref={terminalRef}
                    className="absolute inset-0 p-2 z-10" // Added z-10 to keep it on top
                    style={{ height: '100%', width: '100%' }} // Force size
                />
            </div>
        </div>
    );
}