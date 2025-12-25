/**
 * transformers_worker.js
 * Web Worker for Gemma model inference using Hugging Face Transformers.js
 * Based on Gemma3-on-Web sample
 */
import {
    AutoTokenizer,
    AutoModelForCausalLM,
    TextStreamer,
    InterruptableStoppingCriteria,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.6.3";

const MODEL_ID = "onnx-community/gemma-3-270m-it-ONNX";

class TextGenerationPipeline {
    static tokenizer = null;
    static model = null;

    static async getInstance(progress_callback = null) {
        if (!this.tokenizer) {
            this.tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, {
                progress_callback,
            });
        }

        if (!this.model) {
            this.model = AutoModelForCausalLM.from_pretrained(MODEL_ID, {
                dtype: "q4",
                device: "webgpu",
                progress_callback,
            });
        }

        return Promise.all([this.tokenizer, this.model]);
    }
}

const stopping_criteria = new InterruptableStoppingCriteria();
let past_key_values_cache = null;

async function generate(messages) {
    const [tokenizer, model] = await TextGenerationPipeline.getInstance();

    const inputs = tokenizer.apply_chat_template(messages, {
        add_generation_prompt: true,
        return_dict: true,
    });

    let startTime;
    let numTokens = 0;

    const token_callback_function = () => {
        startTime ??= performance.now();
        numTokens++;
    };

    const callback_function = (output) => {
        const tps = numTokens > 0 ? (numTokens / (performance.now() - startTime)) * 1000 : 0;
        self.postMessage({
            status: "update",
            output,
            tps,
            numTokens,
        });
    };

    const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function,
        token_callback_function,
    });

    self.postMessage({ status: "start" });

    const { past_key_values, sequences } = await model.generate({
        ...inputs,
        past_key_values: past_key_values_cache,
        do_sample: false,
        temperature: 0.3,
        max_new_tokens: 256,
        streamer,
        stopping_criteria,
        return_dict_in_generate: true,
    });

    past_key_values_cache = past_key_values;

    const decoded = tokenizer.batch_decode(sequences, {
        skip_special_tokens: true,
    });

    self.postMessage({
        status: "complete",
        output: decoded[0] || "",
    });
}

async function check() {
    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("WebGPU is not supported (no adapter found)");
        }
        self.postMessage({ status: "ready_to_load" });
    } catch (e) {
        self.postMessage({
            status: "error",
            data: e.toString(),
        });
    }
}

async function load() {
    self.postMessage({
        status: "loading",
        data: "Loading Gemma 270M model...",
    });

    const [tokenizer, model] = await TextGenerationPipeline.getInstance((x) => {
        self.postMessage(x);
    });

    self.postMessage({
        status: "loading",
        data: "GPU Shaders (90%)...",
    });

    // Warm up the model
    const inputs = tokenizer("a");
    self.postMessage({
        status: "loading",
        data: "Warming up (95%)...",
    });
    await model.generate({ ...inputs, max_new_tokens: 1 });

    console.log("Worker: Initialization complete. Sending ready.");
    self.postMessage({ status: "ready" });
}

// Listen for messages from the main thread
self.addEventListener("message", async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case "check":
            check();
            break;
        case "load":
            load();
            break;
        case "generate":
            stopping_criteria.reset();
            generate(data);
            break;
        case "interrupt":
            stopping_criteria.interrupt();
            break;
        case "reset":
            past_key_values_cache = null;
            stopping_criteria.reset();
            break;
    }
});
