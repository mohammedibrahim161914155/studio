import { create } from 'zustand';
import { useLogStore } from './transfer-log';
import { clearFileChunks, getFileChunks } from './db';

export type TransferFile = {
  file: File;
  progress: number;
  status: 'pending' | 'sending' | 'paused' | 'complete' | 'error' | 'verifying' | 'resuming';
  speed: number; // in bytes per second
  checksum?: string;
  lastUpdateTime: number;
  lastSentBytes: number;
  peerId?: string; // Which peer this file is going to/from
  direction: 'sent' | 'received';
};

type TransferState = {
  files: TransferFile[];
  addFiles: (files: File[]) => void;
  updateFileProgress: (fileName: string, sentBytes: number) => void;
  updateFileStatus: (fileName: string, status: TransferFile['status'], peerId?: string) => void;
  setFileChecksum: (fileName: string, checksum: string) => void;
  removeFile: (fileName: string) => void;
  clearFiles: () => void;
  startReceivingFile: (metadata: {name: string, size: number, type: string, checksum: string, peerId: string}) => void;
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
          direction: 'sent'
        }));
      return { files: [...state.files, ...newTransferFiles] };
    }),
  startReceivingFile: (metadata) => {
    const { name, size, type, checksum, peerId } = metadata;
    const placeholderFile = new File([], name, { type });
    const newTransferFile: TransferFile = {
        file: placeholderFile,
        progress: 0,
        status: 'sending',
        speed: 0,
        lastUpdateTime: 0,
        lastSentBytes: 0,
        checksum,
        peerId,
        direction: 'received',
    };
    set(state => ({
        files: [...state.files.filter(f => f.file.name !== name), newTransferFile]
    }));
  },
  updateFileProgress: (fileName: string, sentBytes: number) =>
    set((state) => {
      const now = Date.now();
      return {
        files: state.files.map((tf) => {
          if (tf.file.name === fileName) {
            const progress = tf.file.size > 0 ? Math.round((sentBytes / tf.file.size) * 100) : 0;
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
              speed: speed >= 0 ? speed : tf.speed, // Keep last known speed if current is 0
              lastUpdateTime: now,
              lastSentBytes: sentBytes,
            };
          }
          return tf;
        }),
      }
    }),
  updateFileStatus: (fileName: string, status: TransferFile['status'], peerId) =>
    set((state) => {
      const { addLog } = useLogStore.getState();
      const files = state.files.map((tf) => {
        if (tf.file.name === fileName) {
          const isFinished = status === 'complete' || status === 'error';
          const updatedTf = {
            ...tf, 
            status, 
            peerId: peerId || tf.peerId,
            speed: isFinished ? 0 : tf.speed,
          };
          if (isFinished) {
            addLog({
              fileName: updatedTf.file.name,
              fileSize: updatedTf.file.size,
              fileType: updatedTf.file.type,
              peerId: updatedTf.peerId || 'Unknown Peer',
              status: updatedTf.status as 'complete' | 'error',
              timestamp: new Date(),
              direction: updatedTf.direction
            });

            if (updatedTf.direction === 'received' && status === 'complete') {
                // Once transfer is complete, we don't need the chunks anymore.
                clearFileChunks(fileName);
            }
          }
          return updatedTf;
        }
        return tf;
      });
      return { files };
    }),
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