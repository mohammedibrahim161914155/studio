'use client';
import { create } from 'zustand';
import Peer, { Instance, SignalData } from 'simple-peer';
import { useTransferStore } from '@/core/transfer';

type PeerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type PeerState = {
  peer: Instance | null;
  status: PeerStatus;
  isInitiator: boolean;
  createPeer: (initiator: boolean) => void;
  destroyPeer: () => void;
  signal: (data: SignalData) => void;
  send: (data: string | ArrayBuffer | Blob) => void;
  connectFromOffer: (offer: SignalData) => void;
};

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
      // We will handle this in the UI components
    });

    newPeer.on('connect', () => {
      set({ status: 'connected' });
      // Send a handshake message
      get().send(JSON.stringify({ type: 'handshake', message: 'Hello!' }));
    });

    newPeer.on('data', (data) => {
      // Handle incoming data
      console.log('Received data:', data.toString());
      // Here you would handle incoming file chunks, metadata, etc.
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

  send: (data) => {
    if (get().status === 'connected') {
      get().peer?.send(data);
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
