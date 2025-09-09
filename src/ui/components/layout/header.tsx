'use client';
import { SidebarTrigger } from "@/ui/shadcn/sidebar";
import { ThemeToggle } from "@/ui/components/theme-toggle";
import { ShareLinkDialog } from "@/ui/components/share-link-dialog";
import { QrCodeDialog } from "@/ui/components/qr-code-dialog";
import { Button } from "@/ui/shadcn/button";
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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <h1 className="text-lg font-headline font-semibold">File Transfer</h1>
      </div>
      <div className="flex items-center gap-2">
        <QrCodeDialog />
        <ShareLinkDialog />
        <Button 
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          onClick={handleSend}
          disabled={status !== 'connected' || filesToSend.length === 0}
        >
          <Send className="mr-2 h-4 w-4" />
          Send {filesToSend.length > 0 ? `(${filesToSend.length})` : ''}
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
