'use client';
import { create } from 'zustand';
import Peer, { Instance, SignalData } from 'simple-peer';
import { useTransferStore } from '@/core/transfer';
import { Peer as PeerInfo, usePeerManagerStore, useKeyStore } from '@/core/peer-manager';
import { useToast } from '@/hooks/use-toast';
import { addChunk, getFileChunks, getReceivedChunkIndexes, clearFileChunks } from '@/core/db';

export type PeerStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'verifying';

// Define a structured message type for communication
export type PeerMessage = 
  | { type: 'handshake'; payload: { peerId: string } }
  | { type: 'key-exchange'; payload: { publicKey: JsonWebKey } }
  | { type: 'challenge-request'; payload: { nonce: string } }
  | { type: 'challenge-response'; payload: { nonce: string; signature: ArrayBuffer } }
  | { type: 'challenge-verified'; payload: {} }
  | { type: 'metadata'; payload: { name: string; size: number; type: string; checksum: string; } }
  | { type: 'chunk'; payload: { name: string; chunk: ArrayBuffer; chunkIndex: number; totalChunks: number; } }
  | { type: 'transfer-complete'; payload: { name: string; } }
  | { type: 'transfer-verified'; payload: { name: string; } }
  | { type: 'progress'; payload: { name: string; progress: number; } }
  | { type: 'resume-request'; payload: { name:string; receivedChunks: number[] } }
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
      objectMode: true,
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

    newPeer.on('connect', async () => {
      const { publicKey } = useKeyStore.getState();
      const peerInfo = get().activePeer;

      if (peerInfo?.trusted && peerInfo.publicKey) {
          console.log("Attempting cryptographic verification with trusted peer...");
          set({ status: 'verifying' });
          if (get().activePeer) {
            usePeerManagerStore.getState().updatePeerStatus(get().activePeer!.id, 'verifying');
          }
          const nonce = crypto.randomUUID();
          get().send({ type: 'challenge-request', payload: { nonce } });

      } else {
          set({ status: 'connected' });
          if (get().activePeer) {
            usePeerManagerStore.getState().updatePeerStatus(get().activePeer!.id, 'connected');
          }
          if (publicKey) {
            get().send({ type: 'key-exchange', payload: { publicKey } });
          }
      }
    });

    newPeer.on('data', async (data) => {
      try {
        const message: PeerMessage = JSON.parse(data.toString());

        const { updateFileProgress, updateFileStatus, calculateFileChecksum, startReceivingFile, getFile } = useTransferStore.getState();
        const { updatePeerName, updatePeerPublicKey, getPeer } = usePeerManagerStore.getState();
        const { signData, verifySignature, publicKey: myPublicKey } = useKeyStore.getState();
        const { toast } = useToast();

        switch (message.type) {
          case 'handshake': {
            const { peerId } = message.payload;
            if (get().activePeer) {
              updatePeerName(get().activePeer!.id, peerId)
            }
            break;
          }
          case 'key-exchange': {
            const { publicKey } = message.payload;
            const peerId = get().activePeer?.id;
            if (peerId) {
                updatePeerPublicKey(peerId, publicKey);
                // Respond with our own public key if we haven't already
                if (myPublicKey) {
                    get().send({ type: 'key-exchange', payload: { publicKey: myPublicKey } });
                }
            }
            break;
          }
          case 'challenge-request': {
             const { nonce } = message.payload;
             const signature = await signData(nonce);
             get().send({ type: 'challenge-response', payload: { nonce, signature } });
             break;
          }
          case 'challenge-response': {
            const { nonce, signature } = message.payload;
            const peerInfo = get().activePeer;
            if (peerInfo?.publicKey) {
                const isValid = await verifySignature(peerInfo.publicKey, signature, nonce);
                if (isValid) {
                    console.log("Cryptographic verification successful!");
                    get().send({ type: 'challenge-verified', payload: {} });
                    set({ status: 'connected' });
                    usePeerManagerStore.getState().updatePeerStatus(peerInfo.id, 'connected');
                } else {
                    console.error("Cryptographic verification failed!");
                    toast({ variant: 'destructive', title: 'Connection Failed', description: 'Could not verify the identity of the trusted peer.' });
                    get().destroyPeer();
                }
            }
            break;
          }
           case 'challenge-verified': {
                console.log("Peer verified our challenge response.");
                const peerInfo = get().activePeer;
                if(peerInfo) {
                    set({ status: 'connected' });
                    usePeerManagerStore.getState().updatePeerStatus(peerInfo.id, 'connected');
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
            const { name, chunk: chunkData, chunkIndex, totalChunks } = message.payload;
            const chunk = new Uint8Array(Object.values(chunkData)).buffer;
            
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
              const receivedSize = allChunkIndexes.length * (transferFile.file.size / totalChunks);
              updateFileProgress(name, receivedSize);

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
                const totalChunks = Math.ceil(transferFile.file.size / (128 * 1024)); 
                const allChunks = Array.from({ length: totalChunks }, (_, i) => i);
                const missingChunks = allChunks.filter(i => !receivedChunks.includes(i));
                
                if (missingChunks.length > 0) {
                  const startChunk = missingChunks[0];
                  console.log(`Accepting resume request for ${name}, starting at chunk ${startChunk}`);
                  get().send({ type: 'resume-accepted', payload: { name, startChunk } });
                } else {
                  console.log(`Resume requested for ${name}, but no chunks are missing.`);
                  if(transferFile.status === 'complete') {
                    get().send({ type: 'transfer-verified', payload: { name } });
                  }
                }
             } else {
                  console.log(`Denied resume for ${name}, file not found or direction mismatch.`);
                  get().send({ type: 'resume-denied', payload: { name } });
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
    const peer = get().peer;
    // Allow sending messages during verification phase
    if (peer?.connected) {
        const messageString = JSON.stringify(message, (key, value) => {
          // Custom serializer for ArrayBuffer
          if (value instanceof ArrayBuffer) {
            return { type: 'Buffer', data: Array.from(new Uint8Array(value)) };
          }
          if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
             return new Uint8Array(value.data).buffer;
          }
          return value;
        });
        peer.send(messageString);
    } else {
      console.warn('Cannot send data, peer is not connected or ready.', {status: get().status, peer});
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
