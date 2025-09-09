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
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Switch } from "@/ui/switch";
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
        <Button variant="outline" disabled>
          <LinkIcon/>
          <span>Share via Link</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h2">Create Share Link</DialogTitle>
          <DialogDescription>
            Share files securely with a one-time link. It will expire after first use or 24 hours.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="password-protect" className="cursor-pointer">Protect with a password</Label>
            <Switch id="password-protect" aria-label="Toggle password protection" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Enter a strong password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">Shareable Link</Label>
             <div className="flex items-center gap-2">
                <Input id="link" defaultValue="https://blackwire.dev/s/aJk8sL3dF" readOnly className="flex-1" />
                <Button variant="ghost" size="icon" onClick={copyLink} aria-label="Copy shareable link">
                  <Copy />
                </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" variant="accent" className="w-full">Generate Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
