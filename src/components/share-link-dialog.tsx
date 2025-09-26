
"use client"

import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Link as LinkIcon, Copy, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePeerStore } from "@/connection/peer";
import { useState, useEffect } from "react";
import pako from 'pako';

// Helper to encode offer for URL
const encodeOfferForUrl = (offer: object): string => {
    const jsonString = JSON.stringify(offer);
    const compressed = pako.deflate(jsonString);
    return Buffer.from(compressed).toString('base64');
};


export function ShareLinkDialog() {
  const { toast } = useToast();
  const createPeerAsInitiator = usePeerStore(s => s.createPeerAsInitiator);
  const currentOffer = usePeerStore(s => s.currentOffer);
  const [open, setOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");

  useEffect(() => {
    if (open && currentOffer) {
      const encodedOffer = encodeOfferForUrl(currentOffer);
      const url = new URL(window.location.href);
      url.hash = `#/connect/${encodedOffer}`;
      setShareLink(url.toString());
    } else if (!open) {
      setShareLink("");
    }
  }, [open, currentOffer]);

  const handleGenerateLink = () => {
    setShareLink(""); // Reset previous link
    createPeerAsInitiator(); // Create a new peer as initiator to generate an offer
  };

  const copyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Link Copied!",
      description: "The shareable link has been copied to your clipboard.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={handleGenerateLink}>
          <LinkIcon />
          <span>Share via Link</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h2">Create Share Link</DialogTitle>
          <DialogDescription>
            Generate a secure, single-use link to connect with another peer directly. The link contains the connection offer.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="link">Your Secure P2P Link</Label>
            {shareLink ? (
              <div className="flex items-center gap-2">
                <Input id="link" value={shareLink} readOnly className="flex-1 font-code text-xs" />
                <Button variant="ghost" size="icon" onClick={copyLink} aria-label="Copy shareable link">
                  <Copy />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-10 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="ml-2">Generating secure link...</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
                The receiver will use this link to generate an answer. You will need to paste their answer in the "Pair Device" dialog to complete the connection.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={handleGenerateLink}>
            <RefreshCw />
            Regenerate Link
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="accent">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
