import {useState} from "react";
import {generateSkeleton} from "../utils/fileUtils.ts";
import { detectLanguage } from "../utils/languageUtils.ts";
import { generatePythonContext, formatPythonContextForAI } from "../utils/pythonUtils.ts";

export const useAIContext = (activeTab: any, projectMap: string, addLog: (msg: string) => void) => {
    const [isPrompting, setIsPrompting] = useState(false);
    const [aiQuestion, setAiQuestion] = useState("");
    const [capturedSelection, setCapturedSelection] = useState("");
    const [showAskButton, setShowAskButton] = useState(false);
    const [buttonPos, setButtonPos] = useState({ x: 0, y: 0 });

    const handleAskAI = (selection: string) => {
        setCapturedSelection(selection);
        setIsPrompting(true);
        addLog(`AI: Selected ${selection.split('\n').length} line(s)`);
    };

    // Generate language-specific context
    const generateFileContext = (filename: string, code: string): string => {
        const language = detectLanguage(filename);
        
        if (language === 'python') {
            const pythonContext = generatePythonContext(code);
            return `\n# Python Context for ${filename}\n${formatPythonContextForAI(pythonContext)}\n\n# Code\n\`\`\`python\n${code}\n\`\`\``;
        }
        
        return `\n# ${filename}\n\`\`\`\n${code}\n\`\`\``;
    };

    // 2. Logic moved into hook - now 'projectMap' and 'activeTab' are "read"
    const submitToAI = () => {
        if (!activeTab) return;

        const language = detectLanguage(activeTab.filename);
        const fileContext = generateFileContext(activeTab.filename, activeTab.code);

        const textToCopy = `
# Question
${aiQuestion}

# Selected Code (${activeTab.id})
\`\`\`
${capturedSelection}
\`\`\`

# Full File Context
${fileContext}

# Project Skeleton
\`\`\`
${projectMap}
\`\`\`
`.trim();

        navigator.clipboard.writeText(textToCopy);
        addLog(`AI CONTEXT COPIED: "${aiQuestion.slice(0, 30)}..." (${language.toUpperCase()})`);

        setIsPrompting(false);
        setAiQuestion("");
        setCapturedSelection("");
    };

    const scanProject = async (handle: FileSystemDirectoryHandle, path = ""): Promise<string> => {
        let fullContext = "";
        for await (const entry of handle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file') {
                const language = detectLanguage(entry.name);
                // Include JavaScript/TypeScript and Python files
                if (/\.(js|ts|jsx|tsx|py)$/.test(entry.name)) {
                    const file = await entry.getFile();
                    const text = await file.text();
                    const fileContext = generateFileContext(entryPath, text);
                    fullContext += fileContext + "\n";
                }
            } else if (entry.kind === 'directory' && !['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.pytest_cache', '.venv', 'venv'].includes(entry.name)) {
                fullContext += await scanProject(entry as FileSystemDirectoryHandle, entryPath);
            }
        }
        return fullContext;
    };

    return {
        isPrompting, setIsPrompting,
        aiQuestion, setAiQuestion,
        capturedSelection, setCapturedSelection,
        showAskButton, setShowAskButton,
        buttonPos, setButtonPos,
        scanProject, handleAskAI, submitToAI
    };
};