'use client';
import { create } from 'zustand';
import Peer, { Instance, SignalData } from 'simple-peer';
import { useTransferStore } from '@/core/transfer';
import { Peer as PeerInfo, usePeerManagerStore } from '@/core/peer-manager';
import { useToast } from '@/hooks/use-toast';
import { addChunk, getFileChunks, getReceivedChunkIndexes, clearFileChunks } from '@/core/db';

export type PeerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Define a structured message type for communication
export type PeerMessage = 
  | { type: 'handshake'; payload: { message: string, peerId: string } }
  | { type: 'metadata'; payload: { name: string; size: number; type: string; checksum: string; } }
  | { type: 'chunk'; payload: { name: string; chunk: ArrayBuffer; chunkIndex: number; totalChunks: number; } }
  | { type: 'transfer-complete'; payload: { name: string; } }
  | { type: 'transfer-verified'; payload: { name: string; } }
  | { type: 'progress'; payload: { name: string; progress: number; } }
  | { type: 'resume-request'; payload: { name: string; receivedChunks: number[] } }
  | { type: 'resume-accepted'; payload: { name: string; startChunk: number } }
  | { type: 'resume-denied'; payload: { name: string; } };


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
const receivingFiles: { [fileName: string]: { chunks: (ArrayBuffer | undefined)[], type: string, receivedSize: number, totalSize: number, checksum: string } } = {};

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
        const { updateFileProgress, updateFileStatus, calculateFileChecksum, startReceivingFile, getFile } = useTransferStore.getState();
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

            const handleReceive = async () => {
                const receivedChunks = await getReceivedChunkIndexes(name);
                if (receivedChunks.length > 0) {
                    console.log(`Found ${receivedChunks.length} existing chunks for ${name}. Requesting resume.`);
                    updateFileStatus(name, 'resuming', peerId);
                    get().send({ type: 'resume-request', payload: { name, receivedChunks } });
                } else {
                    console.log(`No existing chunks for ${name}. Starting new download.`);
                    startReceivingFile({ name, size, type, checksum, peerId });
                }
            }

            const peer = getPeer(peerId);
            if(peer?.trusted) {
                toast({ title: `Incoming transfer from ${peer.name}`, description: `Auto-accepting transfer for ${name}`})
                await handleReceive();
            } else {
                 toast({
                    title: 'Incoming File Transfer',
                    description: `${peer?.name || 'A peer'} wants to send you "${name}". This would normally require user acceptance.`,
                    duration: 10000,
                });
                 // For now, auto-accepting for demonstration.
                await handleReceive();
            }
            break;
          }
            
          case 'chunk': {
            const { name, chunk, chunkIndex, totalChunks } = message.payload;
            const transferFile = getFile(name);

            if (transferFile) {
              await addChunk(name, chunkIndex, chunk);

              const allChunkIndexes = await getReceivedChunkIndexes(name);
              let receivedSize = 0;
              for(const index of allChunkIndexes) {
                  // This is a rough estimation of received size, not perfectly accurate
                  // as chunks might vary slightly in size.
                  receivedSize += transferFile.file.size / totalChunks;
              }

              updateFileProgress(name, receivedSize);

              // Check if all chunks are received
              if (allChunkIndexes.length === totalChunks) {
                 updateFileStatus(name, 'verifying', get().activePeer?.id);
                 const chunksFromDb = await getFileChunks(name, totalChunks);
                 const validChunks = chunksFromDb.filter((c): c is ArrayBuffer => c !== undefined);

                 if (validChunks.length !== totalChunks) {
                     console.error(`DB consistency error for ${name}. Expected ${totalChunks} chunks, got ${validChunks.length}`);
                     updateFileStatus(name, 'error', get().activePeer?.id);
                     toast({ variant: 'destructive', title: "Transfer Failed", description: `Could not retrieve all file parts for ${name}.` });
                     await clearFileChunks(name); // Clean up inconsistent state
                     return;
                 }

                 const fileBlob = new Blob(validChunks, { type: transferFile.file.type });
                 
                 const receivedChecksum = await calculateFileChecksum(fileBlob);
                 
                 if (receivedChecksum === transferFile.checksum) {
                    updateFileStatus(name, 'complete', get().activePeer?.id);
                    get().send({ type: 'transfer-verified', payload: { name } });
                    toast({ title: "Transfer Complete", description: `Successfully received and verified ${name}.` });
                 } else {
                    console.error(`Checksum mismatch for ${name}`);
                    updateFileStatus(name, 'error', get().activePeer?.id);
                    toast({ variant: 'destructive', title: "Transfer Failed", description: `Checksum verification failed for ${name}.` });
                    await clearFileChunks(name); // Clean up bad data
                 }
              }
            }
            break;
          }
          case 'resume-denied': {
             const { name } = message.payload;
             console.log(`Resume denied for ${name}. Starting from scratch.`);
             await clearFileChunks(name);
             const file = getFile(name);
             if (file && file.peerId) {
                startReceivingFile({ name, size: file.file.size, type: file.file.type, checksum: file.checksum!, peerId: file.peerId });
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