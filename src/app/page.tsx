
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
import { QrCodeDialog } from "@/components/qr-code-dialog";
import { usePeerManagerStore } from "@/core/peer-manager";

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
  const { connectFromOffer, connectToPeer, status: peerStatus } = usePeerStore();
  const { peers } = usePeerManagerStore();
  const { toast } = useToast();
  const [showQrDialog, setShowQrDialog] = useState(false);
  const autoConnectAttempted = useRef(false);


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
                setShowQrDialog(true);
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
    // Only run on initial mount and if no connection is active/pending
    if (peerStatus === 'disconnected' && !autoConnectAttempted.current && peers.length > 0) {
      const trustedPeer = peers.find(p => p.trusted && p.offer);
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
  }, [peers, peerStatus, connectToPeer, toast]);


  return (
    <>
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar>
          <SidebarNav />
        </Sidebar>
        <div className="flex flex-col">
          <SidebarInset>
            <Header />
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
    {showQrDialog && <QrCodeDialog onOpenChange={setShowQrDialog} />}
    </>
  );
}
