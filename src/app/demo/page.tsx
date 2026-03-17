'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, BrainCircuit, Image as ImageIcon, Zap, Trash2, StopCircle } from 'lucide-react';
import { ModelSelector, MODELS } from '@/components/ModelSelector';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export default function Demo() {
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [isReasoningEnabled, setIsReasoningEnabled] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant' | 'system', content: string, image?: string }>>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Mock Model State
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(MODELS[0].id);
  const [cachedModels, setCachedModels] = useState<Record<string, boolean>>(
    MODELS.reduce((acc, m) => ({ ...acc, [m.id]: true }), {})
  );
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ tps: 0, tokenCount: 0 });

  const stopGenerationRef = useRef(false);

  // To prevent errors since checkCache is used, but we mock it.
  const checkCache = (modelId: string) => {};

  const loadModel = (modelId: string) => {
    if (currentModel === modelId) return;
    setStatus('loading');
    setProgress(0);
    setCurrentFile('model.safetensors');
    
    let currentProgress = 0;
    const interval = setInterval(() => {
        currentProgress += 10;
        setProgress(currentProgress);
        if (currentProgress >= 100) {
            clearInterval(interval);
            setStatus('ready');
            setCurrentModel(modelId);
            setProgress(undefined);
            setCurrentFile(null);
            setCachedModels(prev => ({ ...prev, [modelId]: true }));
        }
    }, 100);
  }

  const offloadModel = () => {
    setStatus('ready');
    setCurrentModel(null);
  }

  const stopGeneration = () => {
    stopGenerationRef.current = true;
  }

  const generate = async (modelMessages: any[], img?: string) => {
    setIsGenerating(true);
    setOutput('');
    stopGenerationRef.current = false;
    
    let dummyResponse = '';
    const lastUserMessage = modelMessages[modelMessages.length - 1]?.content[0]?.text || '';
    
    if (img) {
      if (lastUserMessage.toLowerCase().includes('what object is this')) {
         dummyResponse = `red apple`;
      } else {
         dummyResponse = `I can see the image you uploaded! Since this is a demo, I am using simulated vision capabilities. I can detect various elements in this picture. How would you like me to analyze it further?`;
      }
    } else if (lastUserMessage.toLowerCase().includes('hello') || lastUserMessage.toLowerCase().includes('hi')) {
       dummyResponse = `Hello! I'm Lumina, running in **Demo Mode**. I look and feel exactly like the real local AI, but I'm skipping the large downloads so you can test the UI instantly! Try asking me for code or enable reasoning to see how I simulate the output streaming.`;
    } else if (lastUserMessage.toLowerCase().includes('code')) {
        dummyResponse = `Sure thing! Here is an example of code formatting in **Demo Mode**:\n\n\`\`\`javascript\nfunction simulateIntelligence() {\n  console.log("Streaming response...");\n  return true;\n}\n\nsimulateIntelligence();\n\`\`\`\n\nNotice how the syntax highlighting is identically beautiful?`;
    } else {
       dummyResponse = `That is an excellent point! If I were fully loaded in memory, I would run real inference on "${lastUserMessage}". However, in this demo state, I simulated my response to showcase the lightning-fast typed streaming. Feel free to try another prompt!`;
    }

    if (isReasoningEnabled) {
        dummyResponse = `<think>\nAnalyzing prompt in demo mode...\nSelecting optimal pre-written response...\nApplying markdown magic.\n</think>\n\n` + dummyResponse;
    }

    const words = dummyResponse.split(' ');
    let currentOutput = '';
    let tokenCount = 0;
    
    for (let i = 0; i < words.length; i++) {
        if (stopGenerationRef.current) break;
        currentOutput += words[i] + (i < words.length - 1 ? ' ' : '');
        tokenCount++;
        setOutput(currentOutput);
        setStats({ tps: Math.floor(Math.random() * 20 + 40), tokenCount });
        
        await new Promise(r => setTimeout(r, Math.random() * 50 + 20));
    }

    setIsGenerating(false);
    return currentOutput;
  }

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isGenerating, output]);

  const handleSend = async () => {
    if ((!inputValue.trim() && !imageUrl) || isGenerating || status !== 'ready') return;

    const userMessageContent = isReasoningEnabled && inputValue.trim()
      ? `Reason step by step: ${inputValue}`
      : inputValue;

    const newUserMessageUI = {
      role: 'user' as const,
      content: inputValue,
      image: imageUrl || undefined
    };
    
    setMessages(prev => [...prev, newUserMessageUI]);

    const modelMessages = [
      { role: 'system', content: 'Demo System Prompt' },
      ...messages.map(m => ({ role: m.role as any, content: m.content })),
      { role: 'user', content: [{ text: userMessageContent }] }
    ];

    setInputValue('');
    const currentImg = imageUrl;
    setImageUrl(null);
    
    const finalOutput = await generate(modelMessages, currentImg || undefined);
    
    if (!stopGenerationRef.current) {
        setMessages(prev => [...prev, { role: 'assistant', content: finalOutput }]);
    } else {
        setMessages(prev => [...prev, { role: 'assistant', content: finalOutput + ' (stopped)' }]);
    }
    setOutput('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

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

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            setImageUrl(resizedBase64);
          } else {
            setImageUrl(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-zinc-950 text-zinc-100 relative">
      <div className="absolute top-0 left-0 w-full bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-[10px] md:text-sm py-1.5 text-center font-bold tracking-widest uppercase z-[100] shadow-[0_0_15px_rgba(245,158,11,0.1)]">
        Live Demo Environment — Simulated Intelligence Mode
      </div>
      
      {/* Header */}
      <div className="z-10 w-full max-w-5xl flex flex-col gap-4 mb-4 mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between font-mono text-sm gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <BrainCircuit className="w-8 h-8 text-blue-500" />
            <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-end gap-2">
              LUMINA
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md mb-1 border border-amber-500/30">DEMO</span>
            </h1>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center flex-1 w-full z-50 gap-2">
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
      <div className="flex-1 w-full flex flex-col items-center justify-between pb-4 overflow-hidden mt-2">
        <div ref={chatContainerRef} className="flex-1 w-full max-w-3xl overflow-y-auto px-4 py-8 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
          {messages.length === 0 && !isGenerating ? (
            <div className="h-full flex flex-col justify-center items-center text-center space-y-8 mb-20 mt-10">
              <div className="space-y-6">
                <h2 className="text-4xl md:text-5xl font-serif tracking-tight text-white/90">
                  Vision meets <br />
                  <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">local intelligence</span>.
                </h2>
                <div className="flex flex-col items-center gap-3">
                  <p className="text-zinc-500 max-w-md mx-auto text-sm">
                    Experience frontier models in your browser. <br /> Total privacy, zero server costs.
                  </p>
                  <span className="inline-flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20">
                    <Zap className="w-4 h-4" />
                    Interactive Demo Mode Active
                  </span>
                </div>
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
                    </div>
                  </div>
                </div>
              ))}

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
                  placeholder="Ask Lumina anything (Demo Mode)..."
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

              <div className="flex items-center justify-between px-3 pb-1 border-t border-zinc-800/50 pt-2 mt-1">
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    status === 'loading' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-zinc-800 text-zinc-500 border-zinc-700'
                    }`}>
                    {status}
                  </span>
                  <span className="hidden md:inline px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-500 border border-zinc-700">WebGPU (Mock)</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-600">
                  {currentModel?.split('/').pop() || 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="w-full max-w-5xl flex justify-center gap-8 py-4 border-t border-zinc-900/50 font-mono text-[10px] text-zinc-600 mt-2">
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
          <span className="text-zinc-400 uppercase">Simulated</span>
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
