'use client';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareLinkDialog } from "@/components/share-link-dialog";
import { QrCodeDialog } from "@/components/qr-code-dialog";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { usePeerStore } from "@/connection/peer";
import { useTransferStore } from "@/core/transfer";
import { useToast } from "@/hooks/use-toast";

const CHUNK_SIZE = 64 * 1024; // 64KB

export function Header() {
  const { status, send } = usePeerStore();
  const { files, updateFileStatus } = useTransferStore();
  const { toast } = useToast();

  const handleSend = async () => {
    if (status !== 'connected') {
      toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to a peer before sending files.' });
      return;
    }
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      toast({ variant: 'destructive', title: 'No Files to Send', description: 'Add new files or clear completed ones to send again.' });
      return;
    }

    toast({ title: 'Sending Files', description: `Initiating transfer of ${pendingFiles.length} file(s).` });

    for (const transferFile of pendingFiles) {
      const file = transferFile.file;
      updateFileStatus(file.name, 'sending');
      
      // 1. Send metadata
      send({
        type: 'metadata',
        payload: { name: file.name, size: file.size, type: file.type }
      });

      // 2. Send file in chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const arrayBuffer = await chunk.arrayBuffer();

        // Send chunk data directly. We stringify the metadata for the message.
        send({
          type: 'chunk',
          payload: {
            name: file.name,
            chunk: arrayBuffer,
            chunkIndex: i,
            totalChunks: totalChunks,
          }
        });
      }
    }
  };

  const filesToSend = files.filter(f => f.status === 'pending');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <h1 className="text-h2">File Transfer</h1>
      </div>
      <div className="flex items-center gap-2">
        <QrCodeDialog />
        <ShareLinkDialog />
        <Button 
          variant="accent"
          onClick={handleSend}
          disabled={status !== 'connected' || filesToSend.length === 0}
          aria-label={filesToSend.length > 0 ? `Send ${filesToSend.length} files` : "Send files"}
        >
          <Send />
          <span>Send {filesToSend.length > 0 ? `(${filesToSend.length})` : ''}</span>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
