'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { cn } from "@/lib/utils";
import { usePeerStore } from "@/connection/peer";
import { Wifi, WifiOff, Loader } from "lucide-react";

export function DeviceList() {
  const { status } = usePeerStore();

  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return { 
          message: "Remote Peer", 
          desc: "Ready for transfer.",
          icon: <Wifi className="w-5 h-5 text-primary" />,
          statusClass: 'bg-primary'
        };
      case 'connecting':
        return { 
          message: "Connecting...", 
          desc: "Waiting for peer response.",
          icon: <Loader className="w-5 h-5 text-muted-foreground animate-spin" />,
          statusClass: 'bg-yellow-500'
        };
      case 'error':
        return { 
          message: "Connection Failed", 
          desc: "An error occurred.",
          icon: <WifiOff className="w-5 h-5 text-destructive" />,
          statusClass: 'bg-destructive'
        };
      case 'disconnected':
      default:
        return { 
          message: "No Active Peer", 
          desc: "Pair a device to begin.",
          icon: <WifiOff className="w-5 h-5 text-muted-foreground" />,
          statusClass: 'bg-muted-foreground'
        };
    }
  };

  const { message, desc, icon, statusClass } = getStatusInfo();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Active Peer</CardTitle>
        <CardDescription>The device you are connected to.</CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'disconnected' ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            {message}
          </div>
        ) : (
          <ul className="space-y-4">
            <li className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>{icon}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{message}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", statusClass)}></span>
                <span className="text-sm text-muted-foreground capitalize">{status}</span>
              </div>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
