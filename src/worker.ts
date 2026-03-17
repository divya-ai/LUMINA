import {
    AutoProcessor,
    AutoModelForCausalLM,
    AutoModelForImageTextToText,
    AutoModelForVision2Seq,
    TextStreamer,
    RawImage,
    env,
} from "@huggingface/transformers";
// @ts-ignore
import * as ort from 'onnxruntime-web/webgpu';

// Extract the InferenceSession from the ORT import
// Depending on the bundler, it might be nested under 'default' or available directly
let ortObject: any = ort;
if ((ort as any).default) {
    ortObject = (ort as any).default;
}

// Ensure InferenceSession is available and assigned to both names for compatibility
const InferenceSession = ortObject.InferenceSession;
if (InferenceSession) {
    ortObject.inferenceSession = InferenceSession;
}

console.log('ORT Object Keys:', Object.keys(ortObject));
console.log('ORT InferenceSession:', InferenceSession);

// Ensure InferenceSession is available
if (!InferenceSession) {
    console.error('InferenceSession not found in ORT object!');
} else {
    console.log('InferenceSession found, has create:', typeof InferenceSession.create);
}

// @ts-ignore
globalThis.ort = ortObject;
// @ts-ignore
globalThis[Symbol.for('onnxruntime')] = ortObject;

// Force environment backend initialization
// @ts-ignore
if (!(env as any).backends) (env as any).backends = {};
// @ts-ignore
if (!(env as any).backends.onnx) (env as any).backends.onnx = {};

// Transformers.js (v3/v4) expects env.backends.onnx to BE the ORT object or have InferenceSession
// @ts-ignore
Object.assign(env.backends.onnx, ortObject);

// Configure environment
env.allowLocalModels = false;
env.useBrowserCache = true;
env.useWasmCache = true;
env.allowRemoteModels = true;

// Set cache name for Transformers.js v4-next
// @ts-ignore
env.cacheDir = 'transformers-cache';
// @ts-ignore
env.cacheName = 'transformers-cache';

// Configure WASM paths for ONNX Runtime
// Point to locally served WASM files copied from node_modules to public/ort-wasm/
// This avoids CDN version mismatch issues with dev versions of onnxruntime-web.
const ORT_WASM_PATH = '/ort-wasm/';
// @ts-ignore
env.backends.onnx.wasmPaths = ORT_WASM_PATH;

// Set global environment variables for ONNX
// @ts-ignore
if (ortObject?.env) {
    // @ts-ignore
    ortObject.env.wasm.wasmPaths = ORT_WASM_PATH;
    // @ts-ignore
    ortObject.env.wasm.numThreads = 1;
    // @ts-ignore
    ortObject.env.wasm.proxy = false;
}

// Log initialization info
// console.log('Direct ONNX Runtime:', ortObject);
// @ts-ignore
if (env.backends.onnx.wasmPaths) {
    // @ts-ignore
    console.log('Configured WASM paths:', env.backends.onnx.wasmPaths);
}

console.log('Transformers.js Env:', JSON.stringify({
    version: env.version,
    backends: {
        onnx: {
            wasmPaths: (env.backends.onnx as any).wasmPaths,
            logLevel: (env.backends.onnx as any).logLevel,
            debug: (env.backends.onnx as any).debug,
        }
    }
}, null, 2));

// Global variables to store model and processor
let model: any = null;
let processor: any = null;
let currentModelId: string | null = null;
let HF_TOKEN: string | null = null;
let isInterrupted = false;

// Helper: detect Qwen 3.5 models by matching both dot and underscore variants
function isQwen35Model(id: string): boolean {
    const lower = id.toLowerCase();
    return lower.includes('qwen3_5') || lower.includes('qwen3.5');
}

async function unloadModel(notifyMainThread: boolean = false) {
    if (model) {
        console.log(`Unloading model from memory: ${currentModelId}`);
        try {
            if (typeof model.dispose === 'function') {
                await model.dispose();
            }
        } catch (e) {
            console.warn("Warning during model disposal:", e);
        }
        model = null;
    }
    if (processor) {
        try {
            if (typeof processor.dispose === 'function') {
                await processor.dispose();
            }
        } catch (e) {
            console.warn("Warning during processor disposal:", e);
        }
        processor = null;
    }

    currentModelId = null;
    // Tell the main thread the memory has been wiped
    if (notifyMainThread) {
        self.postMessage({ status: "offloaded" });
    }
}

async function loadModel(modelId: string) {
    if (currentModelId === modelId && model) {
        self.postMessage({ status: "ready", modelId });
        return;
    }

    // Unload existing model memory buffers if any
    await unloadModel();

    console.log(`Loading model: ${modelId}`);

    const progress_callback = (data: any) => {
        // data.status is one of: 'initiate', 'download', 'progress', 'done'
        // We wrap it to avoid overwriting the outer 'status' field
        self.postMessage({ status: "progress", progressData: data });
    };

    try {
        let loadProcessorOptions: any = {
            progress_callback,
            // @ts-ignore
            token: HF_TOKEN || undefined,
        };

        try {
            console.log(`Loading processor for ${modelId}... (trying local cache first)`);
            processor = await AutoProcessor.from_pretrained(modelId, {
                ...loadProcessorOptions,
                local_files_only: true
            });
        } catch (localProcessorError) {
            console.log(`Local processor not found. Fetching from remote...`);
            try {
                processor = await AutoProcessor.from_pretrained(modelId, loadProcessorOptions);
            } catch (processorError) {
                const errMsg = processorError instanceof Error ? processorError.message : String(processorError);
                console.warn(`Processor loading failed: ${errMsg}. Attempting to continue without processor.`);
            }
        }

        // Determine which model class to use based on model ID or config
        // In Transformers.js, 'qwen3_5' model_type is ONLY registered under
        // MODEL_FOR_IMAGE_TEXT_TO_TEXT_MAPPING_NAMES (as Qwen3_5ForConditionalGeneration).
        // It is NOT registered in MODEL_FOR_CAUSAL_LM_MAPPING_NAMES.
        // So ALL Qwen 3.5 models (including text-only 0.8B) must use AutoModelForImageTextToText.
        const isVisionModel = (modelId.toLowerCase().includes('vision') || modelId.toLowerCase().includes('vl')) &&
            !modelId.toLowerCase().includes('0.8b');

        let ModelClass: any;
        if (isQwen35Model(modelId) || 
            modelId.toLowerCase().includes('qwen2_5_vl') || 
            modelId.toLowerCase().includes('qwen2.5-vl') ||
            modelId.toLowerCase().includes('qwen2-vl') ||
            modelId.toLowerCase().includes('qwen2_vl')) {
            console.log("Qwen 3.5 or Qwen 2 VL model detected. Using AutoModelForImageTextToText (required by Transformers.js registry).");
            ModelClass = AutoModelForImageTextToText;
        } else if (isVisionModel) {
            ModelClass = AutoModelForImageTextToText;
        } else {
            ModelClass = AutoModelForCausalLM;
        }

        // Log configuration for debugging
        console.log(`Loading model with token: ${HF_TOKEN ? HF_TOKEN.substring(0, 10) + '...' : 'None'}`);
        // @ts-ignore
        console.log(`Global env.token: ${env.token ? (env.token as string).substring(0, 10) + '...' : 'None'}`);

        console.log(`Using ${ModelClass.name} class for ${modelId}`);

        let loadModelOptions: any = {
            device: "webgpu",
            dtype: "q4",
            progress_callback,
            // @ts-ignore
            token: HF_TOKEN || undefined,
        };

        try {
            console.log(`Attempting to load ${ModelClass.name} from local cache first...`);
            model = await ModelClass.from_pretrained(modelId, {
                ...loadModelOptions,
                local_files_only: true
            });
        } catch (localModelError) {
            console.log(`Local model not found. Fetching from remote...`);
            try {
                model = await ModelClass.from_pretrained(modelId, loadModelOptions);
            } catch (innerError) {
                const errMsg = innerError instanceof Error ? innerError.message : String(innerError);
                console.warn(`Initial loading with ${ModelClass.name} failed:`, errMsg);

                // Fallback: try alternative model classes
                const fallbackClasses = [
                    AutoModelForImageTextToText,
                    AutoModelForCausalLM,
                    AutoModelForVision2Seq,
                ].filter(cls => cls !== ModelClass);

                let loaded = false;
                for (const FallbackClass of fallbackClasses) {
                    console.log(`Retrying with ${FallbackClass.name} fallback...`);
                    try {
                        model = await FallbackClass.from_pretrained(modelId, {
                            device: "webgpu",
                            dtype: "q4",
                            progress_callback,
                            // @ts-ignore
                            token: HF_TOKEN || undefined,
                        });
                        loaded = true;
                        break;
                    } catch (retryError) {
                        const rMsg = retryError instanceof Error ? retryError.message : String(retryError);
                        console.warn(`Fallback ${FallbackClass.name} also failed:`, rMsg);
                    }
                }
                if (!loaded) {
                    throw innerError;
                }
            }
        }

        currentModelId = modelId;
        self.postMessage({ status: "ready", modelId });
    } catch (error) {
        let userMessage = error instanceof Error ? error.message : String(error);
        if (userMessage.includes('Unsupported model type')) {
            userMessage = `Model architecture not supported: ${userMessage}. Please try a different model or update Transformers.js.`;
        } else if (userMessage.includes('Unauthorized access')) {
            userMessage = "Unauthorized access to Hugging Face model. Please check your HF token in .env.local.";
        }
        self.postMessage({ status: "error", message: userMessage });
        console.error("Model loading failed:", error);
    }
}

async function generate(data: any) {
    if (!model || !processor) {
        self.postMessage({ status: "error", message: "Model not loaded" });
        return;
    }

    const { messages, image_url, generation_config } = data;

    try {
        // 1. Format chat messages into the model's expected text format
        const text = processor.apply_chat_template(messages, {
            add_generation_prompt: true,
        });
        console.log("Formatted prompt:", typeof text === 'string' ? text.substring(0, 200) : text);

        // 2. Prepare inputs using the processor
        let inputs;
        const tokenizer = processor.tokenizer || processor;
        
        if (image_url) {
            console.log("Loading image for vision model...");
            const image = await RawImage.fromURL(image_url);
            
            // For Transformers.js Vision processors, pass text and image as sequential arguments
            // Some processors expect arrays for batching
            inputs = await processor([text], [image]);
        } else {
            // Text-only: safely get tokenized inputs
            // The generic AutoProcessor might incorrectly pass text to the image_processor
            // causing "undefined is not iterable". We explicitly use the tokenizer here.
            inputs = tokenizer(text);
        }

        // 3. Generate
        let tokenCount = 0;
        const startTime = performance.now();
        isInterrupted = false;

        // Custom streamer to handle text accumulation correctly
        let accumulatedText = "";
        
        const generate_options = {
            ...inputs,
            ...generation_config,
            max_new_tokens: generation_config?.max_new_tokens || 2048,
        };

        const output = await model.generate({
            ...generate_options,
            streamer: new TextStreamer(tokenizer, {
                skip_prompt: true,
                callback_function: (text: string) => {
                    if (isInterrupted) return false;
                    accumulatedText += text;
                    tokenCount++;
                    const now = performance.now();
                    const elapsed = (now - startTime) / 1000;
                    const tps = elapsed > 0 ? (tokenCount / elapsed).toFixed(1) : "0.0";
                    self.postMessage({ status: "update", text, tps, tokenCount });
                },
            }),
        });

        const endTime = performance.now();
        const totalElapsed = (endTime - startTime) / 1000;
        const finalTps = totalElapsed > 0 ? (tokenCount / totalElapsed).toFixed(1) : "0.0";

        // 4. Decode final output
        // Use batch_decode if available, otherwise fallback
        let finalOutput = accumulatedText;
        try {
            const decoded = (processor.batch_decode || tokenizer.batch_decode)(output, { skip_special_tokens: true });
            finalOutput = decoded[0];
        } catch (e) {
            console.warn("Batch decode failed, using accumulated text:", e);
        }
        
        self.postMessage({ status: "complete", text: finalOutput, tps: finalTps, tokenCount });

    } catch (error: any) {
        self.postMessage({ status: "error", message: error instanceof Error ? error.stack || error.message : String(error) });
        console.error("Generation failed:", error);
    }
}

// Check if a model exists in the browser cache
async function checkCache(modelId: string) {
    try {
        // Transformers.js v3 uses 'transformers-cache'
        // But let's check all caches just in case
        const cacheNames = await caches.keys();
        let isCached = false;
        
        for (const name of cacheNames) {
            if (name.includes('transformers-cache')) {
                const cache = await caches.open(name);
                const keys = await cache.keys();
                // Check if any key contains the model ID
                // Transformers.js often uses the full URL or a relative path
                if (keys.some(request => request.url.includes(modelId))) {
                    isCached = true;
                    break;
                }
            }
        }

        console.log(`Cache check for ${modelId}: ${isCached}`);
        self.postMessage({ status: "cache_result", modelId, isCached });
    } catch (e) {
        console.warn("Could not check browser cache:", e);
        self.postMessage({ status: "cache_result", modelId, isCached: false });
    }
}

self.onmessage = async (event) => {
    const { type, data } = event.data;

    switch (type) {
        case "init":
            HF_TOKEN = data.hfToken && data.hfToken.trim() !== "" ? data.hfToken : null;
            // Set token in global env for all subsequent requests
            // @ts-ignore
            env.token = HF_TOKEN;
            console.log("Worker initialized with HF token", HF_TOKEN ? `${HF_TOKEN.substring(0, 5)}...` : "None");
            break;
        case "load":
            console.log("Loading model with token", HF_TOKEN ? `${HF_TOKEN.substring(0, 5)}...` : "None");
            await loadModel(data.modelId);
            break;
        case "generate":
            await generate(data);
            break;
        case "check":
            await checkCache(data.modelId);
            break;
        case "offload":
            await unloadModel(true);
            break;
        case "stop":
            isInterrupted = true;
            break;
    }
};
