// src/background/index.ts

// Allows the side panel to open when the extension icon is clicked
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

console.log("Free-sor Background Service Worker Initialized");