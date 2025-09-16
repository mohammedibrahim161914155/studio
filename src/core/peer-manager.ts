'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SignalData } from 'simple-peer';

export type Peer = {
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'verifying';
    trusted: boolean;
    publicKey?: JsonWebKey;
    offer?: SignalData;
    answer?: SignalData;
};

type PeerManagerState = {
    peers: Peer[];
    addPeer: (peer: Omit<Peer, 'trusted' | 'status'> & { status?: Peer['status']}) => void;
    removePeer: (peerId: string) => void;
    updatePeerName: (peerId: string, name: string) => void;
    updatePeerStatus: (peerId: string, status: Peer['status']) => void;
    updatePeerSignal: (peerId: string, signal: SignalData) => void;
    updatePeerPublicKey: (peerId: string, publicKey: JsonWebKey) => void;
    updatePeerTrusted: (peerId: string, trusted: boolean) => void;
    getPeer: (peerId: string) => Peer | undefined;
};

export const usePeerManagerStore = create(
    persist<PeerManagerState>(
        (set, get) => ({
            peers: [],
            addPeer: (peer) => {
                if (get().peers.find(p => p.id === peer.id)) return; // Avoid duplicates
                const newPeer: Peer = { ...peer, trusted: false, status: peer.status || 'connecting' };
                set((state) => ({ peers: [...state.peers, newPeer] }));
            },
            removePeer: (peerId) => {
                set((state) => ({ peers: state.peers.filter((p) => p.id !== peerId) }));
            },
            updatePeerName: (peerId, name) => {
                set((state) => ({
                    peers: state.peers.map((p) => (p.id === peerId ? { ...p, name } : p)),
                }));
            },
            updatePeerStatus: (peerId, status) => {
                set((state) => ({
                    peers: state.peers.map((p) => (p.id === peerId ? { ...p, status } : p)),
                }));
            },
            updatePeerSignal: (peerId, signal) => {
                set((state) => ({
                    peers: state.peers.map((p) => {
                        if (p.id === peerId) {
                            if (signal.type === 'offer') return { ...p, offer: signal };
                            if (signal.type === 'answer') return { ...p, answer: signal };
                        }
                        return p;
                    }),
                }));
            },
            updatePeerPublicKey: (peerId, publicKey) => {
                set(state => ({
                    peers: state.peers.map(p => p.id === peerId ? { ...p, publicKey } : p)
                }))
            },
            updatePeerTrusted: (peerId, trusted) => {
                set(state => ({
                    peers: state.peers.map(p => {
                        if (p.id === peerId) {
                            // When untrusting, remove the public key
                            if (!trusted) {
                                const { publicKey, ...rest } = p;
                                return { ...rest, trusted: false };
                            }
                            return { ...p, trusted };
                        }
                        return p;
                    })
                }));
            },
            getPeer: (peerId) => {
                return get().peers.find(p => p.id === peerId);
            }
        }),
        {
            name: 'blackwire-peer-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// --- Key Management Store ---
type KeyStoreState = {
    publicKey: JsonWebKey | null;
    privateKey: JsonWebKey | null;
    isGenerating: boolean;
    generateKeys: () => Promise<void>;
    signData: (data: string) => Promise<ArrayBuffer>;
    verifySignature: (publicKey: JsonWebKey, signature: ArrayBuffer, data: string) => Promise<boolean>;
};

const KEY_ALGORITHM = {
  name: 'ECDSA',
  namedCurve: 'P-256',
};
const SIGN_ALGORITHM = { name: 'ECDSA', hash: { name: 'SHA-256' } };

export const useKeyStore = create(
  persist<KeyStoreState>(
    (set, get) => ({
      publicKey: null,
      privateKey: null,
      isGenerating: false,
      generateKeys: async () => {
        if (get().publicKey || get().isGenerating) return;

        set({ isGenerating: true });
        try {
          const keyPair = await crypto.subtle.generateKey(
            KEY_ALGORITHM,
            true,
            ['sign', 'verify']
          );
          const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey!);
          const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey!);
          set({ publicKey: publicKeyJwk, privateKey: privateKeyJwk });
        } catch (error) {
          console.error("Error generating crypto keys:", error);
        } finally {
          set({ isGenerating: false });
        }
      },
      signData: async (data: string): Promise<ArrayBuffer> => {
        const { privateKey } = get();
        if (!privateKey) throw new Error("Private key not available.");

        const importedKey = await crypto.subtle.importKey(
          'jwk',
          privateKey,
          KEY_ALGORITHM,
          true,
          ['sign']
        );
        const dataEncoder = new TextEncoder();
        const encodedData = dataEncoder.encode(data);
        return crypto.subtle.sign(SIGN_ALGORITHM, importedKey, encodedData);
      },
      verifySignature: async (publicKeyJwk: JsonWebKey, signature: ArrayBuffer, data: string): Promise<boolean> => {
        try {
            const importedKey = await crypto.subtle.importKey(
            'jwk',
            publicKeyJwk,
            KEY_ALGORITHM,
            true,
            ['verify']
            );
            const dataEncoder = new TextEncoder();
            const encodedData = dataEncoder.encode(data);
            return crypto.subtle.verify(SIGN_ALGORITHM, importedKey, signature, encodedData);
        } catch(e) {
            console.error("Signature verification failed:", e);
            return false;
        }
      },
    }),
    {
      name: 'blackwire-key-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
