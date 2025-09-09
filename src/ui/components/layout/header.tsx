'use client';
import { SidebarTrigger } from "@/ui/sidebar";
import { ThemeToggle } from "@/ui/components/theme-toggle";
import { ShareLinkDialog } from "@/ui/components/share-link-dialog";
import { QrCodeDialog } from "@/ui/components/qr-code-dialog";
import { Button } from "@/ui/button";
import { Send } from "lucide-react";
import { usePeerStore } from "@/connection/peer";
import { useTransferStore } from "@/core/transfer";
import { useToast } from "@/hooks/use-toast";

const CHUNK_SIZE = 64 * 1024; // 64KB

export function Header() {
  const { status, send, activePeer } = usePeerStore();
  const { files, updateFileStatus, updateFileProgress } = useTransferStore();
  const { toast } = useToast();

  const handleSend = async () => {
    if (status !== 'connected' || !activePeer) {
      toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to a peer before sending files.' });
      return;
    }
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      toast({ variant: 'destructive', title: 'No Files to Send', description: 'Add new files or clear completed ones to send again.' });
      return;
    }

    toast({ title: 'Sending Files', description: `Initiating transfer of ${pendingFiles.length} file(s) to ${activePeer.name}.` });

    for (const transferFile of pendingFiles) {
      const file = transferFile.file;
      updateFileStatus(file.name, 'sending');
      
      // 1. Send metadata first
      send({
        type: 'metadata',
        payload: { name: file.name, size: file.size, type: file.type }
      });

      // 2. Send file in chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let sentBytes = 0;
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const arrayBuffer = await chunk.arrayBuffer();

        send({
          type: 'chunk',
          payload: {
            name: file.name,
            chunk: arrayBuffer,
            chunkIndex: i,
            totalChunks: totalChunks,
          }
        });
        
        sentBytes += arrayBuffer.byteLength;
        const progress = Math.round((sentBytes / file.size) * 100);
        updateFileProgress(file.name, progress);
      }
    }
  };

  const filesToSend = files.filter(f => f.status === 'pending');

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <h1 className="text-lg font-headline font-semibold">File Transfer</h1>
      </div>
      <div className="flex items-center gap-2">
        <QrCodeDialog />
        <ShareLinkDialog />
        <Button 
          variant="accent"
          onClick={handleSend}
          disabled={status !== 'connected' || filesToSend.length === 0}
        >
          <Send />
          <span>Send {filesToSend.length > 0 ? `(${filesToSend.length})` : ''}</span>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
