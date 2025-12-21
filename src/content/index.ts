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
        // 1. Get the code text
        const code = codeBlock.querySelector('code')?.innerText || "";

        // 2. Try to find a filename comment (e.g., // index.js or # main.py)
        const firstLine = code.split('\n')[0];
        const fileNameMatch = firstLine.match(/(?:\/\/|#|--)\s*([\w.-]+\.\w+)/);
        const filename = fileNameMatch ? fileNameMatch[1] : 'generated_file.txt';

        // 3. Send to the Side Panel
        chrome.runtime.sendMessage({
            type: 'SYNC_CODE',
            payload: { code, filename }
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