'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, BrainCircuit, Image as ImageIcon, Zap, Trash2, StopCircle } from 'lucide-react';
import { useModel } from '@/hooks/useModel';

import { ModelSelector, MODELS } from '@/components/ModelSelector';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export default function Home() {
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [isReasoningEnabled, setIsReasoningEnabled] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [webGpuSupported, setWebGpuSupported] = useState<boolean | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant' | 'system', content: string, image?: string }>>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const SYSTEM_PROMPT = "You are LUMINA, a helpful and highly capable AI assistant running locally in the user's browser. You can see images and process complex text. Provide clear, concise, and accurate responses. If reasoning mode is enabled, think step-by-step before providing your final answer.";

  // Check for WebGPU support
  useEffect(() => {
    if ('gpu' in navigator) {
      (navigator as any).gpu.requestAdapter().then((adapter: any) => {
        setWebGpuSupported(!!adapter);
      }).catch(() => {
        setWebGpuSupported(false);
      });
    } else {
      setWebGpuSupported(false);
    }
  }, []);

  const {
    status,
    aggregateProgress: progress,
    currentFile,
    currentModel,
    cachedModels,
    checkCache,
    loadModel,
    offloadModel,
    error,
    output,
    stats,
    isGenerating,
    generate,
    stopGeneration
  } = useModel();

  // On mount and when selectedModel changes, check if it's already in the cache
  useEffect(() => {
    checkCache(selectedModel);
  }, [selectedModel, checkCache]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isGenerating, output]);

  // Remove the auto-load useEffect so models only download on explicit user action
  // Instead, the ModelSelector will handle calling loadModel when a user selects "Download/Load"

  const handleSend = () => {
    if ((!inputValue.trim() && !imageUrl) || isGenerating || status !== 'ready') return;

    // Construct the user message content
    const userMessageContent = isReasoningEnabled && inputValue.trim()
      ? `Reason step by step: ${inputValue}`
      : inputValue;

    // 1. Update UI messages state first (used for rendering)
    const newUserMessageUI = {
      role: 'user' as const,
      content: inputValue, // Store original input for UI display
      image: imageUrl || undefined
    };
    const updatedMessagesUI = [...messages, newUserMessageUI];
    setMessages(updatedMessagesUI);

    // 2. Construct messages array for the AI model (includes history + system prompt)
    // We start with the system prompt
    const modelMessages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // Add previous history
    messages.forEach(msg => {
      if (msg.role === 'user') {
        const content: any[] = [{ type: 'text', text: msg.content }];
        if (msg.image) content.push({ type: 'image', image: msg.image });
        modelMessages.push({ role: 'user', content });
      } else {
        modelMessages.push({ role: 'assistant', content: msg.content });
      }
    });

    // Add the current user message
    const currentContent: any[] = [{ type: 'text', text: userMessageContent }];
    if (imageUrl) currentContent.push({ type: 'image', image: imageUrl });
    modelMessages.push({ role: 'user', content: currentContent });

    // 3. Call generate with full history
    generate(modelMessages, imageUrl || undefined);
    
    setInputValue('');
    setImageUrl(null);
  };

  // Listen for the final assistant response from useModel hook
  useEffect(() => {
    if (status === 'ready' && !isGenerating && output && messages.length > 0 && messages[messages.length - 1].role === 'user') {
      setMessages(prev => [...prev, { role: 'assistant', content: output }]);
    }
  }, [status, isGenerating, output, messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Max dimensions
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions preserving aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          // Draw on canvas and compress
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Export as JPEG to reduce base64 size (Transformers.js vision models process at small resolutions anyway)
            const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            setImageUrl(resizedBase64);
          } else {
            // Fallback if canvas fails
            setImageUrl(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="z-10 w-full max-w-5xl flex flex-col gap-4 mb-4">
        {webGpuSupported === false && (
          <div className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4" />
            <span>WebGPU is not supported in your browser. Inference will fallback to WASM which is significantly slower. For best performance, use Chrome or Edge with a dedicated GPU.</span>
          </div>
        )}
        <div className="flex flex-col md:flex-row items-center justify-between font-mono text-sm gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <BrainCircuit className="w-8 h-8 text-blue-500" />
            <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              LUMINA
            </h1>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center flex-1 w-full z-50 gap-2">
            {/* Model Switcher Component */}
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              status={status}
              progress={progress}
              currentFile={currentFile}
              currentModel={currentModel}
              cachedModels={cachedModels}
              onLoadModel={() => loadModel(selectedModel)}
              onOffloadModel={offloadModel}
            />
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Reasoning Toggle */}
            <button
              onClick={() => setIsReasoningEnabled(!isReasoningEnabled)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${isReasoningEnabled
                ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-500'
                }`}
            >
              <Zap className={`w-4 h-4 ${isReasoningEnabled ? 'fill-blue-400' : ''}`} />
              <span className="text-xs font-medium">Reasoning</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-between pb-4 overflow-hidden">

        {/* Chat History */}
        <div ref={chatContainerRef} className="flex-1 w-full max-w-3xl overflow-y-auto px-4 py-8 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
          {messages.length === 0 && !isGenerating ? (
            <div className="h-full flex flex-col justify-center items-center text-center space-y-8 mb-20 mt-10">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-serif tracking-tight text-white/90">
                  Vision meets <br />
                  <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">local intelligence</span>.
                </h2>
                <p className="text-zinc-500 max-w-md mx-auto text-sm">
                  Experience frontier models in your browser. <br /> Total privacy, zero server costs.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 pb-8">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-3xl px-5 py-4 ${msg.role === 'user'
                      ? 'bg-zinc-800 text-zinc-100 rounded-br-sm shadow-xl'
                      : 'bg-transparent text-zinc-200 border border-zinc-800/50'
                      }`}
                  >
                    {/* User Avatar / Assistant Avatar could go here if desired */}
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Uploaded content"
                        className="max-w-xs rounded-xl mb-3 border border-zinc-700/50 shadow-sm"
                      />
                    )}
                    <div className="font-sans text-[15px] leading-relaxed whitespace-pre-wrap">
                      {msg.role === 'assistant' ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        msg.content
                      )}

                      {msg.role === 'assistant' && isGenerating && index === messages.length - 1 && (
                        <span className="inline-block w-1.5 h-4 ml-1 mt-1 bg-blue-500 animate-pulse align-middle rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Active Streaming Message */}
              {isGenerating && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[85%] rounded-3xl px-5 py-4 bg-transparent text-zinc-200 border border-zinc-800/50">
                    <div className="font-sans text-[15px] leading-relaxed whitespace-pre-wrap">
                      {output ? (
                        <>
                          <MarkdownRenderer content={output} />
                          <span className="inline-block w-1.5 h-4 ml-1 mt-1 bg-blue-500 animate-pulse align-middle rounded-full" />
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 h-6">
                          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="w-full max-w-3xl px-4 mt-auto">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur opacity-30 group-focus-within:opacity-100 transition duration-500"></div>
            <div className="relative flex flex-col gap-2 p-2 rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-all duration-300 focus-within:ring-1 focus-within:ring-zinc-700">

              {/* Image Preview */}
              {imageUrl && (
                <div className="px-3 pt-2 relative w-fit">
                  <div className="group/image relative">
                    <img src={imageUrl} alt="Uploaded" className="h-16 w-16 object-cover rounded-xl border border-zinc-700 shadow-sm" />
                    <button
                      onClick={() => setImageUrl(null)}
                      className="absolute -top-2 -right-2 bg-zinc-800 border border-zinc-700 rounded-full p-1 text-zinc-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-colors shadow-md opacity-0 group-hover/image:opacity-100"
                    >
                      <Settings className="w-3 h-3 rotate-45" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-1">
                {MODELS.find(m => m.id === selectedModel)?.isVision && (
                  <label className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer shrink-0">
                    <ImageIcon className="w-5 h-5" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                )}

                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask Lumina anything..."
                  className="flex-1 bg-transparent border-none outline-none resize-none py-2.5 text-[15px] placeholder:text-zinc-600 max-h-32 focus:ring-0"
                  rows={1}
                  disabled={status !== 'ready' || isGenerating}
                  style={{ height: 'auto', minHeight: '44px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />

                {isGenerating ? (
                  <button
                    onClick={stopGeneration}
                    className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors shrink-0 shadow-sm border border-red-500/20"
                    title="Stop generation"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-sm" />
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={status !== 'ready' || (!inputValue.trim() && !imageUrl)}
                    className="p-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-sm"
                  >
                    <Settings className="w-5 h-5 rotate-45" />
                  </button>
                )}
              </div>

              {/* Status Footer */}
              <div className="flex items-center justify-between px-3 pb-1 border-t border-zinc-800/50 pt-2 mt-1">
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    status === 'loading' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-zinc-800 text-zinc-500 border-zinc-700'
                    }`}>
                    {status}
                  </span>
                  {webGpuSupported === false && <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20">WASM Mode</span>}
                  <span className="hidden md:inline px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-500 border border-zinc-700">WebGPU</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-600">
                  {currentModel?.split('/').pop()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="w-full max-w-5xl flex justify-center gap-8 py-4 border-t border-zinc-900/50 font-mono text-[10px] text-zinc-600">
        <div className="flex gap-2">
          <span>Status:</span>
          <span className={`${status === 'error' ? 'text-red-400' :
            status === 'loading' ? 'text-blue-400' :
              status === 'ready' ? 'text-emerald-400' : 'text-zinc-400'
            }`}>
            {status === 'loading' ? `Loading... ${progress !== undefined ? `${progress.toFixed(0)}%` : ''}` : status.toUpperCase()}
          </span>
        </div>
        {error && (
          <div className="flex gap-2 text-red-500">
            <span>Error:</span>
            <span>{error}</span>
          </div>
        )}
        <div className="flex gap-2">
          <span>GPU:</span>
          <span className="text-zinc-400 uppercase">Automatic</span>
        </div>
        <div className="flex gap-2">
          <span>Tokens/s:</span>
          <span className="text-zinc-400">{stats.tps}</span>
        </div>
        <div className="flex gap-2">
          <span>Tokens:</span>
          <span className="text-zinc-400">{stats.tokenCount}</span>
        </div>
      </div>
    </main>
  );
}
