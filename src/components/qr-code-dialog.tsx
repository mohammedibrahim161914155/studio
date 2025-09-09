'use client';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, ScanLine, Loader2, Copy } from "lucide-react";
import QRCode from "qrcode.react";
import { usePeerStore } from "@/connection/peer";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SignalData } from "simple-peer";

export function QrCodeDialog() {
  const [open, setOpen] = useState(false);
  const { peer, createPeer, isInitiator, signal, connectFromOffer, status } = usePeerStore();
  const [offerSignal, setOfferSignal] = useState<string>("");
  const [answerSignal, setAnswerSignal] = useState<string>("");
  const [pastedSignal, setPastedSignal] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!peer || !open) return;

    const handleSignal = (data: SignalData) => {
      if (isInitiator) {
        setOfferSignal(JSON.stringify(data));
      } else {
        setAnswerSignal(JSON.stringify(data));
      }
    };

    peer.on('signal', handleSignal);

    return () => {
      peer.removeListener('signal', handleSignal);
    };
  }, [peer, isInitiator, open]);
  
  useEffect(() => {
    // Reset state on dialog close
    if(!open) {
      setOfferSignal("");
      setAnswerSignal("");
      setPastedSignal("");
    }
  }, [open]);

  const handleCreateOffer = () => {
    setOfferSignal(""); 
    setAnswerSignal("");
    createPeer(true);
  };

  const handleConnect = () => {
    try {
      const parsedSignal = JSON.parse(pastedSignal);
      if (isInitiator) {
        signal(parsedSignal); // This is an answer
      } else {
        connectFromOffer(parsedSignal); // This is an offer
      }
      toast({
        title: "Connecting...",
        description: "Trying to establish a connection with the peer.",
      });
      // Do not close dialog aitu, wait for connection status change
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid Signal",
        description: "The pasted text is not a valid connection signal.",
      });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };
  
  useEffect(() => {
    if(status === 'connected') {
        toast({
            title: "Successfully Connected!",
            description: "You can now close this dialog and start transferring files.",
        });
        setTimeout(() => setOpen(false), 1000);
    }
  }, [status, toast]);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" aria-label="Pair a new device">
          <QrCode />
          <span>Pair Device</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h2">Pair a New Device</DialogTitle>
          <DialogDescription>
            Use QR codes or text to securely connect to another device.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" onClick={() => createPeer(false)}>
              <ScanLine /> Connect
            </TabsTrigger>
            <TabsTrigger value="show" onClick={handleCreateOffer}>
              <QrCode /> Share
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="scan">
              <div className="space-y-4 p-1 pt-4">
                  <p className="text-sm-text text-muted-foreground">
                      Ask the other device to show their QR code or paste their connection offer below.
                  </p>
                  <div className="space-y-2">
                      <Label htmlFor="pasted-signal">Connection Offer</Label>
                      <Textarea
                          id="pasted-signal"
                          placeholder="Paste the long text from the other device here..."
                          value={pastedSignal}
                          onChange={(e) => setPastedSignal(e.target.value)}
                          rows={4}
                          className="font-code text-xs"
                      />
                  </div>
                    {answerSignal && (
                      <div className="space-y-2">
                          <Label htmlFor="answer-signal">Your Answer (Send this back)</Label>
                          <div className="flex items-center gap-2">
                            <Textarea
                                id="answer-signal"
                                value={answerSignal}
                                readOnly
                                rows={4}
                                className="font-code text-xs bg-muted flex-1"
                            />
                            <Button variant="ghost" size="icon" aria-label="Copy Answer" onClick={() => handleCopy(answerSignal)}><Copy /></Button>
                          </div>
                      </div>
                  )}
              </div>
          </TabsContent>
          
          <TabsContent value="show">
            <div className="space-y-4 p-1 pt-4">
              {offerSignal ? (
                <>
                  <p className="text-sm-text text-muted-foreground">
                    Have the other device scan this QR code or copy the text below.
                  </p>
                  <div className="p-4 bg-white rounded-lg flex justify-center">
                    <QRCode value={offerSignal} size={220} fgColor="#09090b" bgColor="#ffffff" />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="offer-signal">Your Connection Offer</Label>
                      <div className="flex items-center gap-2">
                        <Textarea
                            id="offer-signal"
                            value={offerSignal}
                            readOnly
                            rows={4}
                            className="font-code text-xs bg-muted flex-1"
                        />
                        <Button variant="ghost" size="icon" aria-label="Copy Offer" onClick={() => handleCopy(offerSignal)}><Copy /></Button>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="pasted-answer">Pasted Answer from Peer</Label>
                      <Textarea
                          id="pasted-answer"
                          placeholder="Once the other device generates an answer, paste it here."
                          value={pastedSignal}
                          onChange={(e) => setPastedSignal(e.target.value)}
                          rows={4}
                          className="font-code text-xs"
                      />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="ml-2">Generating offer...</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
            <DialogClose asChild>
                <Button variant="outline">
                    Cancel
                </Button>
            </DialogClose>
            <Button onClick={handleConnect} disabled={!pastedSignal || status === 'connecting'}>
                {status === 'connecting' ? <><Loader2 className="animate-spin" /><span>Connecting...</span></> : 'Connect'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
