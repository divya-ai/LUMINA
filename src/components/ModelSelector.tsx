import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Download, Cpu, BrainCircuit, HardDrive, Zap, Lock, Eye, PowerOff } from 'lucide-react';

interface ModelInfo {
    id: string;
    name: string;
    description: string;
    parameters: string;
    size: string;
    isVision: boolean;
    capabilities: string[];
}

export const MODELS: ModelInfo[] = [
    {
        id: 'onnx-community/Qwen3.5-0.8B-ONNX',
        name: 'Qwen 3.5 0.8B',
        description: 'Ultra-fast vision-language model optimized for edge devices.',
        parameters: '0.8B',
        size: '1.2 GB',
        isVision: true,
        capabilities: ['Text Generation', 'Image Analysis', 'Visual QA', 'Fast Inference']
    },
    {
        id: 'onnx-community/Qwen3.5-2B-ONNX',
        name: 'Qwen 3.5 2B',
        description: 'Balanced vision-language model with strong reasoning and image capabilities.',
        parameters: '2B',
        size: '2.8 GB',
        isVision: true,
        capabilities: ['Image Analysis', 'Visual QA', 'Text Generation', 'Reasoning']
    },
    {
        id: 'onnx-community/Qwen2-VL-2B-Instruct',
        name: 'Qwen 2 VL 2B',
        description: 'Advanced vision-language model for image understanding.',
        parameters: '2B',
        size: '4.5 GB',
        isVision: true,
        capabilities: ['Image Analysis', 'Visual QA', 'OCR']
    }
];

interface ModelSelectorProps {
    selectedModel: string;
    onSelectModel: (modelId: string) => void;
    status: string;
    progress: number | undefined;
    currentFile: string | null;
    currentModel: string | null;
    cachedModels: Record<string, boolean>;
    onLoadModel: () => void;
    onOffloadModel?: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    selectedModel,
    onSelectModel,
    status,
    progress,
    currentFile,
    currentModel,
    cachedModels,
    onLoadModel,
    onOffloadModel
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentModelDetails = MODELS.find(m => m.id === selectedModel) || MODELS[0];
    const isModelLoaded = status === 'ready' && currentModel === selectedModel;
    const isCached = cachedModels[selectedModel] === true;

    // Truncate file name for display
    const displayFileName = currentFile ? (currentFile.length > 20 ? '...' + currentFile.slice(-17) : currentFile) : '';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex items-center gap-2 w-full max-w-md" ref={dropdownRef}>
            <div className="relative flex-1">
                {/* Selector Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={status === 'loading'}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-300 ${status === 'loading'
                        ? 'border-zinc-800 bg-zinc-900/50 opacity-50 cursor-wait'
                        : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 hover:border-zinc-700'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${currentModelDetails.isVision ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {currentModelDetails.isVision ? <Eye className="w-5 h-5" /> : <BrainCircuit className="w-5 h-5" />}
                        </div>
                        <div className="flex flex-col items-start overflow-hidden text-left">
                            <span className="text-sm font-semibold text-zinc-100 truncate">{currentModelDetails.name}</span>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {currentModelDetails.parameters}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {currentModelDetails.size}</span>
                            </div>
                        </div>
                    </div>

                    <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Progress Bar (Visible when loading) */}
                {status === 'loading' && (
                    <div className="absolute -bottom-1 left-4 right-4 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col gap-1">
                            {MODELS.map((model) => {
                                const isSelected = model.id === selectedModel;
                                return (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            onSelectModel(model.id);
                                            setIsOpen(false);
                                        }}
                                        className={`relative flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 ${isSelected
                                            ? 'bg-zinc-800/80 border-transparent'
                                            : 'hover:bg-zinc-800/50 border-transparent hover:border-zinc-700/50'
                                            } border`}
                                    >
                                        <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${isSelected
                                            ? (model.isVision ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400')
                                            : 'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            {model.isVision ? <Eye className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
                                        </div>

                                        <div className="flex-1 min-w-0 pr-6">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                                    {model.name}
                                                </span>
                                                {isSelected && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-700/50 text-emerald-400">Selected</span>}
                                            </div>

                                            <p className="text-xs text-zinc-500 mb-2 line-clamp-2">
                                                {model.description}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-mono text-zinc-500">
                                                <span className="flex items-center gap-1 bg-zinc-950/50 px-1.5 py-0.5 rounded">
                                                    <Cpu className="w-3 h-3 text-zinc-400" /> {model.parameters}
                                                </span>
                                                <span className="flex items-center gap-1 bg-zinc-950/50 px-1.5 py-0.5 rounded">
                                                    <HardDrive className="w-3 h-3 text-zinc-400" /> {model.size}
                                                </span>
                                                {model.capabilities.map((cap, i) => (
                                                    <span key={i} className="flex items-center gap-1 text-zinc-400">
                                                        <Zap className="w-3 h-3 text-amber-500" /> {cap}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-2 pt-2 border-t border-zinc-800/80 px-2 pb-1">
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                                <Lock className="w-3 h-3" />
                                <span>Models run 100% locally. No data leaves your device.</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            {!isModelLoaded ? (
                <button
                    onClick={onLoadModel}
                    disabled={status === 'loading'}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 ${status === 'loading'
                        ? 'bg-blue-500/20 text-blue-400 cursor-wait'
                        : isCached
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'bg-white text-zinc-950 hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]'
                        }`}
                >
                    {status === 'loading' ? (
                        <>
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-xs font-bold">{progress !== undefined ? `${Math.round(progress)}%` : 'Loading from cache...'}</span>
                                {displayFileName && (
                                    <span className="text-[9px] text-blue-400 font-mono mt-0.5 truncate max-w-[80px]">
                                        {displayFileName}
                                    </span>
                                )}
                            </div>
                        </>
                    ) : isCached ? (
                        <>
                            <Zap className="w-4 h-4 text-emerald-400" />
                            <span>Launch</span>
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            <span>Download ({currentModelDetails.size})</span>
                        </>
                    )}
                </button>
            ) : (
                <button
                    onClick={onOffloadModel}
                    title="Eject model from memory"
                    className="flex shrink-0 items-center justify-center p-3.5 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                >
                    <PowerOff className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};
