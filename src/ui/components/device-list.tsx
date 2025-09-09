'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Avatar, AvatarFallback } from "@/ui/avatar";
import { cn } from "@/lib/utils";
import { usePeerStore, PeerStatus } from "@/connection/peer";
import { usePeerManagerStore, Peer } from "@/core/peer-manager";
import { Wifi, WifiOff, Loader2, Trash2, Edit, Check, X } from "lucide-react";
import { Button } from "@/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/ui/input";

const StatusIcon = ({ status }: { status: Peer['status'] }) => {
  switch (status) {
    case 'connected':
      return <Wifi className="w-5 h-5 text-green-500" />;
    case 'connecting':
      return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />;
    case 'error':
      return <WifiOff className="w-5 h-5 text-destructive" />;
    default:
      return <WifiOff className="w-5 h-5 text-muted-foreground" />;
  }
};

const PeerItem = ({ peer }: { peer: Peer }) => {
    const { connectToPeer, activePeer, destroyPeer } = usePeerStore();
    const { removePeer, updatePeerName } = usePeerManagerStore();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(peer.name);

    const isCurrentlyActive = activePeer?.id === peer.id;

    const handleConnect = () => {
        if (isCurrentlyActive && usePeerStore.getState().status === 'connected') {
            destroyPeer();
            toast({ title: "Disconnected", description: `Disconnected from ${peer.name}.` });
        } else {
            toast({ title: "Connecting...", description: `Attempting to connect to ${peer.name}.` });
            connectToPeer(peer);
        }
    };

    const handleRemove = () => {
        if(isCurrentlyActive) destroyPeer();
        removePeer(peer.id);
        toast({ variant: 'destructive', title: "Peer Removed", description: `${peer.name} has been removed from your list.` });
    };

    const handleSaveName = () => {
        updatePeerName(peer.id, name);
        setIsEditing(false);
    };

    return (
        <li className="flex items-center gap-4 p-2 rounded-lg transition-colors hover:bg-muted/50">
            <Avatar className="h-12 w-12 bg-muted flex items-center justify-center">
                <AvatarFallback className="bg-transparent">
                    <StatusIcon status={isCurrentlyActive ? usePeerStore.getState().status : peer.status} />
                </AvatarFallback>
            </Avatar>
            <div className="flex-1">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveName}><Check className="w-4 h-4"/></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(false)}><X className="w-4 h-4"/></Button>
                    </div>
                ) : (
                    <p className="font-medium">{peer.name}</p>
                )}
                <p className="text-sm-text text-muted-foreground truncate">{isCurrentlyActive ? usePeerStore.getState().status : peer.status}</p>
            </div>
            <div className="flex items-center gap-1">
                {!isEditing && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4" /></Button>}
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleRemove}><Trash2 className="w-4 h-4" /></Button>
            </div>
             <Button size="sm" variant={isCurrentlyActive && usePeerStore.getState().status === 'connected' ? 'destructive' : 'default'} onClick={handleConnect} className="w-24">
                {isCurrentlyActive && usePeerStore.getState().status === 'connected' ? 'Disconnect' : 'Connect'}
            </Button>
        </li>
    );
};


export function DeviceList() {
  const { peers } = usePeerManagerStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h2">Saved Devices</CardTitle>
        <CardDescription>Manage and connect to your saved peers.</CardDescription>
      </CardHeader>
      <CardContent>
        {peers.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            No saved devices.
          </div>
        ) : (
          <ul className="space-y-2">
            {peers.map((peer) => <PeerItem key={peer.id} peer={peer} />)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
