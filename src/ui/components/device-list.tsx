'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Avatar, AvatarFallback } from "@/ui/avatar";
import { cn } from "@/lib/utils";
import { usePeerStore } from "@/connection/peer";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

export function DeviceList() {
  const { status } = usePeerStore();

  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return { 
          message: "Remote Peer", 
          desc: "Ready for transfer.",
          icon: <Wifi className="w-5 h-5 text-primary" />,
          statusClass: 'bg-green-500'
        };
      case 'connecting':
        return { 
          message: "Connecting...", 
          desc: "Waiting for peer response.",
          icon: <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />,
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
        <CardTitle className="text-h2">Active Peer</CardTitle>
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
              <Avatar className="h-12 w-12 bg-muted flex items-center justify-center">
                <AvatarFallback className="bg-transparent">{icon}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{message}</p>
                <p className="text-sm-text text-muted-foreground">{desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", statusClass)}></span>
                <span className="text-sm-text text-muted-foreground capitalize">{status}</span>
              </div>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
