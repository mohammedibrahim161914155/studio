import { create } from 'zustand';

export type TransferFile = {
  file: File;
  progress: number;
  status: 'pending' | 'sending' | 'paused' | 'complete' | 'error' | 'verifying';
  speed: number; // in bytes per second
  checksum?: string;
  lastUpdateTime: number;
  lastSentBytes: number;
};

type TransferState = {
  files: TransferFile[];
  addFiles: (files: File[]) => void;
  updateFileProgress: (fileName: string, sentBytes: number) => void;
  updateFileStatus: (fileName: string, status: TransferFile['status']) => void;
  setFileChecksum: (fileName: string, checksum: string) => void;
  removeFile: (fileName: string) => void;
  clearFiles: () => void;
  calculateFileChecksum: (file: File | Blob) => Promise<string>;
  getFile: (fileName: string) => TransferFile | undefined;
};

// Helper to calculate SHA-256 checksum
const calculateChecksum = async (file: File | Blob): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
          lastUpdateTime: 0,
          lastSentBytes: 0,
        }));
      return { files: [...state.files, ...newTransferFiles] };
    }),
  updateFileProgress: (fileName: string, sentBytes: number) =>
    set((state) => {
      const now = Date.now();
      return {
        files: state.files.map((tf) => {
          if (tf.file.name === fileName) {
            const progress = Math.round((sentBytes / tf.file.size) * 100);
            const timeDiff = now - tf.lastUpdateTime;
            let speed = tf.speed;
            // Calculate speed only if time diff is meaningful to avoid Infinity
            if (timeDiff > 100) {
                 const bytesDiff = sentBytes - tf.lastSentBytes;
                 speed = bytesDiff / (timeDiff / 1000); // bytes per second
            }

            return { 
              ...tf, 
              progress,
              speed: speed > 0 ? speed : tf.speed, // Keep last known speed if current is 0
              lastUpdateTime: now,
              lastSentBytes: sentBytes,
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
            const isFinished = status === 'complete' || status === 'error';
          return { 
            ...tf, 
            status, 
            speed: isFinished ? 0 : tf.speed,
          };
        }
        return tf;
      }),
    })),
  setFileChecksum: (fileName: string, checksum: string) =>
    set((state) => ({
        files: state.files.map((tf) => 
            tf.file.name === fileName ? { ...tf, checksum } : tf
        ),
    })),
  removeFile: (fileName: string) =>
    set((state) => ({
      files: state.files.filter((tf) => tf.file.name !== fileName),
    })),
  clearFiles: () => set({ files: [] }),
  calculateFileChecksum: async (file: File | Blob) => {
    return calculateChecksum(file);
  },
  getFile: (fileName: string) => {
    return get().files.find(tf => tf.file.name === fileName);
  }
}));
