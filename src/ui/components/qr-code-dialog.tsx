import { Button } from "@/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/shadcn/dialog";
import { QrCode } from "lucide-react";

const QrCodeSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-full h-full text-foreground" fill="currentColor">
      <path d="M120,120h16v16h-16Z" opacity="0.2"></path>
      <path d="M188,40H156a8,8,0,0,0-8,8v24h24a8,8,0,0,0,8-8V48A8,8,0,0,0,188,40ZM172,64H156V48h16Z"></path>
      <path d="M100,40H68a8,8,0,0,0-8,8v24h24a8,8,0,0,0,8-8V48A8,8,0,0,0,100,40ZM84,64H68V48h16Z"></path>
      <path d="M68,100a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v24h24a8,8,0,0,0,8-8Z"></path>
      <path d="M216,48V68a8,8,0,0,1-8,8H184V92h24a8,8,0,0,0,8-8V60h16a8,8,0,0,0,8-8V48a8,8,0,0,0-16,0V40a8,8,0,0,0-8-8H196V24a8,8,0,0,0-16,0v8H156a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0V40h24V64H184V84a8,8,0,0,0,8,8h24v24h-8a8,8,0,0,0,0,16h8v16h-8a8,8,0,0,0,0,16h8v24a8,8,0,0,0,8,8h24a8,8,0,0,0,8-8V204h8a8,8,0,0,0,0-16h-8V164h8a8,8,0,0,0,0-16h-8V124a8,8,0,0,0-8-8H204v-8a8,8,0,0,0-8-8H164v-8h16a8,8,0,0,0,8-8v-8a8,8,0,0,0-16,0V84h24V68h8a8,8,0,0,0,16,0V48ZM200,196h-8v8h8Zm24-16h-8V172h8Zm-16-48v8h-8V132Zm-8,32v-8h8v8Zm-40,8h16v-8h8v-8H164V140h16v-8H164v-8h32a8,8,0,0,0,8-8v-8a8,8,0,0,0-8-8H164a8,8,0,0,0-8,8v8a8,8,0,0,0,8,8v8h-8v8h-8v8h8v8h-8v8h8Zm-24-48h8v8h-8Zm8,16h-8v8h8Zm-32-16h16v16H112Zm-8,16h-8v8h8Zm8-32h8v16h-8v-8h-8v-8h8Zm-40-8H68V92h8Z"></path>
      <path d="M128,40a8,8,0,0,0-8,8v8h16V48a8,8,0,0,0-8-8Z"></path>
      <path d="M48,84H24a8,8,0,0,0-8,8v32H40V100h8Zm0,48H24v32a8,8,0,0,0,8,8H60V164H48Zm56,40v16h24v16H104v16h24a8,8,0,0,0,8-8V204h16v-8H136v-8h16V172H136v-8h-8v24h-8v-8h-8v-8h16V164H104a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h24V204h-8v-8Zm-8-96h-8v8h-8v8h16v8h8v-8h8v-8h-8v-8ZM68,140H48v24H68Zm32,0H84v24h16Zm-24,8v8h8v-8Z"></path>
      <path d="M208,40a8,8,0,0,0-8,8V64a8,8,0,0,0,16,0V48A8,8,0,0,0,208,40Zm0,16h-8V48h8Z"></path>
      <path d="M40,196a8,8,0,0,0,8,8H64a8,8,0,0,0,8-8v-8H40Zm8-8h16v8H48Z"></path>
      <path d="M40,48a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V40a8,8,0,0,0,8,8Zm0-16h8v8h-8Z"></path>
      <path d="M100,84H84v8H68v8H84v8h16V92h8V84h-8Z"></path>
      <path d="M112,68v8h16v8h8V68h-8V56h-8v12Z"></path>
    </svg>
)

export function QrCodeDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="mr-2 h-4 w-4" />
          Pair Device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="font-headline">Pair a New Device</DialogTitle>
          <DialogDescription>
            Scan this QR code with another device to securely connect them.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 bg-muted/50 rounded-lg">
            <QrCodeSvg />
        </div>
        <div className="text-center text-sm text-muted-foreground">Or enter pairing code: <span className="font-code font-bold text-foreground">A4B-9K2-3D1</span></div>
      </DialogContent>
    </Dialog>
  );
}
