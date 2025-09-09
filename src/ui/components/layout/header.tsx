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

export function Header() {
  const { status, send } = usePeerStore();
  const { files, updateFileStatus } = useTransferStore();
  const { toast } = useToast();

  const handleSend = () => {
    if (status !== 'connected') {
      toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to a peer before sending files.' });
      return;
    }
    if (files.length === 0) {
      toast({ variant: 'destructive', title: 'No Files', description: 'Please add files to the transfer queue.' });
      return;
    }

    toast({ title: 'Sending Files', description: `Initiating transfer of ${files.length} file(s).` });

    // This is a simplified implementation. A real implementation would involve:
    // 1. Sending file metadata (name, size, type).
    // 2. Waiting for acknowledgment from the peer.
    // 3. Streaming file chunks.
    // 4. Updating progress based on acknowledgments.
    files.forEach(f => {
      if (f.status === 'pending') {
        send(f.file); // simple-peer handles Blob/File/ArrayBuffer
        updateFileStatus(f.file.name, 'sending');
      }
    });
  };

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
          disabled={status !== 'connected' || files.length === 0}
        >
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
