
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePeerStore } from "@/connection/peer";
import { usePeerManagerStore, type Peer } from "@/core/peer-manager";
import { Wifi, WifiOff, Loader2, Trash2, Edit, Check, X, ShieldCheck, ShieldAlert, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const StatusIcon = ({ peer, isActive }: { peer: Peer, isActive: boolean }) => {
  const currentStatus = isActive ? usePeerStore(s => s.status) : peer.status;
  
  switch (currentStatus) {
    case 'connected':
      return peer.trusted ? <BadgeCheck className="w-5 h-5 text-green-500" /> : <Wifi className="w-5 h-5 text-green-500" />;
    case 'verifying':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'connecting':
      return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />;
    case 'error':
      return <WifiOff className="w-5 h-5 text-destructive" />;
    default:
      return <WifiOff className="w-5 h-5 text-muted-foreground" />;
  }
};

const PeerItem = ({ peer }: { peer: Peer }) => {
    const { connectToPeer, destroyPeer, status } = usePeerStore();
    const activePeer = usePeerStore(s => s.activePeer);
    const { removePeer, updatePeerName, updatePeerTrusted } = usePeerManagerStore();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(peer.name);

    const isCurrentlyActive = activePeer?.id === peer.id;

    const handleConnect = () => {
        if (isCurrentlyActive && (status === 'connected' || status === 'verifying')) {
            destroyPeer();
            toast({ title: "Disconnected", description: `Disconnected from ${peer.name}.` });
        } else if (status === 'disconnected') {
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
        if(name.trim()) {
            updatePeerName(peer.id, name);
            setIsEditing(false);
        }
    };

    const handleTrustToggle = () => {
        if (peer.publicKey) {
            updatePeerTrusted(peer.id, !peer.trusted);
            toast({
                title: peer.trusted ? "Device Untrusted" : "Device Trusted",
                description: `${peer.name} is ${peer.trusted ? 'no longer a trusted device.' : 'now a trusted device.'}`
            });
        } else {
            toast({
                variant: 'destructive',
                title: "Cannot Trust Device",
                description: "A secure key exchange has not been completed. Please reconnect to the device."
            });
        }
    }
    
    const getStatusText = () => {
        if(!isCurrentlyActive) return peer.status;
        if(status === 'verifying') return 'verifying...';
        return status;
    }

    const isConnectButtonDisabled = status !== 'disconnected' && !isCurrentlyActive;

    return (
        <li className="flex flex-col gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 border-b">
            <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 bg-muted flex items-center justify-center">
                    <AvatarFallback className="bg-transparent">
                        <StatusIcon peer={peer} isActive={isCurrentlyActive} />
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveName}><Check className="w-4 h-4"/></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(false)}><X className="w-4 h-4"/></Button>
                        </div>
                    ) : (
                       <div className="flex items-center gap-2">
                         <p className="font-medium truncate">{peer.name}</p>
                       </div>
                    )}
                    <p className="text-sm-text text-muted-foreground truncate">{getStatusText()}</p>
                </div>
                 <Button size="sm" variant={isCurrentlyActive && status === 'connected' ? 'destructive' : 'default'} onClick={handleConnect} className="w-24" disabled={isConnectButtonDisabled}>
                    {isCurrentlyActive && status === 'connected' ? 'Disconnect' : 'Connect'}
                </Button>
            </div>
            <div className="flex items-center justify-between pl-14">
                <div className="flex items-center gap-2">
                    <Button onClick={handleTrustToggle} variant="outline" size="sm" disabled={!peer.publicKey}>
                        {peer.trusted ? <ShieldAlert className="w-4 h-4"/> : <ShieldCheck className="w-4 h-4"/>}
                        <span>{peer.trusted ? 'Untrust' : 'Trust Device'}</span>
                    </Button>
                </div>
                <div className="flex items-center gap-1">
                    {!isEditing && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4" /></Button>}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleRemove}><Trash2 className="w-4 h-4" /></Button>
                </div>
            </div>
        </li>
    );
};


export function DeviceList() {
  const { peers } = usePeerManagerStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h2">My Devices</CardTitle>
        <CardDescription>Manage and connect to your paired devices.</CardDescription>
      </CardHeader>
      <CardContent>
        {peers.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            No paired devices. Use "Pair Device" to add one.
          </div>
        ) : (
          <ul className="space-y-1">
            {peers.map((peer) => <PeerItem key={peer.id} peer={peer} />)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
