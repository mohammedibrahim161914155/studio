'use client';
import { useState, useEffect } from "react";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { QrCode, ScanLine, Loader2, Copy } from "lucide-react";
import QRCode from "qrcode.react";
import { usePeerStore } from "@/connection/peer";
import { Textarea } from "@/ui/textarea";
import { Label } from "@/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SignalData } from "simple-peer";
import { usePeerManagerStore } from "@/core/peer-manager";

export function QrCodeDialog() {
  const [open, setOpen] = useState(false);
  const { 
    createPeer, 
    signal, 
    status,
    activePeer,
    currentOffer,
    setCurrentOffer,
    destroyPeer,
    connectFromOffer,
  } = usePeerStore();
  const { getPeer, updatePeerSignal } = usePeerManagerStore();

  const [pastedSignal, setPastedSignal] = useState("");
  const { toast } = useToast();

  const activePeerDetails = activePeer ? getPeer(activePeer.id) : null;
  const offerSignalString = currentOffer ? JSON.stringify(currentOffer) : "";
  const answerSignalString = activePeerDetails?.answer ? JSON.stringify(activePeerDetails.answer) : "";

  // Effect to manage state when dialog opens/closes
  useEffect(() => {
    if(!open) {
      setPastedSignal("");
      // Clean up temporary peer/offer if connection wasn't established
      if (status !== 'connected' && currentOffer) {
        destroyPeer();
      }
      setCurrentOffer(null);
    }
  }, [open, status, currentOffer, destroyPeer, setCurrentOffer]);

  // Effect to close dialog on successful connection
  useEffect(() => {
    if(status === 'connected') {
        toast({
            title: "Successfully Connected!",
            description: `You are now connected to ${activePeer?.name || 'your peer'}.`,
        });
        setTimeout(() => setOpen(false), 1000);
    }
  }, [status, toast, activePeer]);


  const handleCreateOffer = () => {
    destroyPeer();
    createPeer(true);
  };
  
  const handleConnectWithOffer = () => {
    try {
        const parsedSignal: SignalData = JSON.parse(pastedSignal);
        if (parsedSignal.type !== 'offer') {
            throw new Error("Pasted text is not a connection offer.");
        }
        connectFromOffer(parsedSignal);
        toast({ title: "Offer Received", description: "Generating an answer to send back." });
    } catch(e) {
         toast({ variant: "destructive", title: "Invalid Offer", description: (e as Error).message });
    }
  };
  
  const handleSignalAnswer = () => {
      try {
          const parsedSignal: SignalData = JSON.parse(pastedSignal);
          if (parsedSignal.type !== 'answer') {
              throw new Error("Pasted text is not an answer.");
          }
          signal(parsedSignal);
          if (activePeer) {
              updatePeerSignal(activePeer.id, parsedSignal);
          }
          toast({ title: "Connecting...", description: "Trying to establish connection." });

      } catch(e) {
          toast({ variant: "destructive", title: "Invalid Answer", description: (e as Error).message });
      }
  };

  const handleCopy = (text: string) => {
    if(!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <QrCode />
          <span>Pair Device</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h2">Pair a New Device</DialogTitle>
          <DialogDescription>
            Share your offer or connect to another device's offer.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="share" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share" onClick={handleCreateOffer}>
              <QrCode /> Share Offer
            </TabsTrigger>
            <TabsTrigger value="connect">
              <ScanLine /> Connect to Offer
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="share">
            <div className="space-y-4 p-1 pt-4">
              {offerSignalString ? (
                <>
                  <p className="text-sm-text text-muted-foreground">
                    Have the other device scan this QR code or copy the text. Then, paste their answer below.
                  </p>
                  <div className="p-4 bg-white rounded-lg flex justify-center">
                    <QRCode value={offerSignalString} size={220} fgColor="#09090b" bgColor="#ffffff" />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="offer-signal">Your Connection Offer</Label>
                      <div className="flex items-center gap-2">
                        <Textarea id="offer-signal" value={offerSignalString} readOnly rows={4} className="font-code text-xs bg-muted flex-1"/>
                        <Button variant="ghost" size="icon" aria-label="Copy Offer" onClick={() => handleCopy(offerSignalString)}><Copy /></Button>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="pasted-answer">Paste Answer from Peer</Label>
                      <Textarea id="pasted-answer" placeholder="Paste the answer from the other device here..." value={pastedSignal} onChange={(e) => setPastedSignal(e.target.value)} rows={4} className="font-code text-xs"/>
                  </div>
                   <DialogFooter className="mt-4">
                     <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                     <Button onClick={handleSignalAnswer} disabled={!pastedSignal || status === 'connecting' || status === 'connected'}>
                        {status === 'connecting' ? <><Loader2 className="animate-spin" /><span>Connecting...</span></> : 'Connect'}
                     </Button>
                   </DialogFooter>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="ml-2">Generating offer...</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="connect">
              <div className="space-y-4 p-1 pt-4">
                  <p className="text-sm-text text-muted-foreground">
                      Paste the connection offer from the other device. Your answer will be generated to send back.
                  </p>
                  <div className="space-y-2">
                      <Label htmlFor="pasted-offer">Connection Offer from Peer</Label>
                      <Textarea id="pasted-offer" placeholder="Paste the offer text here..." value={pastedSignal} onChange={(e) => setPastedSignal(e.target.value)} rows={4} className="font-code text-xs"/>
                  </div>
                    {answerSignalString && (
                      <div className="space-y-2">
                          <Label htmlFor="answer-signal">Your Answer (Send this back)</Label>
                          <div className="flex items-center gap-2">
                            <Textarea id="answer-signal" value={answerSignalString} readOnly rows={4} className="font-code text-xs bg-muted flex-1"/>
                            <Button variant="ghost" size="icon" aria-label="Copy Answer" onClick={() => handleCopy(answerSignalString)}><Copy /></Button>
                          </div>
                          <p className="text-xs text-muted-foreground">The connection will be established once the other peer receives your answer.</p>
                      </div>
                    )}
                <DialogFooter className="mt-4">
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleConnectWithOffer} disabled={!pastedSignal || !!answerSignalString}>
                        Receive Offer
                    </Button>
                </DialogFooter>
              </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
