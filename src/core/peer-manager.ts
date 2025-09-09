'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SignalData } from 'simple-peer';

export type Peer = {
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    trusted: boolean;
    offer?: SignalData;
    answer?: SignalData;
};

type PeerManagerState = {
    myId: string;
    peers: Peer[];
    addPeer: (peer: Omit<Peer, 'trusted'>) => void;
    removePeer: (peerId: string) => void;
    updatePeerName: (peerId: string, name: string) => void;
    updatePeerStatus: (peerId: string, status: Peer['status']) => void;
    updatePeerSignal: (peerId: string, signal: SignalData) => void;
    updatePeerTrusted: (peerId: string, trusted: boolean) => void;
    getPeer: (peerId: string) => Peer | undefined;
};

export const usePeerManagerStore = create(
    persist<PeerManagerState>(
        (set, get) => ({
            myId: `user_${Math.random().toString(36).substring(2, 9)}`,
            peers: [],
            addPeer: (peer) => {
                if (get().peers.find(p => p.id === peer.id)) return; // Avoid duplicates
                const newPeer = { ...peer, trusted: false };
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
            updatePeerTrusted: (peerId, trusted) => {
                set(state => ({
                    peers: state.peers.map(p => p.id === peerId ? { ...p, trusted } : p)
                }));
            },
            getPeer: (peerId) => {
                return get().peers.find(p => p.id === peerId);
            }
        }),
        {
            name: 'blackwire-peer-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
        }
    )
);
