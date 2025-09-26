
'use client';
import { useState, useEffect, useRef } from "react";
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
import { QrCode, ScanLine, Loader2, Copy, VideoOff } from "lucide-react";
import QRCode from "qrcode.react";
import { usePeerStore } from "@/connection/peer";
import { Textarea } from "@/ui/textarea";
import { Label } from "@/ui/label";
import { useToast } from "@/hooks/use-toast";
import { type SignalData } from "simple-peer";
import jsQR from "jsqr";
import { Alert, AlertDescription, AlertTitle } from "@/ui/alert";

const QrScanner = ({ onScan }: { onScan: (data: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const { toast } = useToast();
  const animationFrameId = useRef<number>();

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            onScan(code.data);
            return;
          }
        }
      }
      animationFrameId.current = requestAnimationFrame(tick);
    };

    const getCameraPermission = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          animationFrameId.current = requestAnimationFrame(tick);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };
    
    getCameraPermission();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan, toast]);

  return (
    <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="absolute inset-0 border-4 border-white/50 rounded-lg" style={{ clipPath: 'polygon(0% 0%, 0% 100%, 25% 100%, 25% 25%, 75% 25%, 75% 75%, 25% 75%, 25% 100%, 100% 100%, 100% 0%)' }} />

      {hasCameraPermission === false && (
        <Alert variant="destructive" className="absolute m-4">
          <VideoOff className="h-4 w-4" />
          <AlertTitle>Camera Access Required</AlertTitle>
          <AlertDescription>
            Please allow camera access to scan a QR code.
          </AlertDescription>
        </Alert>
      )}
       {hasCameraPermission === null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 animate-spin text-white"/>
          <p className="text-white mt-2">Requesting camera...</p>
        </div>
      )}
    </div>
  );
};


export function QrCodeDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean)}) {
  const [activeTab, setActiveTab] = useState("share");
  
  const status = usePeerStore(s => s.status);
  const activePeer = usePeerStore(s => s.activePeer);
  const currentOffer = usePeerStore(s => s.currentOffer);
  const currentAnswer = usePeerStore(s => s.currentAnswer);

  const signal = usePeerStore(s => s.signal);
  const connectFromOffer = usePeerStore(s => s.connectFromOffer);
  const createPeerAsInitiator = usePeerStore(s => s.createPeerAsInitiator);
  const destroyPeer = usePeerStore(s => s.destroyPeer);

  const [pastedSignal, setPastedSignal] = useState("");
  const { toast } = useToast();

  const offerSignalString = currentOffer ? JSON.stringify(currentOffer) : "";
  const answerSignalString = currentAnswer ? JSON.stringify(currentAnswer) : "";
  
  // Effect to manage state when dialog opens/closes
  useEffect(() => {
    if(!open) {
      setPastedSignal("");
      setTimeout(() => setActiveTab("share"), 200);
    } else {
        // Ensure an offer exists when opening
        if(!currentOffer) {
            createPeerAsInitiator();
        }
    }
  }, [open, currentOffer, createPeerAsInitiator]);

  // Effect to close dialog on successful connection
  useEffect(() => {
    if(status === 'connected' && open) {
        toast({
            title: "Successfully Connected!",
            description: `You are now connected to ${activePeer?.name || 'your peer'}.`,
        });
        setTimeout(() => onOpenChange(false), 500);
    }
  }, [status, toast, activePeer, open, onOpenChange]);

  const handleQrScan = (data: string) => {
    if (data) {
        setPastedSignal(data);
        handleConnectWithOffer(data);
    }
  };
  
  const handleConnectWithOffer = (offerString: string) => {
    try {
        const parsedSignal: SignalData = JSON.parse(offerString);
        if (parsedSignal.type !== 'offer') {
            throw new Error("Scanned code or pasted text is not a valid connection offer.");
        }
        destroyPeer(); // Destroy any existing peer before creating a new one
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

  const handleTabChange = (value: string) => {
      setActiveTab(value);
      setPastedSignal("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => onOpenChange(true)}>
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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share">
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
                {answerSignalString ? (
                    <div className="space-y-2">
                        <Label htmlFor="answer-signal">Your Answer (Send this back)</Label>
                        <p className="text-sm-text text-muted-foreground">Have the other device scan this QR code, or copy the text to send back.</p>
                        <div className="p-4 bg-white rounded-lg flex justify-center">
                            <QRCode value={answerSignalString} size={220} fgColor="#09090b" bgColor="#ffffff" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Textarea id="answer-signal" value={answerSignalString} readOnly rows={4} className="font-code text-xs bg-muted flex-1"/>
                            <Button variant="ghost" size="icon" aria-label="Copy Answer" onClick={() => handleCopy(answerSignalString)}><Copy /></Button>
                        </div>
                        <p className="text-xs text-muted-foreground">The connection will be established once the other peer receives your answer.</p>
                    </div>
                ) : (
                    <>
                        <p className="text-sm-text text-muted-foreground">
                            Scan the other device's QR code or paste their offer text below.
                        </p>
                        <QrScanner onScan={handleQrScan} />
                        <div className="relative flex items-center justify-center">
                            <span className="absolute bg-background px-2 text-xs text-muted-foreground">OR</span>
                            <div className="w-full h-px bg-border"></div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pasted-offer">Paste Connection Offer</Label>
                            <Textarea id="pasted-offer" placeholder="Paste the offer text here..." value={pastedSignal} onChange={(e) => setPastedSignal(e.target.value)} rows={4} className="font-code text-xs"/>
                        </div>
                    </>
                )}
                <DialogFooter className="mt-4">
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                     {!answerSignalString && (
                        <Button onClick={() => handleConnectWithOffer(pastedSignal)} disabled={!pastedSignal || !!answerSignalString}>
                            Receive Offer
                        </Button>
                     )}
                </DialogFooter>
              </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
