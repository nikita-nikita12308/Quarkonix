import { useState, useEffect, useCallback } from 'react';
// Rename the import to avoid conflict with your local Editor component
import { EditorView as CodeMirrorView } from '@codemirror/view';
import TerminalView from "./terminal/TerminalView.tsx";
import Settings, { type UserSettings } from './settings/Settings.tsx';
import AIPromptModal from "./components/common/Modals/AIPromtModal.tsx";
import NewFileModal from "./components/common/Modals/NewFileModal.tsx";
import Sidebar from "./components/common/Sidebar.tsx";
import Explorer from "./components/Explorer/Explorer.tsx";
import TabHeader from "./components/common/TabHeader.tsx";
import DiffView from "./components/Diff/DiffView.tsx";
import ContextView from "./components/common/ContextView.tsx";
import Footer from "./components/common/Footer.tsx";
import EmptyState from "./components/common/EmptyState.tsx";
import LogsView from "./components/common/LogsView.tsx";
import EditorComponent from "./components/Editor/EditorView.tsx";
import { ErrorBoundary } from "./components/common/ErrorBoundary.tsx";

import { generateDiff } from "./utils/editorUtils.ts";
import { useTabs } from "./hooks/useTabs.ts";
import { useFileSystem } from "./hooks/useFileSystem.ts";
import { useAIContext } from "./hooks/useAiContext.ts";
import type { PendingFile, ViewState } from "./types";

export default function App() {
    // --- 1. State Definitions ---
    const [activeView, setActiveView] = useState<ViewState>('EDITOR');
    const [logs, setLogs] = useState<string[]>(["[SYSTEM] V2.2 Ready. AI Selection Mode Active."]);
    const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [settings, setSettings] = useState<UserSettings>({
        executionMode: 'CLI',
        autoSync: false,
        aiModel: 'GPT-4o (Full)'
    });

    const addLog = useCallback((msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
    }, []);

    // --- 2. Hooks ---
    const {
        dirHandle,
        fileTree,
        setFileTree,
        projectMap,
        setProjectMap,
        expandedFolders,
        setExpandedFolders,
        // This is the main one we use
        scanProject,
        // Add selectFolder here so the Footer can use it!
        selectFolder,
        toggleFolder,
        findFileInProject,
        getNestedFileHandle,
        refreshTree
    } = useFileSystem(addLog);

    const {
        tabs,
        setTabs,
        activeTabId,
        setActiveTabId,
        activeTab,
        saveFile,
        openTab,
        closeTab,
        onCodeChange
    } = useTabs(dirHandle, addLog, getNestedFileHandle);

    const {
        isPrompting,
        setIsPrompting,
        aiQuestion,
        setAiQuestion,
        capturedSelection,
        setCapturedSelection,
        showAskButton,
        setShowAskButton,
        buttonPos,
        setButtonPos,
        // REMOVE scanProject from here to avoid the "Duplicate identifier" error
        handleAskAI,
        submitToAI
    } = useAIContext(activeTab, projectMap, addLog);

    // --- 4. Effects & Logic ---
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['userSettings'], (result) => {
                if (result.userSettings) setSettings(result.userSettings);
            });
        }
    }, []);


    const handleSyncCode = useCallback(async (filename: string, code: string) => {
        if (!dirHandle) {
            addLog("ERROR: Connect a workspace to sync code blocks.");
            return;
        }

        // 1. Try to find the file in the project
        const existingPath = await findFileInProject(dirHandle, filename);

        if (existingPath) {
            try {
                const fileHandle = await getNestedFileHandle(dirHandle, existingPath);
                const file = await fileHandle.getFile();
                const existingCode = await file.text();

                // If code is identical, don't do anything
                if (existingCode === code) {
                    addLog(`INFO: ${filename} is already up to date.`);
                    return;
                }

                // Update state to trigger Diff View
                setTabs(prev => {
                    const exists = prev.find(t => t.id === existingPath);
                    if (exists) {
                        return prev.map(t => t.id === existingPath ? { ...t, code, isDirty: true } : t);
                    }
                    return [...prev, {
                        id: existingPath,
                        filename,
                        code,
                        originalCode: existingCode,
                        isDirty: true,
                        isNew: false
                    }];
                });

                setActiveTabId(existingPath);
                setActiveView('DIFF');
                addLog(`SYNC: Found ${filename}. Review changes in DIFF.`);
            } catch (e) {
                addLog(`ERROR: Failed to read ${filename}.`);
            }
        } else {
            // File doesn't exist, show the "Create New File" modal
            setPendingFile({ filename, code });
            setShowModal(true);
            addLog(`SYNC: ${filename} not found. Opening creation modal.`);
        }
    }, [dirHandle, findFileInProject, getNestedFileHandle, addLog, setTabs, setActiveTabId]);

    useEffect(() => {
        const listener = (message: any) => {
            if (message.type === 'SYNC_CODE' && message.payload) {
                const { filename, code } = message.payload;
                handleSyncCode(filename, code);
            }
        };

        if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
            chrome.runtime.onMessage.addListener(listener);
            return () => chrome.runtime.onMessage.removeListener(listener);
        }
    }, [handleSyncCode]); // handleSyncCode is now a stable dependency

    const updateSettings = (newSet: Partial<UserSettings>) => {
        const updated = { ...settings, ...newSet };
        setSettings(updated);
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ userSettings: updated }, () => {
                addLog(`PERSISTED: Settings saved.`);
            });
        }
    };

    const captureTerminalError = (text: string) => {
        setCapturedSelection(text);
        setIsPrompting(true);
        setAiQuestion("I encountered this error in my terminal. Can you help me fix it?");
        addLog("Terminal output captured for AI.");
    };

    const handleDiscard = () => {
        if (!activeTab) return;

        if (activeTab.isNew) {
            closeTab(activeTab.id);
        } else {
            setTabs(prev => prev.map(t =>
                t.id === activeTab.id
                    ? { ...t, code: t.originalCode, isDirty: false }
                    : t
            ));
        }
        setActiveView('EDITOR');
    };

    const selectionListener = CodeMirrorView.updateListener.of((update) => {
        if (!update.selectionSet) return;
        const sel = update.state.selection.main;
        if (sel.empty) {
            setShowAskButton(false);
            return;
        }

        const selectedText = update.state.sliceDoc(sel.from, sel.to).trim();
        if (!selectedText) {
            setShowAskButton(false);
            return;
        }

        const domSel = window.getSelection();
        if (!domSel || domSel.rangeCount === 0) return;

        const rect = domSel.getRangeAt(0).getBoundingClientRect();
        setCapturedSelection(selectedText);
        setButtonPos({ x: rect.left + 80, y: rect.top - 28 });
        setShowAskButton(true);
    });

    const updateContextMap = async (handle: FileSystemDirectoryHandle) => {
        addLog("Scanning project skeleton...");
        const context = await scanProject(handle);
        setProjectMap(context);
        addLog("Context Map updated.");
    };

    const createNewFile = (path: string) => {
        if (!pendingFile) return;
        openTab(path, pendingFile.code, true);
        setShowModal(false);
        setPendingFile(null);
    };

    const diffLines = activeTab ? generateDiff(activeTab.originalCode, activeTab.code) : [];

    return (
        <div className="flex h-screen w-screen bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden">
            <AIPromptModal
                isOpen={isPrompting}
                capturedSelection={capturedSelection}
                aiQuestion={aiQuestion}
                setAiQuestion={setAiQuestion}
                onClose={() => setIsPrompting(false)}
                onSubmit={submitToAI}
            />

            {showModal && pendingFile && (
                <NewFileModal
                    pendingFile={pendingFile}
                    fileTree={fileTree}
                    onClose={() => {
                        setShowModal(false);
                        setPendingFile(null);
                    }}
                    onCreate={(path) => {
                        createNewFile(path);
                        setShowModal(false);
                    }}
                    onCustomPath={() => {
                        const path = prompt(
                            `Enter target path for ${pendingFile.filename}:`,
                            pendingFile.filename
                        );
                        if (path) {
                            createNewFile(path);
                            setShowModal(false);
                        }
                    }}
                />
            )}

            <Sidebar activeView={activeView} setActiveView={setActiveView} hasDirtyTabs={tabs.some(t => t.isDirty)} />

            {(activeView === 'EDITOR' || activeView === 'DIFF') && (
                <Explorer
                    fileTree={fileTree}
                    expandedFolders={expandedFolders}
                    toggleFolder={(path) => {
                        const next = new Set(expandedFolders);
                        next.has(path) ? next.delete(path) : next.add(path);
                        setExpandedFolders(next);
                    }}
                    onFileClick={async (path, handle) => {
                        const file = await handle.getFile();
                        openTab(path, await file.text());
                    }}
                    activeTabId={activeTabId}
                    onRefresh={refreshTree}
                    workspaceName={dirHandle?.name}
                />
            )}

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <TabHeader tabs={tabs} activeTabId={activeTabId} setActiveTabId={setActiveTabId} closeTab={closeTab} />

                <main className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-[#1e1e1e]">
                    {activeView === 'SETTINGS' && <Settings settings={settings} updateSettings={updateSettings} />}

                    {activeView === 'EDITOR' && activeTab && (
                        <EditorComponent
                            activeTab={activeTab}
                            onCodeChange={onCodeChange}
                            onSave={saveFile}
                            onSwitchToDiff={() => setActiveView('DIFF')}
                            showAskButton={showAskButton}
                            buttonPos={buttonPos}
                            onAskAI={handleAskAI}
                            capturedSelection={capturedSelection}
                            selectionListener={selectionListener}
                        />
                    )}

                    {activeView === 'DIFF' && activeTab && (
                        <DiffView
                            activeTab={activeTab}
                            diffLines={diffLines}
                            onDiscard={handleDiscard}
                            onSave={saveFile}
                            addLog={addLog}
                        />
                    )}

                    {activeView === 'CONTEXT' && (
                        <ContextView projectMap={projectMap} onCopy={() => navigator.clipboard.writeText(projectMap)} />
                    )}

                    {activeView === 'TERMINAL' && <TerminalView onCaptureError={captureTerminalError} />}
                    {activeView === 'LOGS' && <LogsView logs={logs} />}

                    {!activeTab && (activeView === 'EDITOR' || activeView === 'DIFF') && <EmptyState connected={!!dirHandle} />}
                </main>

                <Footer workspaceName={dirHandle?.name} onConnect={selectFolder} version="V2.2.0" />
            </div>
        </div>
    );
}