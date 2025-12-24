
window.onGemmaUpdate = (res) => {
    console.log("onGemmaUpdate received:", res);
    if (window.app_state && window.app_state.chat_state) {
        window.app_state.chat_state.on_gemma_update(res);
    } else {
        console.warn("window.app_state or chat_state missing in update", window.app_state);
    }
};
window.onGemmaComplete = (res) => {
    console.log("onGemmaComplete received:", res);
    if (window.app_state && window.app_state.chat_state) {
        window.app_state.chat_state.on_gemma_complete(res);
    } else {
        console.warn("window.app_state or chat_state missing in complete", window.app_state);
    }
};
window.onGemmaProgress = (res) => {
    console.log("onGemmaProgress:", res);
    if (window.app_state && window.app_state.chat_state) {
        window.app_state.chat_state.on_gemma_progress(res);
    }
};
window.onGemmaLoaded = () => {
    console.log("onGemmaLoaded - model is ready!");
    if (window.app_state && window.app_state.chat_state) {
        window.app_state.chat_state.on_gemma_loaded();
    } else {
        console.warn("window.app_state or chat_state missing in loaded", window.app_state);
    }
};
