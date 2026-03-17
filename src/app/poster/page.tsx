'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Eye, Globe, ChevronRight, Sparkles, Activity, Terminal, MousePointer2, Copy, Check, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function PosterPage() {
    const [isSquare, setIsSquare] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const posterRef = useRef<HTMLDivElement>(null);

    const copyPostText = () => {
        const text = `I’ve been exploring a fundamental shift in how we interact with artificial intelligence: moving inference from massive cloud servers directly into the user's browser. 

I’m thrilled to share an experimental project I’ve been developing that achieves 100% local, high-performance AI execution using WebGPU and the latest frontier models. No servers, no API keys, and absolute privacy by design.`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const exportToPng = async () => {
        if (!posterRef.current) return;
        
        setIsExporting(true);
        try {
            const canvas = await html2canvas(posterRef.current, {
                scale: 2, // Higher resolution
                backgroundColor: '#050505',
                useCORS: true,
                logging: false,
                allowTaint: true,
            });
            
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `lumina-experimental-poster-${isSquare ? 'square' : 'landscape'}.png`;
            link.href = image;
            link.click();
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-20 gap-16 font-sans selection:bg-blue-500/30 overflow-x-hidden">
            
            {/* Professional Toolbar */}
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-6 bg-zinc-900/20 backdrop-blur-3xl p-2 rounded-[24px] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50"
            >
                <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                    <button 
                        onClick={() => setIsSquare(true)}
                        className={`px-8 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-500 ${isSquare ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Square
                    </button>
                    <button 
                        onClick={() => setIsSquare(false)}
                        className={`px-8 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-500 ${!isSquare ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Landscape
                    </button>
                </div>

                <div className="w-px h-8 bg-white/5" />

                <button 
                    onClick={copyPostText}
                    className="flex items-center gap-3 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all active:scale-95"
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied Post' : 'Copy Post Text'}
                </button>

                <button 
                    onClick={exportToPng}
                    disabled={isExporting}
                    className="flex items-center gap-3 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                >
                    {isExporting ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isExporting ? 'Exporting...' : 'Export PNG'}
                </button>
            </motion.div>

            {/* The Poster Container */}
            <motion.div 
                ref={posterRef}
                layout
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`bg-[#050505] border border-white/[0.08] rounded-[100px] overflow-hidden relative shadow-[0_80px_160px_rgba(0,0,0,0.9)] flex flex-col items-center justify-between p-12 transition-all duration-1000 ease-[cubic-bezier(0.16, 1, 0.3, 1)]`}
                style={{
                    width: isSquare ? '1080px' : '1600px',
                    height: isSquare ? '1080px' : '1080px',
                }}
            >
                
                {/* Advanced Background Layers */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.05, 0.15, 0.05]
                        }}
                        transition={{ duration: 10, repeat: Infinity }}
                        className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-500/15 blur-[250px] rounded-full" 
                    />
                    <motion.div 
                        animate={{ 
                            scale: [1.2, 1, 1.2],
                            opacity: [0.05, 0.1, 0.05]
                        }}
                        transition={{ duration: 12, repeat: Infinity }}
                        className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-indigo-500/15 blur-[250px] rounded-full" 
                    />
                </div>

                {/* Refined Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '80px 80px' }} 
                />
                
                {/* Header Section */}
                <div className={`flex flex-col items-center relative z-10 w-full mb-8`}>
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-4 mb-8 bg-white/[0.03] border border-white/10 px-6 py-3 rounded-full backdrop-blur-3xl shadow-2xl"
                    >
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_15px_rgba(96,165,250,0.6)]" />
                        <span className="text-[11px] font-black tracking-[0.4em] uppercase text-zinc-400">Experimental Edge AI v3.5</span>
                    </motion.div>
                    
                    <motion.h1 
                        className={`${isSquare ? 'text-[140px]' : 'text-[110px]'} font-black text-center tracking-[-0.06em] leading-[0.95] mb-8 text-white`}
                    >
                        The Future is <br />
                        <span className="flex items-center justify-center gap-6">
                            <span className="text-white drop-shadow-[0_0_40px_rgba(59,130,246,0.8)]">
                                Local AI
                            </span>
                            <Sparkles className={`${isSquare ? 'w-24 h-24' : 'w-18 h-18'} text-blue-400 opacity-60`} />
                        </span>
                    </motion.h1>
                    
                    <motion.p 
                        layout
                        className={`${isSquare ? 'text-4xl' : 'text-3xl'} text-zinc-500 max-w-5xl text-center font-medium leading-relaxed tracking-tight px-10`}
                    >
                        An experimental deep-dive into browser-native intelligence. <br />
                        <span className="text-zinc-300">Privacy by design. No cloud. No latency.</span>
                    </motion.p>
                </div>

                {/* Balanced Features Grid */}
                <div className={`grid ${isSquare ? 'grid-cols-2 gap-16' : 'grid-cols-4 gap-10'} w-full relative z-10 px-10 mb-8`}>
                    {[
                        { icon: Zap, color: 'text-blue-400', label: 'WebGPU', desc: 'Hardware acceleration at native speed.' },
                        { icon: Shield, color: 'text-indigo-400', label: 'Private', desc: 'Data never leaves your local hardware.' },
                        { icon: Globe, color: 'text-white', label: 'Qwen 3.5', desc: 'Frontier models on Transformers.js.' },
                        { icon: Eye, color: 'text-blue-300', label: 'Vision', desc: 'Local multimodal image intelligence.' }
                    ].map((f, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 + (i * 0.1) }}
                            className="group bg-gradient-to-b from-white/[0.05] to-transparent border border-white/[0.08] p-10 rounded-[56px] flex flex-col items-center text-center transition-all hover:bg-white/[0.08] hover:border-white/20 duration-500 shadow-2xl"
                        >
                            <div className={`p-6 rounded-[28px] bg-white/[0.03] border border-white/[0.08] mb-6 group-hover:scale-110 group-hover:bg-white/[0.08] transition-all duration-700 shadow-inner`}>
                                <f.icon className={`w-10 h-10 ${f.color}`} strokeWidth={1.5} />
                            </div>
                            <h3 className={`${isSquare ? 'text-4xl' : 'text-2xl'} font-black mb-2 text-white tracking-tight`}>{f.label}</h3>
                            <p className={`${isSquare ? 'text-xl' : 'text-sm'} text-zinc-500 leading-snug font-medium opacity-80 group-hover:opacity-100 transition-opacity`}>{f.desc}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Architectural Status Bar */}
                <div className="w-full flex justify-between items-end px-32 relative z-10 mt-auto pb-12">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 text-emerald-400 bg-emerald-400/5 border border-emerald-400/10 px-6 py-3 rounded-2xl backdrop-blur-3xl">
                            <Activity className="w-5 h-5 animate-pulse" />
                            <span className="text-[12px] font-black tracking-[0.2em] uppercase">Experimental Mode Active</span>
                        </div>
                        <div className="flex items-center gap-4 text-zinc-600 text-[11px] font-bold tracking-[0.3em] uppercase ml-1">
                            <Terminal className="w-4 h-4" />
                            Research Prototype: v3.5-Beta
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-4">
                        <div className="text-zinc-500 text-[11px] font-black tracking-[0.5em] uppercase opacity-40">Architectural Core</div>
                        <div className="flex gap-10 items-center bg-white/[0.03] border border-white/[0.08] px-8 py-4 rounded-[28px] backdrop-blur-3xl shadow-2xl">
                            <div className="flex flex-col items-center">
                                <span className="text-white font-black tracking-tighter text-3xl leading-none">Transformers.js</span>
                                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em] mt-2">Hugging Face</span>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="flex flex-col items-center">
                                <span className="text-white font-black tracking-tighter text-3xl leading-none">WebGPU</span>
                                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em] mt-2">Native Engine</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subtle Inner Border Glow */}
                <div className="absolute inset-0 border border-white/[0.03] rounded-[100px] pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
            </motion.div>

            {/* Pro Capture Studio Guide */}
            <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="fixed bottom-12 right-12 bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 p-10 rounded-[48px] shadow-[0_40px_80px_rgba(0,0,0,0.7)] max-w-[360px] transform hover:scale-105 transition-all duration-700 group"
            >
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-300">Capture Studio Pro</span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed font-medium mb-8">
                    Optimized for ultra-high-resolution capture. Use Cmd+Shift+4 (Mac) to capture the central frame for LinkedIn.
                </p>
                <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-3 text-blue-400 text-[10px] font-black tracking-[0.2em]">
                        <MousePointer2 className="w-4 h-4" />
                        <span>FRAME READY</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-700" />
                </div>
            </motion.div>
        </div>
    );
}


