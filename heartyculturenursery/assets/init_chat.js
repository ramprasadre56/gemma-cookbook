/**
 * init_chat.js
 * Consolidated initialization for the Heartyculture AI Chat.
 * This script runs BEFORE the ES modules load, providing early-bind bridges.
 */

console.log("init_chat.js executing...");

// 1. Initialize app_state if not present
if (!window.app_state) {
    window.app_state = {};
    console.log("Created window.app_state");
}

// 2. Early-bind bridge for loadGemma
if (window.loadGemma && typeof window.loadGemma !== 'function') {
    console.warn("Overwriting existing window.loadGemma (likely DOM ID collision):", window.loadGemma);
}

window.loadGemma = function (...args) {
    console.log("loadGemma (bridge) called", args);

    return new Promise((resolve, reject) => {
        function tryLoad() {
            if (window.__real_loadGemma) {
                console.log("Routing to __real_loadGemma");
                Promise.resolve(window.__real_loadGemma(...args)).then(resolve).catch(reject);
            } else {
                console.log("WebLLM module still loading... will retry in 500ms");
                if (window.onGemmaProgress) window.onGemmaProgress("Loading AI engine...");
                setTimeout(tryLoad, 500);
            }
        }
        tryLoad();
    });
};

// 3. Early-bind bridge for askGemma
window.askGemma = function (message, onUpdate, onComplete) {
    console.log("askGemma (bridge) called with:", message);

    return new Promise((resolve, reject) => {
        function tryAsk() {
            if (window.__real_askGemma) {
                console.log("Routing to __real_askGemma");
                try {
                    resolve(window.__real_askGemma(message, onUpdate, onComplete));
                } catch (e) {
                    reject(e);
                }
            } else {
                console.log("Gemma engine is still loading... queuing request.");
                if (window.onGemmaProgress) window.onGemmaProgress("Wait! Gemma is waking up...");
                setTimeout(tryAsk, 1000);
            }
        }
        tryAsk();
    });
};

console.log("init_chat.js complete. Early bridges ready.");
