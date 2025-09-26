
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { usePeerStore } from '@/connection/peer';
import { v4 as uuidv4 } from 'uuid';

const BENCHMARK_SIZE = 100 * 1024 * 1024; // 100 MB
const BENCHMARK_CHUNK_SIZE = 128 * 1024; // 128 KB

export type BenchmarkResult = {
    runId: string;
    timestamp: number;
    size: number;
    duration: number; // in milliseconds
    throughput: number; // in Mbps
};

type BenchmarkState = {
    status: 'idle' | 'sending' | 'receiving' | 'verifying';
    progress: number;
    currentRunId: string | null;
    results: BenchmarkResult[];
    
    // Sender methods
    startBenchmark: () => void;
    setSenderResults: (payload: { runId: string, duration: number }) => void;

    // Receiver methods
    startReceiving: (payload: { runId: string, size: number, chunkSize: number }) => void;
    receiveChunk: (payload: { runId: string, index: number, chunk: ArrayBuffer }) => void;
    finishReceiving: (runId: string) => Promise<number | null>;

    // Common
    clearResults: () => void;
    _reset: () => void;
};

// --- In-memory store for receiving benchmark data ---
const benchmarkData = new Map<string, {
    startTime: number,
    totalChunks: number,
    receivedChunks: number
}>();


export const useBenchmarkStore = create<BenchmarkState>(
    persist(
        (set, get) => ({
            status: 'idle',
            progress: 0,
            currentRunId: null,
            results: [],
            
            _reset: () => {
                set({ status: 'idle', progress: 0, currentRunId: null });
            },

            startBenchmark: async () => {
                const { status, _reset } = get();
                const { sendJson, sendBenchmarkChunk } = usePeerStore.getState();
                if (status !== 'idle') return;

                _reset();
                const runId = uuidv4();
                set({ status: 'sending', currentRunId: runId });

                sendJson({ type: 'benchmark-start', payload: { runId, size: BENCHMARK_SIZE, chunkSize: BENCHMARK_CHUNK_SIZE } });
                
                const totalChunks = Math.ceil(BENCHMARK_SIZE / BENCHMARK_CHUNK_SIZE);
                const chunk = new ArrayBuffer(BENCHMARK_CHUNK_SIZE);

                for (let i = 0; i < totalChunks; i++) {
                    // Check if the run was aborted (e.g. peer disconnected)
                    if (get().currentRunId !== runId || usePeerStore.getState().status !== 'connected') {
                        console.log('Benchmark run aborted.');
                        get()._reset();
                        return;
                    }
                    sendBenchmarkChunk({ runId, index: i, chunk });
                    set({ progress: (i / totalChunks) * 100 });
                    // Yield to the event loop occasionally to prevent freezing the UI
                    if (i % 50 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
                
                sendJson({ type: 'benchmark-end', payload: { runId } });
                set({ progress: 100, status: 'verifying' });
            },

            setSenderResults: ({ runId, duration }) => {
                if (get().currentRunId !== runId) return;

                const throughput = (BENCHMARK_SIZE * 8) / (duration / 1000) / (1024 * 1024);
                const newResult: BenchmarkResult = {
                    runId,
                    timestamp: Date.now(),
                    size: BENCHMARK_SIZE,
                    duration,
                    throughput: parseFloat(throughput.toFixed(2)),
                };
                
                set(state => ({
                    results: [newResult, ...state.results],
                }));
                get()._reset();
            },

            startReceiving: ({ runId, size, chunkSize }) => {
                benchmarkData.set(runId, {
                    startTime: Date.now(),
                    totalChunks: Math.ceil(size / chunkSize),
                    receivedChunks: 0
                });
                set({ status: 'receiving', currentRunId: runId, progress: 0 });
            },

            receiveChunk: ({ runId, index, chunk }) => {
                const run = benchmarkData.get(runId);
                if (!run) return;
                
                run.receivedChunks++;
                const progress = (run.receivedChunks / run.totalChunks) * 100;
                set({ progress });
            },

            finishReceiving: async (runId) => {
                const run = benchmarkData.get(runId);
                 if (!run || run.receivedChunks !== run.totalChunks) {
                    console.error('Benchmark failed: incomplete data.', {run});
                    get()._reset();
                    benchmarkData.delete(runId);
                    return null;
                }

                const duration = Date.now() - run.startTime;
                
                get()._reset();
                benchmarkData.delete(runId);

                return duration;
            },

            clearResults: () => {
                set({ results: [] });
            }

        }),
        {
            name: 'blackwire-benchmark-results',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ results: state.results }),
        }
    )
);
