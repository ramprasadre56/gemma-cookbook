/**
 * webllm_handler.js
 * Handles WebLLM Gemma engine for the Heartyculture Nursery Chatbot.
 * Pre-loads the model automatically on page load.
 */
import { CreateMLCEngine } from 'https://esm.run/@mlc-ai/web-llm@0.2.79';

console.log("webllm_handler.js (module) loaded - will pre-load model");

let engine = null;
let modelLoadPromise = null;
let plantCatalog = [];
const MODEL_ID = "gemma-2-2b-it-q4f16_1-MLC";

async function loadCatalog() {
    if (plantCatalog.length > 0) return;
    try {
        const response = await fetch("/heartyculture_plants.json");
        if (!response.ok) throw new Error("Catalog fetch failed");
        plantCatalog = await response.json();
        console.log("Plant catalog loaded:", plantCatalog.length, "items");
    } catch (e) {
        console.error("Failed to load plant catalog:", e);
    }
}

function getContext(query) {
    const keywords = query.toLowerCase().split(/\s+/);
    const matches = plantCatalog.filter(p => {
        const text = `${p.common_name} ${p.scientific_name} ${p.category}`.toLowerCase();
        return keywords.some(k => k.length > 3 && text.includes(k));
    }).slice(0, 5);

    if (matches.length === 0) return "";

    let context = "Available plants in Heartyculture Nursery inventory:\n";
    matches.forEach(p => {
        context += `- ${p.common_name} (${p.scientific_name}). Category: ${p.category}. ID: ${p.id}\n`;
    });
    return context;
}

// Pre-load the model immediately when this module loads
async function preloadModel() {
    console.log("Starting automatic model pre-load...");

    if (window.onGemmaProgress) {
        window.onGemmaProgress("Initializing Gemma AI...");
    }

    try {
        engine = await CreateMLCEngine(MODEL_ID, {
            initProgressCallback: (p) => {
                console.log("Gemma Loading:", p.text);
                if (window.onGemmaProgress) window.onGemmaProgress(p.text);
            }
        });

        console.log("Gemma Engine pre-loaded successfully!");

        // Notify Reflex that model is ready
        if (window.onGemmaLoaded) window.onGemmaLoaded();

        return engine;
    } catch (e) {
        console.error("Failed to pre-load Gemma model:", e);
        if (window.onGemmaProgress) window.onGemmaProgress("Error: " + e.message);
        throw e;
    }
}

// Start pre-loading immediately and store the promise
modelLoadPromise = preloadModel();

// Also expose loadGemma for manual triggering if needed
window.__real_loadGemma = async () => {
    console.log("__real_loadGemma called");
    if (engine) {
        console.log("Engine already loaded");
        if (window.onGemmaLoaded) window.onGemmaLoaded();
        return engine;
    }
    // Wait for the pre-load to complete
    return modelLoadPromise;
};

// Chat with Gemma - called when user sends a message
window.__real_askGemma = async (message, onUpdate, onComplete) => {
    console.log("__real_askGemma executed:", message);
    try {
        await loadCatalog();

        // Wait for model to be ready if not already
        if (!engine) {
            console.log("Waiting for model pre-load to complete...");
            await modelLoadPromise;
        }

        const context = getContext(message);
        const systemPrompt = "You are Gemma, the Heartyculture Nursery Plant Whisperer. You are an expert botanist and gardener." +
            " Use the following inventory context to help users find plants. If a plant isn't in context, use your general knowledge but mention it's not in our current online catalog." +
            "\nContext:\n" + context;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
        ];

        let fullResponse = "";
        const chunks = await engine.chat.completions.create({
            messages,
            stream: true,
        });

        for await (const chunk of chunks) {
            const cur = chunk.choices[0]?.delta?.content || "";
            fullResponse += cur;
            if (onUpdate) onUpdate(fullResponse);
        }

        if (onComplete) onComplete(fullResponse);
        return fullResponse;
    } catch (e) {
        console.error("Gemma Chat Error:", e);
        if (onComplete) onComplete("Sorry, I encountered an error: " + e.message);
    }
};

console.log("webllm_handler.js initialized with auto-preload");
