'use client';
import { create } from 'zustand';
import Peer, { Instance, SignalData } from 'simple-peer';
import { useTransferStore } from '@/core/transfer';
import { Peer as PeerInfo, usePeerManagerStore } from '@/core/peer-manager';
import { useToast } from '@/hooks/use-toast';

export type PeerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Define a structured message type for communication
export type PeerMessage = 
  | { type: 'handshake'; payload: { message: string, peerId: string } }
  | { type: 'metadata'; payload: { name: string; size: number; type: string; checksum: string; } }
  | { type: 'chunk'; payload: { name: string; chunk: ArrayBuffer; chunkIndex: number; totalChunks: number; } }
  | { type: 'transfer-complete'; payload: { name: string; } }
  | { type: 'transfer-verified'; payload: { name: string; } }
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
  connectFromOffer: (offer: SignalData, fromPeerId?: string) => void;
  connectToPeer: (peerInfo: PeerInfo) => void;
  currentOffer: SignalData | null;
  setCurrentOffer: (offer: SignalData | null) => void;
};

// Store for incoming file chunks
const receivingFiles: { [fileName: string]: { chunks: ArrayBuffer[], type: string, receivedSize: number, totalSize: number, checksum: string } } = {};

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
      const {addPeer, updatePeerSignal} = usePeerManagerStore.getState();
      const peerId = get().activePeer?.id || `peer_${Date.now()}`;
      
      if (data.type === 'offer') {
          set({ currentOffer: data });
          if(!get().activePeer) {
            const newPeerInfo = {id: peerId, name: 'New Peer', offer: data, status: 'connecting' as const};
            addPeer(newPeerInfo);
            set({activePeer: newPeerInfo as PeerInfo});
          }
      } else if (data.type === 'answer') {
         if (get().activePeer) {
           updatePeerSignal(get().activePeer!.id, data);
         }
      }
    });

    newPeer.on('connect', () => {
      set({ status: 'connected' });
      if (get().activePeer) {
        usePeerManagerStore.getState().updatePeerStatus(get().activePeer!.id, 'connected');
      }
      get().send({ type: 'handshake', payload: { message: 'Hello!', peerId: usePeerManagerStore.getState().myId } });
    });

    newPeer.on('data', async (data) => {
      try {
        const message: PeerMessage = JSON.parse(data.toString());
        const { updateFileProgress, updateFileStatus, calculateFileChecksum, startReceivingFile } = useTransferStore.getState();
        const { updatePeerName, getPeer } = usePeerManagerStore.getState();
        const { toast } = useToast();

        switch (message.type) {
          case 'handshake': {
            const { peerId } = message.payload;
            if (get().activePeer) {
              updatePeerName(get().activePeer!.id, peerId)
            }
            break;
          }
          case 'metadata': {
            console.log('Received metadata for:', message.payload.name);
            const { name, size, type, checksum } = message.payload;
            const peerId = get().activePeer?.id;

            if (!peerId) return;

            const peer = getPeer(peerId);
            const handleReceive = () => {
                receivingFiles[name] = { chunks: [], type, receivedSize: 0, totalSize: size, checksum };
                startReceivingFile({ name, size, type, checksum, peerId });
            }

            if(peer?.trusted) {
                toast({ title: `Incoming transfer from ${peer.name}`, description: `Auto-accepting trusted transfer for ${name}`})
                handleReceive();
            } else {
                toast({
                    title: 'Incoming File Transfer',
                    description: `${peer?.name || 'A peer'} wants to send you "${name}". Since this is not a trusted peer, you would need a UI to accept this.`,
                    duration: 30000,
                })
                 // For now, auto-accepting for demonstration until UI is properly wired.
                handleReceive();
            }
            break;
          }
            
          case 'chunk': {
            const { name, chunk, chunkIndex, totalChunks } = message.payload;
            if (receivingFiles[name]) {
              // Directly use the buffer from the message
              const arrayBuffer = chunk;
              receivingFiles[name].chunks[chunkIndex] = arrayBuffer;
              receivingFiles[name].receivedSize += arrayBuffer.byteLength;

              updateFileProgress(name, receivingFiles[name].receivedSize);

              // Check if all chunks are received
              const receivedChunksCount = Object.values(receivingFiles[name].chunks).filter(Boolean).length;
              if (receivedChunksCount === totalChunks) {
                 const fileBlob = new Blob(receivingFiles[name].chunks, { type: receivingFiles[name].type });
                 
                 updateFileStatus(name, 'verifying', get().activePeer?.id);
                 const receivedChecksum = await calculateFileChecksum(fileBlob);
                 
                 if (receivedChecksum === receivingFiles[name].checksum) {
                    updateFileStatus(name, 'complete', get().activePeer?.id);
                    get().send({ type: 'transfer-verified', payload: { name } });
                    toast({ title: "Transfer Complete", description: `Successfully received and verified ${name}.` });
                 } else {
                    console.error(`Checksum mismatch for ${name}`);
                    updateFileStatus(name, 'error', get().activePeer?.id);
                    toast({ variant: 'destructive', title: "Transfer Failed", description: `Checksum verification failed for ${name}.` });
                 }

                 delete receivingFiles[name];
              }
            }
            break;
          }

          case 'transfer-verified':
            console.log('Transfer verified for:', message.payload.name);
            updateFileStatus(message.payload.name, 'complete', get().activePeer?.id);
            toast({ title: "Transfer Complete", description: `${message.payload.name} was successfully sent and verified by the peer.` });
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
      set({ status: 'disconnected', peer: null, activePeer: null, currentOffer: null, isInitiator: false });
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
        get().peer?.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send data, peer is not connected.');
    }
  },
  
  connectToPeer: (peerInfo) => {
    if (!peerInfo.offer) return;
    const peer = get().createPeer(false, peerInfo);
    peer.signal(peerInfo.offer);
  },

  connectFromOffer: (offer, fromPeerId) => {
    const peerId = fromPeerId || `peer_${Date.now()}`;
    const { addPeer } = usePeerManagerStore.getState();
    const newPeerInfo = { id: peerId, name: 'New Peer', offer, status: 'connecting' as const };
    addPeer(newPeerInfo);

    const peer = get().createPeer(false, newPeerInfo as PeerInfo);
    peer.signal(offer); // This will trigger our peer to generate an answer
  }
}));
