'use client';
import { create } from 'zustand';
import Peer, { Instance, SignalData } from 'simple-peer';
import { useTransferStore } from '@/core/transfer';
import { Peer as PeerInfo, usePeerManagerStore } from '@/core/peer-manager';

export type PeerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Define a structured message type for communication
export type PeerMessage = 
  | { type: 'handshake'; payload: { message: string, peerId: string } }
  | { type: 'metadata'; payload: { name: string; size: number; type: string; } }
  | { type: 'chunk'; payload: { name: string; chunk: ArrayBuffer; chunkIndex: number; totalChunks: number; } }
  | { type: 'transfer-complete'; payload: { name: string; } }
  | { type: 'progress'; payload: { name: string; progress: number; } };


type PeerState = {
  peer: Instance | null;
  status: PeerStatus;
  isInitiator: boolean;
  activePeer: PeerInfo | null;
  createPeer: (initiator: boolean, targetPeer?: PeerInfo) => Instance;
  destroyPeer: () => void;
  signal: (data: SignalData) => void;
  send: (data: PeerMessage) => void;
  connectToPeer: (peerInfo: PeerInfo) => void;
  handleIncomingOffer: (offer: SignalData, fromPeerId?: string) => void;
  currentOffer: SignalData | null;
  setCurrentOffer: (offer: SignalData | null) => void;
};

// Store for incoming file chunks
const receivingFiles: { [fileName: string]: { chunks: ArrayBuffer[], type: string, receivedSize: number, totalSize: number } } = {};

export const usePeerStore = create<PeerState>((set, get) => ({
  peer: null,
  status: 'disconnected',
  isInitiator: false,
  activePeer: null,
  currentOffer: null,
  setCurrentOffer: (offer) => set({ currentOffer: offer }),

  createPeer: (initiator, targetPeer) => {
    get().destroyPeer(); // Clean up existing peer if any
    set({ isInitiator: initiator, status: 'connecting', activePeer: targetPeer || null });

    const newPeer = new Peer({
      initiator: initiator,
      trickle: true, 
    });
    
    set({ peer: newPeer });

    newPeer.on('signal', (data) => {
      // For initiator, this is the offer. For receiver, this is the answer.
      const {addPeer, updatePeerSignal} = usePeerManagerStore.getState();
      const newPeerId = get().activePeer?.id || `peer_${Date.now()}`;

      if (data.type === 'offer') {
          set({ currentOffer: data });
          if(!get().activePeer) {
            addPeer({id: newPeerId, name: 'New Peer', offer: data, status: 'connecting'});
            set({activePeer: {id: newPeerId, name: 'New Peer', offer: data, status: 'connecting'}});
          }
      } else if (data.type === 'answer') {
          // Receiver has generated an answer, it needs to be sent back to the initiator
          // This part is handled by UI (copy/paste)
      }
    });

    newPeer.on('connect', () => {
      set({ status: 'connected' });
      usePeerManagerStore.getState().updatePeerStatus(get().activePeer!.id, 'connected');
      get().send({ type: 'handshake', payload: { message: 'Hello!', peerId: usePeerManagerStore.getState().myId } });
    });

    newPeer.on('data', (data) => {
      try {
        const message: PeerMessage = JSON.parse(data.toString());
        const { addFiles, updateFileProgress, updateFileStatus, startReceiving, endReceiving } = useTransferStore.getState();

        switch (message.type) {
          case 'metadata':
            console.log('Received metadata for:', message.payload.name);
            const { name, size, type } = message.payload;
            receivingFiles[name] = { chunks: [], type, receivedSize: 0, totalSize: size };
            const placeholderFile = new File([], name, { type });
            addFiles([placeholderFile]);
            updateFileStatus(name, 'sending');
            startReceiving(name);
            break;
            
          case 'chunk': {
            const { name, chunk, chunkIndex, totalChunks } = message.payload;
            if (receivingFiles[name]) {
              const chunkBuffer = new Uint8Array(chunk).buffer;
              receivingFiles[name].chunks[chunkIndex] = chunkBuffer;
              receivingFiles[name].receivedSize += chunkBuffer.byteLength;

              const progress = Math.round((receivingFiles[name].receivedSize / receivingFiles[name].totalSize) * 100);
              updateFileProgress(name, progress);

              if (Object.keys(receivingFiles[name].chunks).length === totalChunks) {
                 const fileBlob = new Blob(receivingFiles[name].chunks, { type: receivingFiles[name].type });
                 
                 // Clean up and finalize
                 delete receivingFiles[name];
                 endReceiving(name);
                 updateFileStatus(name, 'complete');
                 get().send({ type: 'transfer-complete', payload: { name } });
              }
            }
            break;
          }

          case 'transfer-complete':
            console.log('Transfer complete for:', message.payload.name);
            updateFileStatus(message.payload.name, 'complete');
            break;
            
          case 'progress':
            updateFileProgress(message.payload.name, message.payload.progress);
            break;
        }
      } catch (error) {
        console.error("Error processing received data:", error, data);
      }
    });

    newPeer.on('close', () => {
      const activePeerId = get().activePeer?.id;
      if (activePeerId) {
        usePeerManagerStore.getState().updatePeerStatus(activePeerId, 'disconnected');
      }
      set({ status: 'disconnected', peer: null, activePeer: null });
    });

    newPeer.on('error', (err) => {
      console.error('Peer error:', err);
      const activePeerId = get().activePeer?.id;
      if (activePeerId) {
        usePeerManagerStore.getState().updatePeerStatus(activePeerId, 'error');
      }
      set({ status: 'error' });
      get().destroyPeer();
    });
    
    return newPeer;
  },

  destroyPeer: () => {
    get().peer?.destroy();
    if(get().activePeer) {
        usePeerManagerStore.getState().updatePeerStatus(get().activePeer!.id, 'disconnected');
    }
    set({ peer: null, status: 'disconnected', isInitiator: false, activePeer: null, currentOffer: null });
  },

  signal: (data) => {
    get().peer?.signal(data);
  },

  send: (message) => {
    if (get().status === 'connected') {
      // To handle ArrayBuffer, we need to send it directly for binary data
      // and stringify for metadata. simple-peer supports this mixed-type.
      if (message.type === 'chunk') {
        // This is a simplified approach. A more robust solution might use a buffer
        // with a header to indicate message type. For simple-peer, we can send JSON
        // for metadata and ArrayBuffer for chunks.
        get().peer?.send(JSON.stringify({ type: message.type, payload: { name: message.payload.name, chunkIndex: message.payload.chunkIndex, totalChunks: message.payload.totalChunks }}));
        get().peer?.send(message.payload.chunk);
      } else {
        get().peer?.send(JSON.stringify(message));
      }
    } else {
      console.warn('Cannot send data, peer is not connected.');
    }
  },
  
  connectToPeer: (peerInfo) => {
    if (!peerInfo.offer) return;
    const peer = get().createPeer(false, peerInfo);
    peer.signal(peerInfo.offer); // Signal the offer to our newly created peer
    
    peer.on('signal', (answer) => {
        if(answer.type === 'answer') {
            // Now we need to get this `answer` signal back to the initiating peer.
            // In a real app, this would be via a signaling server.
            // Here, we'll have to rely on the user to copy-paste it.
            usePeerManagerStore.getState().updatePeerSignal(peerInfo.id, answer);
        }
    });
  },

  handleIncomingOffer: (offer, fromPeerId) => {
    const peerId = fromPeerId || `peer_${Date.now()}`;
    const { addPeer, updatePeerSignal } = usePeerManagerStore.getState();
    addPeer({ id: peerId, name: 'New Peer', offer, status: 'connecting' });

    const peer = get().createPeer(false, {id: peerId, name: 'New Peer', offer, status: 'connecting'});
    peer.signal(offer); // This will trigger our peer to generate an answer
    
    peer.on('signal', (answer) => {
        if (answer.type === 'answer') {
            updatePeerSignal(peerId, answer);
        }
    });
  }
}));
