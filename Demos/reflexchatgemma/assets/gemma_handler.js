/**
 * gemma_handler.js
 * Simplified bridge for Reflex, aligned with Gemma3-on-Web logic.
 */

console.log("gemma_handler.js - INITIALIZING");

let worker = null;
let isModelReady = false;

// Aggressive state finder
function getReflexChatState() {
    // Priority 1: Direct find on known roots
    const rootState = window.app_state || window.state || (window.reflex && window.reflex.state);
    if (rootState) {
        if (rootState.chat_state) return rootState.chat_state;
        for (const key in rootState) {
            if (key.toLowerCase().includes("chatstate")) return rootState[key];
        }
    }

    // Priority 2: Deep search in window.app_state for valid state interface
    if (window.app_state) {
        for (const key in window.app_state) {
            const potential = window.app_state[key];
            if (potential && typeof potential === 'object' && potential.on_gemma_progress) {
                console.log("BRIDGE: Found state via method signature in app_state." + key);
                return potential;
            }
        }
    }

    // Priority 3: Deep search window object itself
    for (const key in window) {
        if (key.toLowerCase().includes("chatstate") && window[key] && window[key].on_gemma_progress) {
            return window[key];
        }
    }

    return null;
}

function triggerReflexEvent(methodName, payload) {
    const state = getReflexChatState();
    if (state && typeof state[methodName] === "function") {
        try {
            state[methodName](payload);
        } catch (e) {
            console.error(`BRIDGE ERROR: ${methodName}:`, e);
        }
    } else {
        console.warn(`BRIDGE: ${methodName} not found on state.`);
    }
}

// Global hook for Reflex
window.onGemmaUpdate = (res) => triggerReflexEvent("on_gemma_update", res);
window.onGemmaComplete = (res) => triggerReflexEvent("on_gemma_complete", res);
window.onGemmaProgress = (res) => triggerReflexEvent("on_gemma_progress", res);
window.onGemmaLoaded = () => triggerReflexEvent("on_gemma_loaded", true);

function initWorker() {
    if (worker) return;
    worker = new Worker(new URL("./transformers_worker.js", import.meta.url), {
        type: "module"
    });

    worker.addEventListener("message", (e) => {
        const { status, data, output, progress, file } = e.data;
        // console.log("Worker Message:", e.data);

        switch (status) {
            case "ready_to_load":
                triggerReflexEvent("on_gemma_progress", "WebGPU Verified. Ready to load.");
                break;
            case "loading":
                triggerReflexEvent("on_gemma_progress", data);
                break;
            case "initiate":
                // Standard Transformers.js initiate
                triggerReflexEvent("on_gemma_progress", { status: "initiate", file });
                break;
            case "progress":
                // Standard Transformers.js progress
                triggerReflexEvent("on_gemma_progress", { status: "progress", file, progress });
                break;
            case "done":
                // Standard Transformers.js done
                triggerReflexEvent("on_gemma_progress", { status: "done", file });
                break;
            case "ready":
                isModelReady = true;
                triggerReflexEvent("on_gemma_loaded", true);
                break;
            case "start":
                // Generation started
                break;
            case "update":
                if (window._currentOnUpdate) window._currentOnUpdate(output);
                break;
            case "complete":
                if (window._currentOnComplete) window._currentOnComplete(output);
                break;
            case "error":
                triggerReflexEvent("on_gemma_progress", "Error: " + data);
                break;
        }
    });

    worker.postMessage({ type: "check" });
}

window.__real_loadGemma = () => {
    if (!worker) initWorker();
    worker.postMessage({ type: "load" });
};

window.__real_askGemma = (message, onUpdate, onComplete) => {
    if (!worker) initWorker();
    if (!isModelReady) {
        if (onComplete) onComplete("Gemma is not ready yet.");
        return;
    }
    window._currentOnUpdate = onUpdate;
    window._currentOnComplete = onComplete;

    // Format messages for generate
    const messages = [{ role: "user", content: message }];
    worker.postMessage({ type: "generate", data: messages });
};

// Start worker immediately
initWorker();
