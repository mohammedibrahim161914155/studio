
'use client';
import { SidebarTrigger } from "@/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareLinkDialog } from "@/components/share-link-dialog";
import { Button } from "@/ui/button";
import { Send, Loader2, QrCode } from "lucide-react";
import { usePeerStore } from "@/connection/peer";
import { useTransferStore } from "@/core/transfer";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import type { TransferFile } from "@/core/transfer";

const CHUNK_SIZE = 128 * 1024; // 128KB for better performance
const PARALLEL_CHUNKS = 4; // Number of chunks to send in parallel

export function Header({ onPairDevice }: { onPairDevice: () => void }) {
  // --- Granular Selectors for Performance ---
  // Only subscribe to the peer's connection status and name
  const peerStatus = usePeerStore(s => s.status);
  const activePeerName = usePeerStore(s => s.activePeer?.name);
  // Only subscribe to the count of pending files, not the whole array
  const filesToSendCount = useTransferStore(s => s.files.filter(f => f.status === 'pending' && f.direction === 'sent').length);
  // Select the peer instance separately for the effect
  const peer = usePeerStore(s => s.peer);
  
  const { toast } = useToast();
  const [isPreparing, setIsPreparing] = useState(false);
  
  const sendFileInParallel = useCallback(async (file: File, startChunk = 0) => {
    // Get non-reactive state and functions directly from the store
    const { updateFileStatus, updateFileProgress } = useTransferStore.getState();
    const { sendChunk } = usePeerStore.getState();

    updateFileStatus(file.name, 'sending');
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let sentBytes = startChunk * CHUNK_SIZE;
    
    let nextChunkIndex = startChunk;

    const worker = async () => {
        while(nextChunkIndex < totalChunks) {
            // Check for connection loss or abortion before processing a new chunk
            if (usePeerStore.getState().status !== 'connected') {
                updateFileStatus(file.name, 'error');
                return; // End this worker
            }

            const chunkIndex = nextChunkIndex++;
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunkSlice = file.slice(start, end);

            try {
                const arrayBuffer = await chunkSlice.arrayBuffer();
                sendChunk({
                    name: file.name,
                    chunk: arrayBuffer,
                    chunkIndex: chunkIndex,
                    totalChunks: totalChunks,
                });
                sentBytes += arrayBuffer.byteLength;
                updateFileProgress(file.name, sentBytes);
            } catch (error) {
                console.error(`Error sending chunk ${chunkIndex}:`, error);
                updateFileStatus(file.name, 'error');
                // Stop all workers for this file by setting the index to the end
                nextChunkIndex = totalChunks; 
                return; // End this worker
            }
        }
    };

    // Start parallel workers
    const workers = [];
    for (let i = 0; i < PARALLEL_CHUNKS; i++) {
        workers.push(worker());
    }
    
    // Wait for all workers to complete
    await Promise.all(workers);
      
  }, []); // Dependencies are stable or obtained from getState


  // Handle resume requests from the receiver
  useEffect(() => {
    if (!peer) return;

    const handleData = (data: ArrayBuffer) => {
       try {
        const { getFile } = useTransferStore.getState();
        const messageString = new TextDecoder().decode(data);
        const message = JSON.parse(messageString);

        if (message.type === 'resume-accepted') {
          console.log(`Resume accepted for ${message.payload.name}, starting from ${message.payload.startChunk}`);
          const file = getFile(message.payload.name)?.file;
          if (file) {
            sendFileInParallel(file, message.payload.startChunk);
          }
        }
      } catch (e) {
        // Ignore non-json messages (i.e. binary chunks)
      }
    };
    peer.on('data', handleData);
    return () => {
      peer.removeListener('data', handleData);
    };
  }, [peer, sendFileInParallel]); // Effect only re-runs if peer instance changes


  const handleSend = async () => {
    // Get fresh state directly inside the handler
    const { status: currentPeerStatus, activePeer: currentActivePeer, sendJson } = usePeerStore.getState();
    const { files, calculateFileChecksum, setFileChecksum, getFile } = useTransferStore.getState();

    if (currentPeerStatus !== 'connected' || !currentActivePeer) {
      toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to a peer before sending files.' });
      return;
    }
    const pendingFiles = files.filter(f => f.status === 'pending' && f.direction === 'sent');
    if (pendingFiles.length === 0) {
      toast({ variant: 'destructive', title: 'No Files to Send', description: 'Add new files or clear completed ones to send again.' });
      return;
    }

    setIsPreparing(true);
    toast({ title: 'Preparing Files...', description: `Calculating checksums before sending.` });

    const filesToSend: TransferFile[] = [];
    for (const transferFile of pendingFiles) {
      const file = transferFile.file;
      if (transferFile.status !== 'pending') continue;
      const checksum = await calculateFileChecksum(file);
      setFileChecksum(file.name, checksum);
      filesToSend.push({...transferFile, checksum});
    }

    setIsPreparing(false);
    toast({ title: 'Sending Files', description: `Initiating transfer of ${filesToSend.length} file(s) to ${currentActivePeer.name}.` });

    for (const transferFile of filesToSend) {
        sendJson({
          type: 'metadata',
          payload: { name: transferFile.file.name, size: transferFile.file.size, type: transferFile.file.type, checksum: transferFile.checksum! }
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));

        const currentTransferState = getFile(transferFile.file.name);
        if (currentTransferState && currentTransferState.status !== 'resuming') {
          await sendFileInParallel(transferFile.file);
        }
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <h1 className="text-h2">File Transfer</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onPairDevice}>
          <QrCode />
          <span>Pair Device</span>
        </Button>
        <ShareLinkDialog />
        <Button 
          variant="accent"
          onClick={handleSend}
          disabled={peerStatus !== 'connected' || filesToSendCount === 0 || isPreparing}
        >
          {isPreparing ? <Loader2 className="animate-spin" /> : <Send />}
          <span>Send {filesToSendCount > 0 ? `(${filesToSendCount})` : ''}</span>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
