import React, { useState, useCallback, useMemo } from 'react';
import type {EditorTab } from '../types';

export const useTabs = (
    dirHandle: FileSystemDirectoryHandle | null,
    addLog: (msg: string) => void,
    getNestedFileHandle: (root: FileSystemDirectoryHandle, path: string) => Promise<FileSystemFileHandle>
) => {
    const [tabs, setTabs] = useState<EditorTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    // Derived state for the current active tab object
    const activeTab = useMemo(() =>
            tabs.find(t => t.id === activeTabId) || null,
        [tabs, activeTabId]);

    const openTab = useCallback((path: string, code: string, isNew = false) => {
        setTabs(prev => {
            const existingTab = prev.find(t => t.id === path);
            if (existingTab) {
                return prev.map(t => t.id === path ? { ...t, code, isDirty: t.originalCode !== code } : t);
            }
            const filename = path.split('/').pop() || path;
            return [...prev, {
                id: path,
                filename,
                code,
                originalCode: isNew ? '' : code,
                isDirty: isNew,
                isNew
            }];
        });
        setActiveTabId(path);
    }, []);

    const closeTab = useCallback((id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        setTabs(prev => {
            const newTabs = prev.filter(t => t.id !== id);
            if (activeTabId === id) {
                // Pick the next available tab or null
                setActiveTabId(newTabs[newTabs.length - 1]?.id || null);
            }
            return newTabs;
        });
    }, [activeTabId]);

    const onCodeChange = useCallback((value: string) => {
        if (activeTabId) {
            setTabs(prev => prev.map(t =>
                t.id === activeTabId
                    ? { ...t, code: value, isDirty: t.originalCode !== value }
                    : t
            ));
        }
    }, [activeTabId]);

    const saveFile = async () => {
        if (!activeTab || !dirHandle) return;

        try {
            const fileHandle = await getNestedFileHandle(dirHandle, activeTab.id);
            const writable = await fileHandle.createWritable();
            await writable.write(activeTab.code);
            await writable.close();

            setTabs(prev => prev.map(t =>
                t.id === activeTab.id
                    ? { ...t, originalCode: t.code, isDirty: false, isNew: false }
                    : t
            ));
            addLog(`SAVED: ${activeTab.filename}`);
        } catch (e) {
            addLog(`ERROR: Could not save ${activeTab.filename}`);
        }
    };

    return {
        tabs,
        activeTabId,
        activeTab,
        setActiveTabId,
        openTab,
        closeTab,
        onCodeChange,
        saveFile,
        setTabs
    };
};