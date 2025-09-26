
'use client';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareLinkDialog } from "@/components/share-link-dialog";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { usePeerStore } from "@/connection/peer";
import { useTransferStore } from "@/core/transfer";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import type { TransferFile } from "@/core/transfer";
import { QrCodeDialog } from "../qr-code-dialog";

const CHUNK_SIZE = 128 * 1024; // 128KB for better performance
const PARALLEL_CHUNKS = 4; // Number of chunks to send in parallel

export function Header() {
  const peerStatus = usePeerStore(s => s.status);
  const activePeer = usePeerStore(s => s.activePeer);
  const sendJson = usePeerStore(s => s.sendJson);
  const sendChunk = usePeerStore(s => s.sendChunk);
  const peer = usePeerStore(s => s.peer);

  const { files, updateFileStatus, updateFileProgress, calculateFileChecksum, setFileChecksum, getFile } = useTransferStore();
  const { toast } = useToast();
  const [isPreparing, setIsPreparing] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  const sendFileInParallel = useCallback(async (file: File, startChunk = 0) => {
      updateFileStatus(file.name, 'sending');
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let sentBytes = startChunk * CHUNK_SIZE;
      let chunksInFlight = 0;
      let nextChunkIndex = startChunk;

      const processChunk = async (chunkIndex: number) => {
          if (chunkIndex >= totalChunks || usePeerStore.getState().status !== 'connected') {
              if (usePeerStore.getState().status !== 'connected') {
                  updateFileStatus(file.name, 'error');
              }
              return;
          }

          chunksInFlight++;
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
              // This will stop the loop
              nextChunkIndex = totalChunks;
          } finally {
              chunksInFlight--;
              // If there are more chunks to send, send the next one
              if (nextChunkIndex < totalChunks) {
                  processChunk(nextChunkIndex++);
              }
          }
      };

      // Start the initial batch of parallel transfers
      for (let i = 0; i < PARALLEL_CHUNKS && nextChunkIndex < totalChunks; i++) {
          processChunk(nextChunkIndex++);
      }
      
  }, [sendChunk, updateFileStatus, updateFileProgress]);


  // Handle resume requests from the receiver
  useEffect(() => {
    if (!peer) return;

    const handleData = (data: ArrayBuffer) => {
       try {
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
  }, [peer, getFile, sendFileInParallel]);


  const handleSend = async () => {
    if (peerStatus !== 'connected' || !activePeer) {
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
    toast({ title: 'Sending Files', description: `Initiating transfer of ${filesToSend.length} file(s) to ${activePeer.name}.` });


    for (const transferFile of filesToSend) {
        // Send metadata first and wait for potential resume request
        sendJson({
          type: 'metadata',
          payload: { name: transferFile.file.name, size: transferFile.file.size, type: transferFile.file.type, checksum: transferFile.checksum! }
        });
        
        // Give a moment for the receiver to process metadata and request a resume
        await new Promise(resolve => setTimeout(resolve, 200));

        const currentTransferState = getFile(transferFile.file.name);
        // If the peer has requested a resume, the status will be 'resuming' and the resume handler will start the transfer.
        // Otherwise, start from the beginning.
        if (currentTransferState && currentTransferState.status !== 'resuming') {
          await sendFileInParallel(transferFile.file);
        }
    }
  };

  const filesToSendCount = useTransferStore(s => s.files.filter(f => f.status === 'pending' && f.direction === 'sent').length);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <h1 className="text-h2">File Transfer</h1>
      </div>
      <div className="flex items-center gap-2">
        <QrCodeDialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen} />
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
