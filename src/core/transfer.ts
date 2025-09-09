import { create } from 'zustand';

export type TransferFile = {
  file: File;
  progress: number;
  status: 'pending' | 'sending' | 'paused' | 'complete' | 'error';
  speed: number; // in bytes per second
  startTime?: number;
  lastLoaded: number;
  lastLoadedTime?: number;
};

type TransferState = {
  files: TransferFile[];
  addFiles: (files: File[]) => void;
  updateFileProgress: (fileName: string, progress: number) => void;
  updateFileStatus: (fileName: string, status: TransferFile['status']) => void;
  removeFile: (fileName: string) => void;
  clearFiles: () => void;
  startReceiving: (fileName: string) => void;
  endReceiving: (fileName: string) => void;
};

export const useTransferStore = create<TransferState>((set, get) => ({
  files: [],
  addFiles: (newFiles: File[]) =>
    set((state) => {
      const newTransferFiles: TransferFile[] = newFiles
        .filter(f => !state.files.some(tf => tf.file.name === f.name)) // Avoid duplicates
        .map((file) => ({
          file,
          progress: 0,
          status: 'pending',
          speed: 0,
          lastLoaded: 0,
        }));
      return { files: [...state.files, ...newTransferFiles] };
    }),
  updateFileProgress: (fileName: string, progress: number) =>
    set((state) => {
      const now = Date.now();
      return {
        files: state.files.map((tf) => {
          if (tf.file.name === fileName) {
            const timeDiff = tf.lastLoadedTime ? (now - tf.lastLoadedTime) / 1000 : 0;
            const loadedDiff = tf.file.size * (progress / 100) - tf.lastLoaded;
            const speed = timeDiff > 0 ? loadedDiff / timeDiff : tf.speed;
            
            return { 
              ...tf, 
              progress,
              speed: speed > 0 ? speed : tf.speed,
              lastLoaded: tf.file.size * (progress / 100),
              lastLoadedTime: now,
            };
          }
          return tf;
        }),
      }
    }),
  updateFileStatus: (fileName: string, status: TransferFile['status']) =>
    set((state) => ({
      files: state.files.map((tf) => {
        if (tf.file.name === fileName) {
          const isStarting = status === 'sending' && tf.status !== 'sending';
          return { 
            ...tf, 
            status, 
            startTime: isStarting ? Date.now() : tf.startTime,
            // Reset speed if transfer is not active
            speed: status !== 'sending' ? 0 : tf.speed,
          };
        }
        return tf;
      }),
    })),
  removeFile: (fileName: string) =>
    set((state) => ({
      files: state.files.filter((tf) => tf.file.name !== fileName),
    })),
  clearFiles: () => set({ files: [] }),

  // Placeholder functions for checksums and resume
  startReceiving: (fileName: string) => {
    // Logic to prepare for receiving a file, e.g., create placeholder
  },
  endReceiving: (fileName: string) => {
    // Logic to finalize a received file, e.g., verify checksum
  },
}));
