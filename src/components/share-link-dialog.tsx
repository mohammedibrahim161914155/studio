"use client"

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Link as LinkIcon, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ShareLinkDialog() {
  const { toast } = useToast();
  
  const copyLink = () => {
    const link = "https://blackwire.dev/s/aJk8sL3dF";
    navigator.clipboard.writeText(link);
    toast({
        title: "Link Copied!",
        description: "The shareable link has been copied to your clipboard.",
      });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkIcon className="mr-2 h-4 w-4" />
          Share via Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Create Share Link</DialogTitle>
          <DialogDescription>
            Share files securely with a one-time link. It will expire after first use or 24 hours.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Switch id="password-protect" />
            <Label htmlFor="password-protect">Protect with a password</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Enter a strong password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">Shareable Link</Label>
             <div className="flex items-center space-x-2">
                <Input id="link" defaultValue="https://blackwire.dev/s/aJk8sL3dF" readOnly />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy Link</span>
                </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Generate Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
