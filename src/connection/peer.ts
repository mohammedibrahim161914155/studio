
'use client';
import { create } from 'zustand';
import Peer, { type Instance, type SignalData } from 'simple-peer';
import { useTransferStore } from '@/core/transfer';
import { type Peer as PeerInfo, usePeerManagerStore, useKeyStore } from '@/core/peer-manager';
import { useToast } from '@/hooks/use-toast';
import { addChunk, getReceivedChunkIndexes, clearFileChunks, getFileChunks } from '@/core/db';
import { useBenchmarkStore } from '@/core/benchmark';

export type PeerStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'verifying';

type JsonMessage = 
  | { type: 'handshake'; payload: { peerId: string } }
  | { type: 'key-exchange'; payload: { publicKey: JsonWebKey } }
  | { type: 'challenge-request'; payload: { nonce: string } }
  | { type: 'challenge-response'; payload: { nonce: string; signature: ArrayBuffer } }
  | { type: 'challenge-verified'; payload: {} }
  | { type: 'metadata'; payload: { name: string; size: number; type: string; checksum: string; } }
  | { type: 'transfer-complete'; payload: { name: string; } }
  | { type: 'transfer-verified'; payload: { name: string; } }
  | { type: 'progress'; payload: { name: string; progress: number; } }
  | { type: 'resume-request'; payload: { name:string; receivedChunks: number[] } }
  | { type: 'resume-accepted'; payload: { name: string; startChunk: number } }
  | { type: 'resume-denied'; payload: { name: string; } }
  | { type: 'benchmark-start'; payload: { runId: string, size: number, chunkSize: number } }
  | { type: 'benchmark-end'; payload: { runId: string } }
  | { type: 'benchmark-results'; payload: { runId: string, duration: number } };

type ChunkMessage = {
  name: string;
  chunk: ArrayBuffer;
  chunkIndex: number;
  totalChunks: number;
}

type BenchmarkChunkMessage = {
  runId: string;
  index: number;
  chunk: ArrayBuffer;
}


// A header byte to distinguish message types
const MessageTypeHeader = {
  JSON: 0x01,
  CHUNK: 0x02,
  BENCHMARK_CHUNK: 0x03,
};

type PeerState = {
  peer: Instance | null;
  status: PeerStatus;
  isInitiator: boolean;
  activePeer: PeerInfo | null;
  createPeer: (initiator: boolean, targetPeer?: PeerInfo) => Instance;
  createPeerAsInitiator: () => void;
  destroyPeer: () => void;
  signal: (data: SignalData) => void;
  sendJson: (data: JsonMessage) => void;
  sendChunk: (data: ChunkMessage) => void;
  sendBenchmarkChunk: (data: BenchmarkChunkMessage) => void;
  connectFromOffer: (offer: SignalData, fromPeerId?: string) => void;
  connectToPeer: (peerInfo: PeerInfo) => void;
  currentOffer: SignalData | null;
  currentAnswer: SignalData | null;
};

const setupPeerEvents = (peer: Instance, set: any, get: any) => {
    const { updatePeerName, updatePeerPublicKey, updatePeerSignal } = usePeerManagerStore.getState();
    const { addPeer } = usePeerManagerStore.getState();

    peer.on('signal', (data) => {
      const peerId = get().activePeer?.id || `peer_${Date.now()}`;
      
      if (data.type === 'offer') {
          set({ currentOffer: data, currentAnswer: null }); // Reset answer on new offer
          if(!get().activePeer || get().isInitiator) {
            const newPeerInfo = {id: peerId, name: 'New Peer', offer: data, status: 'connecting' as const};
            addPeer(newPeerInfo);
            set({activePeer: newPeerInfo as PeerInfo});
          }
      } else if (data.type === 'answer') {
         set({ currentAnswer: data });
         if (get().activePeer) {
           updatePeerSignal(get().activePeer!.id, data);
         }
      }
    });

    peer.on('connect', async () => {
      const { publicKey } = useKeyStore.getState();
      const peerInfo = get().activePeer;

      if (peerInfo?.trusted && peerInfo.publicKey) {
          console.log("Attempting cryptographic verification with trusted peer...");
          set({ status: 'verifying' });
          usePeerManagerStore.getState().updatePeerStatus(peerInfo.id, 'verifying');
          const nonce = crypto.randomUUID();
          get().sendJson({ type: 'challenge-request', payload: { nonce } });

      } else {
          set({ status: 'connected' });
          if (peerInfo) {
            usePeerManagerStore.getState().updatePeerStatus(peerInfo.id, 'connected');
          }
          if (publicKey) {
            get().sendJson({ type: 'key-exchange', payload: { publicKey } });
          }
      }
    });

    peer.on('data', async (data: ArrayBuffer) => {
        const header = new Uint8Array(data.slice(0, 1))[0];
        const body = data.slice(1);

        try {
            switch (header) {
                case MessageTypeHeader.JSON:
                    await handleJsonMessage(JSON.parse(new TextDecoder().decode(body)), get, set);
                    break;
                case MessageTypeHeader.CHUNK:
                    await handleChunkMessage(body);
                    break;
                case MessageTypeHeader.BENCHMARK_CHUNK:
                    handleBenchmarkChunkMessage(body);
                    break;
            }
        } catch (error) {
            console.error("Error processing received data:", error, data);
        }
    });

    peer.on('close', () => {
      const activePeerId = get().activePeer?.id;
      if (activePeerId) {
        usePeerManagerStore.getState().updatePeerStatus(activePeerId, 'disconnected');
      }
      set({ status: 'disconnected', peer: null, activePeer: null, currentAnswer: null, isInitiator: false });
      // Don't clear offer, it can be reused
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      const activePeerId = get().activePeer?.id;
      if (activePeerId) {
        usePeerManagerStore.getState().updatePeerStatus(activePeerId, 'error');
      }
      set({ status: 'error' });
      get().destroyPeer();
    });
}

const handleChunkMessage = async (data: ArrayBuffer) => {
    const { updateFileProgress, updateFileStatus, calculateFileChecksum, getFile } = useTransferStore.getState();
    const { toast } = useToast();
    const peerId = usePeerStore.getState().activePeer?.id;
    
    const textDecoder = new TextDecoder();
    
    // Extract name length (2 bytes)
    const nameLength = new DataView(data).getUint16(0, true);
    let offset = 2;
    
    // Extract name
    const name = textDecoder.decode(data.slice(offset, offset + nameLength));
    offset += nameLength;
    
    // Extract chunkIndex and totalChunks (4 bytes each)
    const chunkIndex = new DataView(data).getUint32(offset, true);
    offset += 4;
    const totalChunks = new DataView(data).getUint32(offset, true);
    offset += 4;

    // The rest is the chunk data
    const chunkData = data.slice(offset);

    const transferFile = getFile(name);

    if (transferFile && transferFile.status !== 'complete' && transferFile.status !== 'error') {
        try {
            await addChunk(name, chunkIndex, chunkData);
        } catch (error) {
            console.error(`Failed to store chunk ${chunkIndex} for ${name}.`, error);
            updateFileStatus(name, 'error', peerId);
            toast({ variant: 'destructive', title: "Transfer Failed", description: `Could not save file part for ${name}. Your storage may be full.` });
            await clearFileChunks(name);
            return;
        }

        const allChunkIndexes = await getReceivedChunkIndexes(name);
        const receivedSize = allChunkIndexes.length * (transferFile.file.size / totalChunks);
        updateFileProgress(name, receivedSize);

        if (allChunkIndexes.length === totalChunks) {
            updateFileStatus(name, 'verifying', peerId);
            const chunksFromDb = await getFileChunks(name, totalChunks);
            const validChunks = chunksFromDb.filter((c): c is ArrayBuffer => c !== undefined);

            if (validChunks.length !== totalChunks) {
                console.error(`DB consistency error for ${name}. Expected ${totalChunks} chunks, got ${validChunks.length}. Retrying.`);
                updateFileStatus(name, 'error', peerId);
                await clearFileChunks(name);
                usePeerStore.getState().sendJson({ type: 'resume-request', payload: { name, receivedChunks: [] } });
                return;
            }

            const fileBlob = new Blob(validChunks, { type: transferFile.file.type });
            const receivedChecksum = await calculateFileChecksum(fileBlob);
            
            if (receivedChecksum === transferFile.checksum) {
                updateFileStatus(name, 'complete', peerId);
                usePeerStore.getState().sendJson({ type: 'transfer-verified', payload: { name } });
                toast({ title: "Transfer Complete", description: `Successfully received and verified ${name}.` });
            } else {
                console.error(`Checksum mismatch for ${name}. Retrying file.`);
                updateFileStatus(name, 'error', peerId);
                toast({ variant: 'destructive', title: "Transfer Failed", description: `Data for ${name} was corrupt. Retrying...` });
                await clearFileChunks(name); // Clean up bad data
                usePeerStore.getState().sendJson({ type: 'resume-request', payload: { name, receivedChunks: [] } });
            }
        }
    }
}

const handleBenchmarkChunkMessage = (data: ArrayBuffer) => {
    const benchmarkStore = useBenchmarkStore.getState();
    const runIdLength = new DataView(data).getUint16(0, true);
    let offset = 2;
    const runId = new TextDecoder().decode(data.slice(offset, offset + runIdLength));
    offset += runIdLength;

    const index = new DataView(data).getUint32(offset, true);
    offset += 4;
    const chunk = data.slice(offset);

    benchmarkStore.receiveChunk({runId, index, chunk});
}


const handleJsonMessage = async (message: JsonMessage, get: any, set: any) => {
    const { updateFileStatus, startReceivingFile, getFile } = useTransferStore.getState();
    const { updatePeerName, updatePeerPublicKey, getPeer } = usePeerManagerStore.getState();
    const { signData, verifySignature, publicKey: myPublicKey } = useKeyStore.getState();
    const benchmarkStore = useBenchmarkStore.getState();
    const { toast } = useToast();

    switch (message.type) {
        case 'key-exchange': {
        const { publicKey } = message.payload;
        const peerId = get().activePeer?.id;
        if (peerId) {
            updatePeerPublicKey(peerId, publicKey);
            if (myPublicKey && !getPeer(peerId)?.publicKey) {
                get().sendJson({ type: 'key-exchange', payload: { publicKey: myPublicKey } });
            }
        }
        break;
        }
        case 'challenge-request': {
            const { nonce } = message.payload;
            const signature = await signData(nonce);
            get().sendJson({ type: 'challenge-response', payload: { nonce, signature } });
            break;
        }
        case 'challenge-response': {
        const { nonce, signature } = message.payload;
        const peerInfo = get().activePeer;
        if (peerInfo?.publicKey) {
            const isValid = await verifySignature(peerInfo.publicKey, signature, nonce);
            if (isValid) {
                console.log("Cryptographic verification successful!");
                get().sendJson({ type: 'challenge-verified', payload: {} });
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
            startReceivingFile({ name, size, type, checksum, peerId });
            
            if (receivedChunks.length > 0) {
                console.log(`Found ${receivedChunks.length} existing chunks for ${name}. Requesting resume.`);
                updateFileStatus(name, 'resuming', peerId);
                get().sendJson({ type: 'resume-request', payload: { name, receivedChunks } });
            }
        }
        handleReceive();
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
                get().sendJson({ type: 'resume-accepted', payload: { name, startChunk } });
            } else {
                console.log(`Resume requested for ${name}, but no chunks are missing.`);
                if(transferFile.status === 'complete') {
                get().sendJson({ type: 'transfer-verified', payload: { name } });
                }
            }
            } else {
                console.log(`Denied resume for ${name}, file not found or direction mismatch.`);
                get().sendJson({ type: 'resume-denied', payload: { name } });
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

        // Benchmark handlers
        case 'benchmark-start':
        benchmarkStore.startReceiving(message.payload);
        break;
        case 'benchmark-end':
        const duration = await benchmarkStore.finishReceiving(message.payload.runId);
        if (duration !== null) {
            get().sendJson({ type: 'benchmark-results', payload: { runId: message.payload.runId, duration } });
        }
        break;
        case 'benchmark-results':
        benchmarkStore.setSenderResults(message.payload);
        break;
    }
}


export const usePeerStore = create<PeerState>((set, get) => ({
  peer: null,
  status: 'disconnected',
  isInitiator: false,
  activePeer: null,
  currentOffer: null,
  currentAnswer: null,

  createPeer: (initiator, targetPeer) => {
    get().destroyPeer(); // Clean up existing peer if any
    set({ isInitiator: initiator, status: 'connecting', activePeer: targetPeer || null });

    const newPeer = new Peer({
      initiator: initiator,
      trickle: true,
    });
    
    set({ peer: newPeer });
    setupPeerEvents(newPeer, set, get);
    
    return newPeer;
  },

  createPeerAsInitiator: () => {
    if (get().peer && get().isInitiator && get().currentOffer) {
      return; // Initiator peer with offer already exists
    }
    const peer = get().createPeer(true);
  },

  destroyPeer: () => {
    get().peer?.destroy();
    if(get().activePeer) {
        usePeerManagerStore.getState().updatePeerStatus(get().activePeer!.id, 'disconnected');
    }
    set({ peer: null, status: 'disconnected', activePeer: null, currentAnswer: null });
    if (get().isInitiator) {
        // If we were the initiator, the offer is now invalid
        set({ currentOffer: null });
    }
  },

  signal: (data) => {
    get().peer?.signal(data);
  },

  sendJson: (message) => {
    const peer = get().peer;
    if (peer?.connected) {
        const messageString = JSON.stringify(message);
        const encoder = new TextEncoder();
        const data = encoder.encode(messageString);
        const buffer = new ArrayBuffer(data.length + 1);
        new Uint8Array(buffer, 1).set(data);
        new Uint8Array(buffer, 0, 1)[0] = MessageTypeHeader.JSON;
        peer.send(buffer);
    } else {
      console.warn('Cannot send JSON, peer is not connected.', {status: get().status});
    }
  },

  sendChunk: (message: ChunkMessage) => {
    const peer = get().peer;
    if (peer?.connected) {
        const textEncoder = new TextEncoder();
        const nameBytes = textEncoder.encode(message.name);
        
        // Header (1) + NameLength (2) + Name (var) + Index (4) + Total (4) + Chunk (var)
        const buffer = new ArrayBuffer(1 + 2 + nameBytes.length + 4 + 4 + message.chunk.byteLength);
        const view = new DataView(buffer);
        
        let offset = 0;
        view.setUint8(offset, MessageTypeHeader.CHUNK);
        offset += 1;
        
        view.setUint16(offset, nameBytes.length, true); // Name length
        offset += 2;
        
        new Uint8Array(buffer, offset).set(nameBytes); // Name
        offset += nameBytes.length;
        
        view.setUint32(offset, message.chunkIndex, true); // chunkIndex
        offset += 4;
        
        view.setUint32(offset, message.totalChunks, true); // totalChunks
        offset += 4;
        
        new Uint8Array(buffer, offset).set(new Uint8Array(message.chunk)); // chunk data

        peer.send(buffer);
    } else {
        console.warn("Cannot send chunk, peer not connected");
    }
  },

  sendBenchmarkChunk: (message: BenchmarkChunkMessage) => {
      const peer = get().peer;
      if (peer?.connected) {
        const textEncoder = new TextEncoder();
        const runIdBytes = textEncoder.encode(message.runId);

        const buffer = new ArrayBuffer(1 + 2 + runIdBytes.length + 4 + message.chunk.byteLength);
        const view = new DataView(buffer);
        let offset = 0;

        view.setUint8(offset, MessageTypeHeader.BENCHMARK_CHUNK);
        offset += 1;

        view.setUint16(offset, runIdBytes.length, true);
        offset += 2;

        new Uint8Array(buffer, offset).set(runIdBytes);
        offset += runIdBytes.length;

        view.setUint32(offset, message.index, true);
        offset += 4;
        
        new Uint8Array(buffer, offset).set(new Uint8Array(message.chunk));

        peer.send(buffer);
      }
  },
  
  connectToPeer: (peerInfo) => {
    if (!peerInfo.publicKey) {
        useToast().toast({variant: 'destructive', title: 'Cannot Connect', description: 'Peer does not have a public key. Cannot establish secure connection.'});
        return;
    }
    const peer = get().createPeer(true, peerInfo);
  },

  connectFromOffer: (offer) => {
    const peer = get().createPeer(false);
    set({ activePeer: { id: `peer_${Date.now()}`, name: 'New Peer', status: 'connecting', trusted: false } as PeerInfo });
    peer.signal(offer);
  }
}));
