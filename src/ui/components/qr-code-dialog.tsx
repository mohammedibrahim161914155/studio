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
    peer, 
    createPeer, 
    isInitiator, 
    signal, 
    status,
    activePeer,
    currentOffer,
    setCurrentOffer,
    destroyPeer
  } = usePeerStore();
  const { updatePeerSignal, getPeer } = usePeerManagerStore();

  const [pastedSignal, setPastedSignal] = useState("");
  const { toast } = useToast();

  const activePeerDetails = activePeer ? getPeer(activePeer.id) : null;
  const answerSignal = activePeerDetails?.answer ? JSON.stringify(activePeerDetails.answer) : "";

  useEffect(() => {
    // Reset state on dialog close
    if(!open) {
      setPastedSignal("");
      setCurrentOffer(null);
      // If we're just creating an offer but not connecting, destroy the temporary peer
      if(status === 'connecting' && !activePeer) {
        destroyPeer();
      }
    }
  }, [open, status, activePeer, destroyPeer, setCurrentOffer]);

  const handleCreateOffer = () => {
    destroyPeer();
    const tempPeer = createPeer(true);
  };

  const handleConnect = () => {
    try {
      const parsedSignal = JSON.parse(pastedSignal);
      if (activePeer && activePeer.status === 'connecting') {
        // We have an active peer trying to connect, this must be the answer
        signal(parsedSignal);
        updatePeerSignal(activePeer.id, parsedSignal);
      } else {
        toast({
            variant: "destructive",
            title: "No Offer Created",
            description: "Please create an offer first or select a peer to connect to.",
        });
      }
      toast({
        title: "Connecting...",
        description: "Trying to establish a connection with the peer.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid Signal",
        description: "The pasted text is not a valid connection signal.",
      });
    }
  };

  const handleCopy = (text: string) => {
    if(!text) return;
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
        <Button variant="outline" onClick={() => setOpen(true)}>
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

        <Tabs defaultValue="share" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share" onClick={handleCreateOffer}>
              <QrCode /> Share
            </TabsTrigger>
            <TabsTrigger value="connect">
              <ScanLine /> Connect
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="share">
            <div className="space-y-4 p-1 pt-4">
              {currentOffer ? (
                <>
                  <p className="text-sm-text text-muted-foreground">
                    Have the other device scan this QR code or copy the text below. Then, paste their answer.
                  </p>
                  <div className="p-4 bg-white rounded-lg flex justify-center">
                    <QRCode value={JSON.stringify(currentOffer)} size={220} fgColor="#09090b" bgColor="#ffffff" />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="offer-signal">Your Connection Offer</Label>
                      <div className="flex items-center gap-2">
                        <Textarea
                            id="offer-signal"
                            value={JSON.stringify(currentOffer)}
                            readOnly
                            rows={4}
                            className="font-code text-xs bg-muted flex-1"
                        />
                        <Button variant="ghost" size="icon" aria-label="Copy Offer" onClick={() => handleCopy(JSON.stringify(currentOffer))}><Copy /></Button>
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

          <TabsContent value="connect">
              <div className="space-y-4 p-1 pt-4">
                  <p className="text-sm-text text-muted-foreground">
                      Paste the connection offer from the other device below. Your answer will be generated for you to send back.
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
        </Tabs>
        
        <DialogFooter className="mt-4">
            <DialogClose asChild>
                <Button variant="outline">
                    Cancel
                </Button>
            </DialogClose>
            <Button onClick={handleConnect} disabled={!pastedSignal || status === 'connecting' || status === 'connected'}>
                {status === 'connecting' ? <><Loader2 className="animate-spin" /><span>Connecting...</span></> : 'Connect'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
