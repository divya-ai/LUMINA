'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface ProgressItem {
  file: string;
  progress: number;
  status: string;
}

export function useModel() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [cachedModels, setCachedModels] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<{ tps: string; tokenCount: number }>({ tps: '0.0', tokenCount: 0 });

  // Refs for throttling output
  const outputBufferRef = useRef<string>('');
  const outputUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate overall progress based on all files being downloaded
  const aggregateProgress = useMemo(() => {
    const values = Object.values(downloadProgress);
    if (values.length === 0) return undefined; // Return undefined if no progress events yet

    const sum = values.reduce((acc, curr) => {
      const val = typeof curr === 'number' && !isNaN(curr) ? curr : 0;
      return acc + val;
    }, 0);
    const avg = sum / values.length;
    // Cap at 100
    return Math.min(100, Math.max(0, avg));
  }, [downloadProgress]);

  useEffect(() => {
    // Read HF token from environment variables
    const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN;

    // Initialize worker
    const worker = new Worker(new URL('../worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event) => {
      const { status: msgStatus, message, modelId, progressData, isCached } = event.data;

      switch (msgStatus) {
        case 'progress':
          if (progressData && progressData.file) {
            const { file, status: pStatus, progress: p, loaded, total } = progressData;
            setCurrentFile(file);
            
            // Calculate progress if not directly provided
            let currentProgress = p;
            if (currentProgress === undefined && loaded !== undefined && total !== undefined) {
              currentProgress = (loaded / total) * 100;
            }

            if (pStatus === 'initiate') {
              setDownloadProgress((prev) => ({ ...prev, [file]: 0 }));
            } else if (pStatus === 'progress' || pStatus === 'download') {
              setDownloadProgress((prev) => ({ ...prev, [file]: currentProgress || 0 }));
            } else if (pStatus === 'done') {
              setDownloadProgress((prev) => ({ ...prev, [file]: 100 }));
            }
          }
          break;
        case 'ready':
          setStatus('ready');
          setCurrentModel(modelId);
          setDownloadProgress({});
          setCurrentFile(null);
          // If it just loaded successfully, it's now cached
          setCachedModels((prev) => ({ ...prev, [modelId]: true }));
          break;
        case 'error':
          setStatus('error');
          setError(message);
          setIsGenerating(false);
          break;
        case 'update':
          // Update stats
          if (event.data.tps) {
            setStats({ tps: event.data.tps, tokenCount: event.data.tokenCount || 0 });
          }
          // Append to buffer
          outputBufferRef.current += event.data.text;

          // Throttle React state updates to ~20FPS (50ms)
          if (!outputUpdateTimeoutRef.current) {
            outputUpdateTimeoutRef.current = setTimeout(() => {
              setOutput((prev) => prev + outputBufferRef.current);
              outputBufferRef.current = '';
              outputUpdateTimeoutRef.current = null;
            }, 50);
          }
          break;
        case 'complete':
          // Update final stats
          if (event.data.tps) {
            setStats({ tps: event.data.tps, tokenCount: event.data.tokenCount || 0 });
          }
          // Flush any remaining buffer immediately
          if (outputUpdateTimeoutRef.current) {
            clearTimeout(outputUpdateTimeoutRef.current);
            outputUpdateTimeoutRef.current = null;
          }
          if (outputBufferRef.current) {
            setOutput((prev) => prev + outputBufferRef.current);
            outputBufferRef.current = '';
          }
          setIsGenerating(false);
          break;
        case 'cache_result':
          if (modelId) {
            setCachedModels((prev) => ({ ...prev, [modelId]: isCached }));
          }
          break;
        case 'offloaded':
          setStatus('idle');
          setCurrentModel(null);
          break;
      }
    };

    // Send the token to the worker immediately after initialization
    if (hfToken) {
      worker.postMessage({ type: 'init', data: { hfToken } });
    }

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  const checkCache = useCallback((modelId: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'check', data: { modelId } });
    }
  }, []);

  const loadModel = useCallback((modelId: string) => {
    if (workerRef.current) {
      setStatus('loading');
      setDownloadProgress({});
      setCurrentFile(null);
      setError(null);
      workerRef.current.postMessage({ type: 'load', data: { modelId } });
    }
  }, []);

  const offloadModel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'offload', data: {} });
    }
  }, []);

  const generate = useCallback((messages: any[], image_url?: string, generation_config?: any) => {
    if (workerRef.current && status === 'ready') {
      setIsGenerating(true);
      setOutput('');
      outputBufferRef.current = '';

      workerRef.current.postMessage({
        type: 'generate',
        data: { messages, image_url, generation_config },
      });
    }
  }, [status]);

  const stopGeneration = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      setIsGenerating(false);
    }
  }, []);

  return {
    status,
    progress: aggregateProgress,
    aggregateProgress,
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
    stopGeneration,
  };
}
