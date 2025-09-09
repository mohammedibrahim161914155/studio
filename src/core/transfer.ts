import { create } from 'zustand';

export type TransferFile = {
  file: File;
  progress: number;
  status: 'pending' | 'sending' | 'paused' | 'complete' | 'error';
};

type TransferState = {
  files: TransferFile[];
  addFiles: (files: File[]) => void;
  updateFileProgress: (fileName: string, progress: number) => void;
  updateFileStatus: (fileName: string, status: TransferFile['status']) => void;
  removeFile: (fileName: string) => void;
  clearFiles: () => void;
};

export const useTransferStore = create<TransferState>((set) => ({
  files: [],
  addFiles: (newFiles: File[]) =>
    set((state) => {
      const newTransferFiles: TransferFile[] = newFiles
        .filter(f => !state.files.some(tf => tf.file.name === f.name)) // Avoid duplicates
        .map((file) => ({
          file,
          progress: 0,
          status: 'pending',
        }));
      return { files: [...state.files, ...newTransferFiles] };
    }),
  updateFileProgress: (fileName: string, progress: number) =>
    set((state) => ({
      files: state.files.map((tf) =>
        tf.file.name === fileName ? { ...tf, progress } : tf
      ),
    })),
  updateFileStatus: (fileName: string, status: TransferFile['status']) =>
    set((state) => ({
      files: state.files.map((tf) =>
        tf.file.name === fileName ? { ...tf, status } : tf
      ),
    })),
  removeFile: (fileName: string) =>
    set((state) => ({
      files: state.files.filter((tf) => tf.file.name !== fileName),
    })),
  clearFiles: () => set({ files: [] }),
}));
