import { create } from 'zustand';

export type TransferFile = {
  file: File;
  progress: number;
  status: 'pending' | 'sending' | 'paused' | 'complete' | 'error' | 'verifying';
  speed: number; // in bytes per second
  checksum?: string;
};

type TransferState = {
  files: TransferFile[];
  addFiles: (files: File[]) => void;
  updateFileProgress: (fileName: string, progress: number) => void;
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
        }));
      return { files: [...state.files, ...newTransferFiles] };
    }),
  updateFileProgress: (fileName: string, progress: number) =>
    set((state) => {
      // This is a simplified speed calculation. For more accuracy, a moving average would be better.
      const now = Date.now();
      return {
        files: state.files.map((tf) => {
          if (tf.file.name === fileName) {
            return { 
              ...tf, 
              progress,
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
          return { 
            ...tf, 
            status, 
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
