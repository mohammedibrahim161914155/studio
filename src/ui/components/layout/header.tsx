'use client';
import { SidebarTrigger } from "@/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareLinkDialog } from "@/components/share-link-dialog";
import { QrCodeDialog } from "@/components/qr-code-dialog";
import { Button } from "@/ui/button";
import { Send, Loader2 } from "lucide-react";
import { usePeerStore } from "@/connection/peer";
import { useTransferStore } from "@/core/transfer";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { PeerMessage } from "@/connection/peer";
import type { TransferFile } from "@/core/transfer";

const CHUNK_SIZE = 128 * 1024; // 128KB for better performance
const PARALLEL_CHUNKS = 4; // Number of chunks to send in parallel

export function Header() {
  const { status, send, activePeer, peer } = usePeerStore();
  const { files, updateFileStatus, updateFileProgress, calculateFileChecksum, setFileChecksum, getFile } = useTransferStore();
  const { toast } = useToast();
  const [isPreparing, setIsPreparing] = useState(false);

  const sendFileInParallel = useCallback(async (file: File, startChunk = 0) => {
      updateFileStatus(file.name, 'sending');
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let sentBytes = startChunk * CHUNK_SIZE;
      let chunksInFlight = 0;
      let nextChunkIndex = startChunk;

      const sendChunk = async (chunkIndex: number) => {
          if (chunkIndex >= totalChunks || usePeerStore.getState().status !== 'connected') {
              if (usePeerStore.getState().status !== 'connected') {
                  updateFileStatus(file.name, 'error');
              }
              return;
          }

          chunksInFlight++;
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          
          try {
              const arrayBuffer = await chunk.arrayBuffer();
              send({
                  type: 'chunk',
                  payload: {
                      name: file.name,
                      chunk: arrayBuffer,
                      chunkIndex: chunkIndex,
                      totalChunks: totalChunks,
                  }
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
                  sendChunk(nextChunkIndex++);
              } else if (chunksInFlight === 0 && nextChunkIndex >= totalChunks) {
                  // This was the last chunk in the batch
                  // The completion is checked on the receiver side
              }
          }
      };

      // Start the initial batch of parallel transfers
      for (let i = 0; i < PARALLEL_CHUNKS && nextChunkIndex < totalChunks; i++) {
          sendChunk(nextChunkIndex++);
      }
      
  }, [send, updateFileStatus, updateFileProgress]);


  // Handle resume requests from the receiver
  useEffect(() => {
    if (!peer) return;

    const handleData = (data: any) => {
      try {
        const message: PeerMessage = JSON.parse(data.toString());
        if (message.type === 'resume-accepted') {
          console.log(`Resume accepted for ${message.payload.name}, starting from ${message.payload.startChunk}`);
          const file = getFile(message.payload.name)?.file;
          if (file) {
            sendFileInParallel(file, message.payload.startChunk);
          }
        }
      } catch (e) {
        // Ignore non-json messages
      }
    };
    peer.on('data', handleData);
    return () => {
      peer.removeListener('data', handleData);
    };
  }, [peer, getFile, sendFileInParallel]);


  const handleSend = async () => {
    if (status !== 'connected' || !activePeer) {
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
      const checksum = await calculateFileChecksum(file);
      setFileChecksum(file.name, checksum);
      filesToSend.push({...transferFile, checksum});
    }

    setIsPreparing(false);
    toast({ title: 'Sending Files', description: `Initiating transfer of ${filesToSend.length} file(s) to ${activePeer.name}.` });


    for (const transferFile of filesToSend) {
        // Send metadata first and wait for potential resume request
        send({
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

  const filesToSend = files.filter(f => f.status === 'pending' && f.direction === 'sent');

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <h1 className="text-h1">File Transfer</h1>
      </div>
      <div className="flex items-center gap-2">
        <QrCodeDialog />
        <ShareLinkDialog />
        <Button 
          variant="accent"
          onClick={handleSend}
          disabled={status !== 'connected' || filesToSend.length === 0 || isPreparing}
        >
          {isPreparing ? <Loader2 className="animate-spin" /> : <Send />}
          <span>Send {filesToSend.length > 0 ? `(${filesToSend.length})` : ''}</span>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
