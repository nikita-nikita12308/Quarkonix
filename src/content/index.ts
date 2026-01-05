// src/content/index.ts

const injectButton = (codeBlock: HTMLElement) => {
    // Prevent duplicate buttons
    if (codeBlock.querySelector('.freesor-sync-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'freesor-sync-btn';
    btn.innerHTML = '⚡ Sync to Free-sor';

    // Minimal styling to overlay on the code block
    Object.assign(btn.style, {
        position: 'absolute',
        top: '5px',
        right: '100px', // Offset from the default copy button
        zIndex: '10',
        padding: '4px 8px',
        backgroundColor: '#3b82f6',
        color: 'white',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 'bold'
    });

    btn.onclick = () => {
        const code = codeBlock.querySelector('code')?.innerText || "";

        // 1. Try to find filename from a common LLM attribute (e.g., ChatGPT/Claude)
        let filename = codeBlock.getAttribute('data-filename') ||
            codeBlock.querySelector('.file-name')?.textContent;

        // 2. Fallback to your Regex if no attribute exists
        if (!filename) {
            const firstLine = code.split('\n')[0];
            const fileNameMatch = firstLine.match(/(?:\/\/|#|--|---\s+FILE:)\s*([\w./-]+\.\w+)/);
            filename = fileNameMatch ? fileNameMatch[1] : 'generated_file.txt';
        }

        chrome.runtime.sendMessage({
            type: 'SYNC_CODE',
            payload: { code, filename: filename.trim() }
        });

        btn.innerText = '✅ Sent!';
        setTimeout(() => { btn.innerText = '⚡ Sync to Free-sor'; }, 2000);
    };

    // Ensure the code block container is relative for our absolute button
    if (getComputedStyle(codeBlock).position === 'static') {
        codeBlock.style.position = 'relative';
    }

    codeBlock.appendChild(btn);
};

// Observe the chat for new code blocks
const observer = new MutationObserver(() => {
    const blocks = document.querySelectorAll('pre');
    blocks.forEach((block) => injectButton(block as HTMLElement));
});

observer.observe(document.body, { childList: true, subtree: true });