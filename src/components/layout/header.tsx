import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareLinkDialog } from "@/components/share-link-dialog";
import { QrCodeDialog } from "@/components/qr-code-dialog";
import { Button } from "../ui/button";
import { Send } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <h1 className="text-lg font-headline font-semibold">File Transfer</h1>
      </div>
      <div className="flex items-center gap-2">
        <QrCodeDialog />
        <ShareLinkDialog />
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Send className="mr-2 h-4 w-4" />
            Send
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
