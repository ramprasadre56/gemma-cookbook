/**
 * init_chat.js
 * Consolidated initialization for the Heartyculture AI Chat.
 * This script runs BEFORE the ES modules load, providing early-bind bridges.
 */

(function () {
    console.log("!!! init_chat.js - STARTING !!!");
    console.log("init_chat.js - Establishing bridges...");

    window.app_state = window.app_state || {};

    // Use a very unique name to avoid ID collisions
    window.__heartyGemmaLoad = function (...args) {
        console.log('__heartyGemmaLoad (bridge) called', args);
        return new Promise((resolve, reject) => {
            const tryLoad = () => {
                if (window.__real_loadGemma) {
                    console.log('Routing to __real_loadGemma');
                    Promise.resolve(window.__real_loadGemma(...args)).then(resolve).catch(reject);
                } else {
                    console.log('Gemma handler module still loading... will retry in 500ms');
                    if (window.onGemmaProgress) window.onGemmaProgress('Loading AI engine...');
                    setTimeout(tryLoad, 500);
                }
            };
            tryLoad();
        });
    };

    // Robust aliases
    window.startGemmaModel = window.__heartyGemmaLoad;
    window.loadGemma = window.__heartyGemmaLoad;

    window.askGemma = function (message, onUpdate, onComplete) {
        console.log('askGemma (bridge) called:', message);
        return new Promise((resolve, reject) => {
            const tryAsk = () => {
                if (window.__real_askGemma) {
                    console.log('Routing to __real_askGemma');
                    try {
                        resolve(window.__real_askGemma(message, onUpdate, onComplete));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    console.log('Gemma handler is still loading... queuing request.');
                    if (window.onGemmaProgress) window.onGemmaProgress('Wait! Gemma is waking up...');
                    setTimeout(tryAsk, 1000);
                }
            };
            tryAsk();
        });
    };

    console.log("init_chat.js - Bridges established.");
})();
