"use client";
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type LogEntry = {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  peerId: string;
  status: 'complete' | 'error';
  direction: 'sent' | 'received';
  timestamp: Date;
};

type LogState = {
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id'>) => void;
  clearLogs: () => void;
};

export const useLogStore = create(
  persist<LogState>(
    (set) => ({
      logs: [],
      addLog: (log) => {
        const newLog = { ...log, id: `log_${Date.now()}` };
        set((state) => ({ logs: [newLog, ...state.logs] }));
      },
      clearLogs: () => {
        set({ logs: [] });
      },
    }),
    {
      name: 'blackwire-transfer-log-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
