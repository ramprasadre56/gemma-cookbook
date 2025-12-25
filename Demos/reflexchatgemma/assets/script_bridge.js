/**
 * script_bridge.js
 * Bridges JavaScript events back to the Reflex Python State.
 */

(function () {
    console.log("script_bridge.js (v100) - Connecting to Reflex...");

    // Helper to find the chat state on the window
    function getChatState() {
        if (window.app_state && window.app_state.chat_state) {
            return window.app_state.chat_state;
        }
        // Fallback: try to find it in any key that looks like chat_state
        if (window.app_state) {
            for (let key in window.app_state) {
                if (key.toLowerCase().includes('chatstate')) return window.app_state[key];
            }
        }
        return null;
    }

    window.onGemmaProgress = (res) => {
        const state = getChatState();
        if (state) {
            state.on_gemma_progress(res);
        } else {
            console.warn("script_bridge: chat_state not found for progress", res);
        }
    };

    window.onGemmaLoaded = () => {
        console.log("script_bridge: Model loaded triggered!");
        const state = getChatState();
        if (state) {
            state.on_gemma_loaded();
        } else {
            console.warn("script_bridge: chat_state not found for loaded signal");
        }
    };

    window.onGemmaComplete = (res) => {
        console.log("script_bridge: Model interaction complete.");
        const state = getChatState();
        if (state) {
            state.on_gemma_complete(res);
        }
    };

    console.log("script_bridge (v100) - Ready.");
})();
