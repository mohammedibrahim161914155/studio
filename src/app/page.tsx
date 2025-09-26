
'use client';
import { SidebarProvider, Sidebar, SidebarInset } from "@/ui/sidebar";
import { Header } from "@/components/layout/header";
import { FileDropzone } from "@/components/file-dropzone";
import { TransferList } from "@/components/transfer-list";
import { DeviceList } from "@/components/device-list";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useEffect, useState, useRef } from "react";
import { usePeerStore } from "@/connection/peer";
import { useToast } from "@/hooks/use-toast";
import pako from 'pako';
import { usePeerManagerStore, useKeyStore } from "@/core/peer-manager";
import { QrCodeDialog } from "@/components/qr-code-dialog";

const decodeOfferFromUrl = (encodedOffer: string): string | null => {
    try {
        const compressed = Buffer.from(encodedOffer, 'base64');
        const decompressed = pako.inflate(compressed, { to: 'string' });
        // Basic validation that it's a JSON object
        JSON.parse(decompressed);
        return decompressed;
    } catch (error) {
        console.error("Failed to decode offer from URL:", error);
        return null;
    }
};


export default function Home() {
  const { toast } = useToast();
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const autoConnectAttempted = useRef(false);
  
  // Selectors for specific state to prevent re-renders
  const peerStatus = usePeerStore(s => s.status);
  const peers = usePeerManagerStore(s => s.peers);
  const { generateKeys, isGenerating } = useKeyStore();
  const createPeerAsInitiator = usePeerStore(s => s.createPeerAsInitiator);
  const connectToPeer = usePeerStore(s => s.connectToPeer);
  const connectFromOffer = usePeerStore(s => s.connectFromOffer);

  // Generate crypto keys on startup
  useEffect(() => {
    generateKeys();
  }, [generateKeys]);

  // Pre-generate an offer when the app loads and is not connected
  useEffect(() => {
    if (peerStatus === 'disconnected' && !isGenerating) {
        // This will create a peer and generate an offer in the background
        createPeerAsInitiator();
    }
  }, [peerStatus, isGenerating, createPeerAsInitiator]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUrlOffer = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/connect/')) {
        const encodedOffer = hash.substring('#/connect/'.length);
        const decodedOffer = decodeOfferFromUrl(encodedOffer);

        if (decodedOffer) {
            try {
                const parsedSignal = JSON.parse(decodedOffer);
                connectFromOffer(parsedSignal);
                setIsQrDialogOpen(true);
                toast({
                    title: "Connecting via Link",
                    description: "Received a connection offer from the link. Please copy your answer and send it back to the sender.",
                });
            } catch (e) {
                 toast({
                    variant: "destructive",
                    title: "Invalid Link",
                    description: "The connection link is malformed or expired.",
                });
            }
        } else {
            toast({
                variant: "destructive",
                title: "Invalid Link",
                description: "Could not decode the connection offer from the link.",
            });
        }
        
        // Clean up the URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    // Give a small delay to allow stores to hydrate before processing
    const timeoutId = setTimeout(handleUrlOffer, 100);

    return () => clearTimeout(timeoutId);
  }, [connectFromOffer, toast]);


  // Auto-reconnect to trusted peers
  useEffect(() => {
    // Only run on initial mount and if no connection is active/pending and keys are ready
    if (peerStatus === 'disconnected' && !autoConnectAttempted.current && peers.length > 0 && !isGenerating) {
      const trustedPeer = peers.find(p => p.trusted && p.publicKey);
      if (trustedPeer) {
        console.log(`Attempting to auto-reconnect to trusted peer: ${trustedPeer.name}`);
        toast({
          title: "Auto-reconnecting...",
          description: `Attempting to connect to your trusted device: ${trustedPeer.name}`,
        });
        connectToPeer(trustedPeer);
      }
      autoConnectAttempted.current = true; // Ensure this runs only once
    }
  }, [peers, peerStatus, connectToPeer, toast, isGenerating]);


  return (
    <>
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar>
          <SidebarNav />
        </Sidebar>
        <div className="flex flex-col">
          <SidebarInset>
            <Header onPairDevice={() => setIsQrDialogOpen(true)} />
            <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
              <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
                <div className="md:col-span-2 lg:col-span-3">
                  <FileDropzone />
                </div>
                <div className="md:col-span-1 lg:col-span-2">
                  <DeviceList />
                </div>
              </div>
              <TransferList />
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
    <QrCodeDialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen} />
    </>
  );
}
