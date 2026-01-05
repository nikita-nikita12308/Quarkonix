// src/utils/editorUtils.ts
import type { DiffLine } from '../types';

export const generateDiff = (original: string, modified: string): DiffLine[] => {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    const diff: DiffLine[] = [];

    let i = 0; // Pointer for original
    let j = 0; // Pointer for modified
    const LOOKAHEAD = 5; // A smaller window is actually more accurate for code

    while (i < originalLines.length || j < modifiedLines.length) {
        const lineO = originalLines[i];
        const lineM = modifiedLines[j];

        // 1. Exact Match: Best case scenario
        if (i < originalLines.length && j < modifiedLines.length && lineO === lineM) {
            diff.push({ type: 'unchanged', content: lineO, lineNumber: j + 1 });
            i++; j++;
            continue;
        }

        // 2. Mismatch: Look ahead to see if we just added or deleted a line
        let foundSync = false;
        for (let k = 1; k <= LOOKAHEAD; k++) {
            // Did we ADD a line? (Current original matches a line further down in modified)
            if (j + k < modifiedLines.length && modifiedLines[j + k] === lineO) {
                for (let n = 0; n < k; n++) {
                    diff.push({ type: 'added', content: modifiedLines[j + n], lineNumber: j + n + 1 });
                }
                j += k;
                foundSync = true;
                break;
            }
            // Did we DELETE a line? (Current modified matches a line further down in original)
            if (i + k < originalLines.length && originalLines[i + k] === lineM) {
                for (let n = 0; n < k; n++) {
                    diff.push({ type: 'removed', content: originalLines[i + n], lineNumber: i + n + 1 });
                }
                i += k;
                foundSync = true;
                break;
            }
        }

        // 3. Fallback: No match found in window, treat as a direct modification
        if (!foundSync) {
            if (i < originalLines.length && j < modifiedLines.length) {
                // To avoid the "shifting" look, check if the content is just empty space
                diff.push({ type: 'removed', content: lineO, lineNumber: i + 1 });
                diff.push({ type: 'added', content: lineM, lineNumber: j + 1 });
                i++; j++;
            } else if (i < originalLines.length) {
                diff.push({ type: 'removed', content: lineO, lineNumber: i + 1 });
                i++;
            } else if (j < modifiedLines.length) {
                diff.push({ type: 'added', content: lineM, lineNumber: j + 1 });
                j++;
            }
        }
    }
    return diff;
};