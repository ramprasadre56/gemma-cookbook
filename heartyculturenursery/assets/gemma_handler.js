/**
 * gemma_handler.js (v120)
 * Consolidated, industrial-strength handler for Gemma model.
 * Bridges worker events directly to Reflex with an aggressive state-finding strategy.
 */

console.log("gemma_handler.js (v120) - STARTING INITIALIZATION");

let worker = null;
let isModelReady = false;
let plantCatalog = [];

// AGGRESSIVE STATE FINDER
// This function will find the Reflex ChatState even if the path changes
function getReflexChatState() {
    // Priority 1: Check window.app_state (manually set during load_gemma)
    if (window.app_state && window.app_state.chat_state) {
        if (typeof window.app_state.chat_state === 'object') return window.app_state.chat_state;
    }

    // Priority 2: Check window.state (Standard Reflex global state)
    if (window.state && window.state.chat_state) return window.state.chat_state;

    // Priority 3: Search for any key containing "chatstate" in window.app_state or window.state
    const rootState = window.app_state || window.state;
    if (rootState) {
        for (const key in rootState) {
            if (key.toLowerCase().includes("chatstate")) {
                console.log("DEBUG: Found chat state at window key: " + key);
                return rootState[key];
            }
        }
    }

    // Priority 4: Search window object itself for something including "chatstate"
    for (const key in window) {
        if (key.toLowerCase().includes("chatstate") && typeof window[key] === 'object' && window[key].on_gemma_progress) {
            console.log("DEBUG: Found potential chat state on window: " + key);
            return window[key];
        }
    }

    return null;
}

// BRIDGE TO PYTHON
function triggerReflexEvent(methodName, payload) {
    const state = getReflexChatState();
    if (state && typeof state[methodName] === "function") {
        try {
            state[methodName](payload);
            console.log(`BRIDGE: Sent '${methodName}' to Python:`, payload);
        } catch (e) {
            console.error(`BRIDGE ERROR: Failed to call state.${methodName}:`, e);
        }
    } else {
        if (methodName === "on_gemma_progress") {
            // Throttled logging for progress
            if (Math.random() < 0.1) console.warn(`BRIDGE: Still waiting for chat_state to call ${methodName} for ${payload}`);
        } else {
            console.warn(`BRIDGE: Could not find ${methodName} on state.`, { stateFound: !!state });
            // TRY DIRECT WINDOW FALLBACK
            if (window[methodName]) window[methodName](payload);
        }
    }
}

// Ensure these functions are globally available for Reflex handle_submit to call
window.onGemmaUpdate = (res) => triggerReflexEvent("on_gemma_update", res);
window.onGemmaComplete = (res) => triggerReflexEvent("on_gemma_complete", res);
window.onGemmaProgress = (res) => triggerReflexEvent("on_gemma_progress", res);
window.onGemmaLoaded = () => triggerReflexEvent("on_gemma_loaded", true);

// Initialize the worker
function initWorker() {
    if (worker) return;

    worker = new Worker(new URL("./transformers_worker.js?v=120", import.meta.url), {
        type: "module"
    });

    worker.addEventListener("message", handleWorkerMessage);
    worker.addEventListener("error", (e) => {
        console.error("WORKER FATAL ERROR:", e);
        triggerReflexEvent("on_gemma_progress", "Error: " + e.message);
    });

    // Check WebGPU support first
    worker.postMessage({ type: "check" });
    console.log("Worker initialized and check message sent.");
}

// Handle messages from the worker
function handleWorkerMessage(e) {
    const { status, data, output, progress, file } = e.data;

    switch (status) {
        case "ready_to_load":
            triggerReflexEvent("on_gemma_progress", "WebGPU Verified. Starting Load...");
            worker.postMessage({ type: "load" });
            break;

        case "loading":
            console.log("Worker Progress:", data);
            triggerReflexEvent("on_gemma_progress", data);
            break;

        case "initiate":
        case "progress":
            if (file && progress !== undefined) {
                const percent = Math.round(progress);
                // Significantly reduce event frequency to avoid choking Reflex
                if (percent % 10 === 0 || percent === 100) {
                    triggerReflexEvent("on_gemma_progress", `Downloading: ${percent}%`);
                }
            }
            break;

        case "ready":
            console.log("WORKER REPORTED READY");
            isModelReady = true;
            // Send multiple redundant signals to ENSURE the state updates
            triggerReflexEvent("on_gemma_progress", "Ready!");
            triggerReflexEvent("on_gemma_loaded", true);
            break;

        case "update":
            if (window._currentOnUpdate) window._currentOnUpdate(output);
            break;

        case "complete":
            if (window._currentOnComplete) window._currentOnComplete(output);
            window._currentOnUpdate = null;
            window._currentOnComplete = null;
            break;

        case "error":
            console.error("WORKER HANDLER ERROR:", data);
            triggerReflexEvent("on_gemma_progress", "Error: " + data);
            break;
    }
}

// Load plant catalog
async function loadCatalog() {
    if (plantCatalog.length > 0) return;
    try {
        const response = await fetch("/heartyculture_plants.json");
        if (response.ok) {
            plantCatalog = await response.json();
            console.log("Catalog loaded:", plantCatalog.length, "items");
        }
    } catch (e) { console.error("Catalog load failed", e); }
}

function getContext(query) {
    const keywords = query.toLowerCase().split(/\s+/);
    const matches = plantCatalog.filter(p => {
        const text = `${p.common_name} ${p.scientific_name} ${p.category}`.toLowerCase();
        return keywords.some(k => k.length > 3 && text.includes(k));
    }).slice(0, 3);
    if (matches.length === 0) return "";
    let context = "Nursery Plants: ";
    matches.forEach(p => { context += `${p.common_name} (${p.category}). `; });
    return context;
}

// Bridge methods attached to window for Reflex to call
window.__real_loadGemma = async () => {
    console.log("__real_loadGemma (v120) triggered");
    if (!worker) initWorker();
};

window.__real_askGemma = async (message, onUpdate, onComplete) => {
    console.log("__real_askGemma called:", message);
    if (!worker) initWorker();
    await loadCatalog();

    if (!isModelReady) {
        if (onComplete) onComplete("Gemma is still preparing... Wait a moment.");
        return;
    }

    window._currentOnUpdate = onUpdate;
    window._currentOnComplete = onComplete;

    const context = getContext(message);
    const systemPrompt = `You are Gemma. expert botanist. concise. \n${context}`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
    ];

    worker.postMessage({ type: "generate", data: messages });
};

// AUTO-BOOT
initWorker();
console.log("gemma_handler.js (v120) - READY AND WAITING");
