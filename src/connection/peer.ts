'use client';
import { create } from 'zustand';
import Peer, { Instance, SignalData } from 'simple-peer';
import { useTransferStore } from '@/core/transfer';

type PeerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Define a structured message type for communication
export type PeerMessage = 
  | { type: 'handshake'; payload: { message: string } }
  | { type: 'metadata'; payload: { name: string; size: number; type: string; } }
  | { type: 'chunk'; payload: { name: string; chunk: ArrayBuffer; chunkIndex: number; totalChunks: number; } }
  | { type: 'transfer-complete'; payload: { name: string; } }
  | { type: 'progress'; payload: { name: string; progress: number; } };


type PeerState = {
  peer: Instance | null;
  status: PeerStatus;
  isInitiator: boolean;
  createPeer: (initiator: boolean) => void;
  destroyPeer: () => void;
  signal: (data: SignalData) => void;
  send: (data: PeerMessage) => void;
  connectFromOffer: (offer: SignalData) => void;
};

// Store for incoming file chunks
const receivingFiles: { [fileName: string]: ArrayBuffer[] } = {};

export const usePeerStore = create<PeerState>((set, get) => ({
  peer: null,
  status: 'disconnected',
  isInitiator: false,

  createPeer: (initiator) => {
    get().destroyPeer(); // Clean up existing peer if any
    set({ isInitiator: initiator, status: 'connecting' });

    const newPeer = new Peer({
      initiator: initiator,
      trickle: false, // For simplicity, we'll exchange signaling data all at once
    });

    newPeer.on('signal', (data) => {
      // This event fires with the signaling data that needs to be sent to the other peer
    });

    newPeer.on('connect', () => {
      set({ status: 'connected' });
      get().send({ type: 'handshake', payload: { message: 'Hello!' } });
    });

    newPeer.on('data', (data) => {
      try {
        const message: PeerMessage = JSON.parse(data.toString());
        const { addFiles, updateFileProgress, updateFileStatus } = useTransferStore.getState();

        switch (message.type) {
          case 'metadata':
            console.log('Received metadata for:', message.payload.name);
            receivingFiles[message.payload.name] = [];
            // Add a placeholder file to the receiver's transfer list
            const placeholderFile = new File([], message.payload.name, { type: message.payload.type });
            addFiles([placeholderFile]);
            updateFileStatus(message.payload.name, 'sending');
            break;
            
          case 'chunk':
            const { name, chunk, chunkIndex, totalChunks } = message.payload;
            if (receivingFiles[name]) {
              receivingFiles[name][chunkIndex] = chunk;
              const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
              updateFileProgress(name, progress);
              // Send progress back to the sender
              get().send({ type: 'progress', payload: { name, progress }});

              if (chunkIndex === totalChunks - 1) {
                 // All chunks received, assemble the file
                 const fileBlob = new Blob(receivingFiles[name], { type: useTransferStore.getState().files.find(f => f.file.name === name)?.file.type });
                 const receivedFile = new File([fileBlob], name);
                 
                 // Update the store with the "real" file
                 set(state => ({
                    files: state.files.map(tf => tf.file.name === name ? { ...tf, file: receivedFile, status: 'complete', progress: 100 } : tf)
                 }));
                 delete receivingFiles[name];
                 get().send({ type: 'transfer-complete', payload: { name } });
              }
            }
            break;

          case 'transfer-complete':
            console.log('Transfer complete for:', message.payload.name);
            updateFileStatus(message.payload.name, 'complete');
            break;
            
          case 'progress':
            // This is the sender receiving progress updates
            updateFileProgress(message.payload.name, message.payload.progress);
            break;
        }
      } catch (error) {
        console.error("Error processing received data:", error, data);
      }
    });

    newPeer.on('close', () => {
      set({ status: 'disconnected', peer: null });
    });

    newPeer.on('error', (err) => {
      console.error('Peer error:', err);
      set({ status: 'error' });
      get().destroyPeer();
    });

    set({ peer: newPeer });
  },

  destroyPeer: () => {
    get().peer?.destroy();
    set({ peer: null, status: 'disconnected', isInitiator: false });
  },

  signal: (data) => {
    get().peer?.signal(data);
  },

  send: (message) => {
    if (get().status === 'connected') {
      get().peer?.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send data, peer is not connected.');
    }
  },
  
  connectFromOffer: (offer) => {
    const { createPeer, signal } = get();
    createPeer(false); // The one connecting from an offer is not the initiator
    setTimeout(() => signal(offer), 100); // Allow peer to initialize
  }
}));
