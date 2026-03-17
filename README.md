# LUMINA 🧠✨
*Vision meets local intelligence.*

LUMINA is a modern, privacy-first generative AI chat interface built entirely on **Transformers.js** and **Next.js**. It runs frontier text and vision-language models 100% locally in your browser using **WebGPU** acceleration. 

There are no backend servers for generation, no API keys to pay for, and absolute zero data leaves your device.

## Core Features 🚀
*   **100% Local Execution:** Utilizes `Transformers.js v3` to run Hugging Face ONNX models natively in the browser.
*   **WebGPU Accelerated:** Leverages WebGPU via `onnxruntime-web` for massive performance improvements and lower latency during inference workloads.
*   **Multimodal Capabilities:** Supports vision-language models (like `Qwen2-VL-2B-Instruct`), allowing users to upload images and ask questions about them.
*   **Real-time Output Streaming:** Renders model output in a dynamic, pulsing typing bubble as the text streams, providing immediate visual feedback.
*   **Intelligent Model Caching:** Automatically leverages the IndexedDB `Cache API` via Transformers.js to persistently store models up to several GBs in size. The UI elegantly detects locally cached models without needing to redownload them.
*   **Fallback Protections:** Gracefully handles WebGPU lack of support by cleanly falling back to WebAssembly (WASM), and displays a user warning message.

## Architecture & Tech Stack 🏗️

### Frontend
- **Framework:** Next.js (App Router) + React 18
- **Styling:** TailwindCSS with modern dark-mode glassmorphic aesthetics.
- **Icons:** Lucide React
- **Markdown:** `react-markdown` with `remark-gfm` for rich text and code block styling (`react-syntax-highlighter`).

### AI Engine Layer 
- **Transformers.js & ONNX Runtime Web:** The core inference engine running inside a dedicated **Web Worker** (`src/worker.ts`). 
- **Worker Isolation:** The main UI thread communicates off-thread to the worker to handle the heavy AI processing, preventing the UI from freezing.

### Hooks
- **`useModel.ts`**: The glue between the React UI state and the background AI worker thread. It receives `postMessage` streams from `worker.ts` and transforms them into usable state (`status`, `isGenerating`, `output`, `cachedModels`).

## Getting Started 💻
1. Ensure you have **Node.js** installed.
2. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
3. *(Optional)* Provide a HuggingFace read token in `.env.local`:
   ```env
   NEXT_PUBLIC_HF_TOKEN=hf_your_token_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open [localhost:3000](http://localhost:3000)

> Note: To fully experience the WebGPU speeds, you must use a compatible browser (like Chrome or Edge) with hardware acceleration enabled.

## Models Available 🤖
- **Qwen2.5-VL-3B-Instruct** (`3.0B Parameters` | `1.7 GB`): A powerful vision language model capabable of reasoning across images.
- **Qwen3.5-0.8B-ONNX** (`0.8B Parameters` | `800 MB`): A highly capable, blazing fast text-only conversational assistant.

*More models can be added by updating `src/components/ModelSelector.tsx` array configuration provided they are ONNX converted and HuggingFace hosted.*

## Development & Caching Configuration
LUMINA configures Transformers.js globally within the Worker thread to utilize local caching mechanisms over the network. 
```javascript
// From worker.ts
env.allowLocalModels = false;
env.useBrowserCache = true;
env.useWasmCache = true;
env.allowRemoteModels = true;
```
