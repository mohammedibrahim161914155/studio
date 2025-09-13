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
                    // We start receiving so the UI updates, but also send a resume request.
                    startReceivingFile({ name, size, type, checksum, peerId });
                    get().send({ type: 'resume-request', payload: { name, receivedChunks } });
                } else {
                    console.log(`No existing chunks for ${name}. Starting new download.`);
                    startReceivingFile({ name, size, type, checksum, peerId });
                }
            }

            const peer = getPeer(peerId);
            if(peer?.trusted) {
                await handleReceive();
            } else {
                 toast({
                    title: 'Incoming File Transfer',
                    description: `${peer?.name || 'A peer'} wants to send you "${name}". This would normally require user acceptance. For now, it is auto-accepted.`,
                    duration: 10000,
                });
                await handleReceive();
            }
            break;
          }
            
          case 'chunk': {
            const { name, chunk, chunkIndex, totalChunks } = message.payload;
            const transferFile = getFile(name);

            if (transferFile && transferFile.status !== 'complete' && transferFile.status !== 'error') {
              try {
                await addChunk(name, chunkIndex, chunk);
              } catch (error) {
                console.error(`Failed to store chunk ${chunkIndex} for ${name}.`, error);
                updateFileStatus(name, 'error', get().activePeer?.id);
                toast({ variant: 'destructive', title: "Transfer Failed", description: `Could not save file part for ${name}. Your storage may be full.` });
                await clearFileChunks(name);
                return;
              }

              const allChunkIndexes = await getReceivedChunkIndexes(name);

              // Hardening: If DB was cleared mid-transfer, chunk indexes won't match. Reset and re-request.
              if (chunkIndex > 0 && allChunkIndexes.length <= chunkIndex) {
                 console.warn(`Inconsistency detected for ${name}. DB may have been cleared. Resetting transfer.`);
                 updateFileStatus(name, 'error', get().activePeer?.id);
                 await clearFileChunks(name);
                 toast({ variant: 'destructive', title: 'Transfer Error', description: `Data for ${name} became corrupted. Retrying...` });
                 // Request a full restart by sending a resume request with no chunks
                 get().send({ type: 'resume-request', payload: { name, receivedChunks: [] } });
                 return;
              }
              
              const receivedSize = allChunkIndexes.reduce((acc, index) => {
                  // A rough estimation, assuming all chunks are roughly equal.
                  const estimatedChunkSize = transferFile.file.size / totalChunks;
                  return acc + estimatedChunkSize;
              }, 0);
              
              updateFileProgress(name, receivedSize);

              // Check if all chunks are received
              if (allChunkIndexes.length === totalChunks) {
                 updateFileStatus(name, 'verifying', get().activePeer?.id);
                 const chunksFromDb = await getFileChunks(name, totalChunks);
                 const validChunks = chunksFromDb.filter((c): c is ArrayBuffer => c !== undefined);

                 if (validChunks.length !== totalChunks) {
                     console.error(`DB consistency error for ${name}. Expected ${totalChunks} chunks, got ${validChunks.length}. Retrying.`);
                     updateFileStatus(name, 'error', get().activePeer?.id);
                     await clearFileChunks(name);
                     get().send({ type: 'resume-request', payload: { name, receivedChunks: [] } });
                     return;
                 }

                 const fileBlob = new Blob(validChunks, { type: transferFile.file.type });
                 
                 const receivedChecksum = await calculateFileChecksum(fileBlob);
                 
                 if (receivedChecksum === transferFile.checksum) {
                    updateFileStatus(name, 'complete', get().activePeer?.id);
                    get().send({ type: 'transfer-verified', payload: { name } });
                    toast({ title: "Transfer Complete", description: `Successfully received and verified ${name}.` });
                 } else {
                    console.error(`Checksum mismatch for ${name}. Retrying file.`);
                    updateFileStatus(name, 'error', get().activePeer?.id);
                    toast({ variant: 'destructive', title: "Transfer Failed", description: `Data for ${name} was corrupt. Retrying...` });
                    await clearFileChunks(name); // Clean up bad data
                    get().send({ type: 'resume-request', payload: { name, receivedChunks: [] } });
                 }
              }
            }
            break;
          }
          case 'resume-request': {
             const { name, receivedChunks } = message.payload;
             const transferFile = getFile(name);
             if (transferFile && transferFile.direction === 'sent') {
                const totalChunks = Math.ceil(transferFile.file.size / (64 * 1024));
                const allChunks = Array.from({ length: totalChunks }, (_, i) => i);
                const missingChunks = allChunks.filter(i => !receivedChunks.includes(i));
                
                if (missingChunks.length > 0) {
                  const startChunk = missingChunks[0];
                  console.log(`Accepting resume request for ${name}, starting at chunk ${startChunk}`);
                  send({ type: 'resume-accepted', payload: { name, startChunk } });
                  // The sendFile function in header will be triggered by this
                } else {
                  console.log(`Resume requested for ${name}, but no chunks are missing.`);
                  // This could happen if verification failed on their end. We can just resend completion.
                  if(transferFile.status === 'complete') {
                    send({ type: 'transfer-verified', payload: { name } });
                  }
                }
             } else {
                  console.log(`Denied resume for ${name}, file not found or direction mismatch.`);
                  send({ type: 'resume-denied', payload: { name } });
             }
             break;
          }
          case 'resume-denied': {
             const { name } = message.payload;
             console.log(`Resume denied for ${name}. Starting from scratch.`);
             await clearFileChunks(name);
             const file = getFile(name);
             if (file && file.peerId) {
                // Re-initiate the file receiving process
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
