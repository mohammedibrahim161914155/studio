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
import { QrCode, ScanLine } from "lucide-react";
import QRCode from "qrcode.react";
import { usePeerStore } from "@/connection/peer";
import { Textarea } from "@/ui/textarea";
import { Label } from "@/ui/label";
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
      // Do not close dialog immediately, wait for connection status change
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
  
  const isConnected = status === 'connected';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <QrCode className="mr-2 h-4 w-4" />
          Pair Device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Pair a New Device</DialogTitle>
          <DialogDescription>
            Use QR codes or text to securely connect to another device.
          </DialogDescription>
        </DialogHeader>

        {isConnected ? (
           <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg text-center">
             <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Successfully Connected!</h3>
             <p className="text-sm text-green-600 dark:text-green-400 mt-1">You can now close this dialog.</p>
           </div>
        ) : (
          <Tabs defaultValue="scan" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scan" onClick={() => createPeer(false)}>
                <ScanLine className="mr-2 h-4 w-4" /> Connect
              </TabsTrigger>
              <TabsTrigger value="show" onClick={handleCreateOffer}>
                <QrCode className="mr-2 h-4 w-4" /> Share
              </TabsTrigger>
            </TabsList>
            
            {/* Tab to Scan/Paste an offer */}
            <TabsContent value="scan">
                <div className="space-y-4 p-1">
                    <p className="text-sm text-muted-foreground">
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
                            <Textarea
                                id="answer-signal"
                                value={answerSignal}
                                readOnly
                                rows={4}
                                className="font-code text-xs bg-muted"
                            />
                            <Button variant="outline" size="sm" onClick={() => handleCopy(answerSignal)}>Copy Answer</Button>
                        </div>
                    )}
                </div>
            </TabsContent>
            
            {/* Tab to Show QR/Offer */}
            <TabsContent value="show">
              <div className="space-y-4 p-1">
                {offerSignal ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Have the other device scan this QR code or copy the text below.
                    </p>
                    <div className="p-4 bg-white rounded-lg flex justify-center">
                      <QRCode value={offerSignal} size={200} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="offer-signal">Your Connection Offer</Label>
                        <Textarea
                            id="offer-signal"
                            value={offerSignal}
                            readOnly
                            rows={4}
                            className="font-code text-xs bg-muted"
                        />
                        <Button variant="outline" size="sm" onClick={() => handleCopy(offerSignal)}>Copy Offer</Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-48">
                    <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                )}
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
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
                {isConnected ? 'Close' : 'Cancel'}
            </Button>
            {!isConnected && (
                <Button onClick={handleConnect} disabled={!pastedSignal || status === 'connecting'}>
                    {status === 'connecting' ? 'Connecting...' : 'Connect'}
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
