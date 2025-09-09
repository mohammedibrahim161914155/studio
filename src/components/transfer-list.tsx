"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pause, Play, Trash2, File, Folder } from "lucide-react";

type Transfer = {
  id: number;
  name: string;
  type: "file" | "folder";
  size: string;
  progress: number;
  status: "sending" | "paused" | "complete";
};


const initialTransfers: Transfer[] = [
  // { id: 1, name: "project_files.zip", type: "file", size: "1.2 GB", progress: 30, status: "sending" },
  // { id: 2, name: "kyber-dilithium-impl.pdf", type: "file", size: "2.5 MB", progress: 85, status: "sending" },
  // { id: 3, name: "summer_vacation_photos", type: "folder", size: "4.8 GB", progress: 10, status: "paused" },
  // { id: 4, name: "presentation.pptx", type: "file", size: "150 MB", progress: 100, status: "complete" },
];

export function TransferList() {
  const [transfers, setTransfers] = useState(initialTransfers);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // This is a mock progress update. In a real app, this would be driven by WebRTC data channel progress events.
    const interval = setInterval(() => {
      setTransfers((prevTransfers) =>
        prevTransfers.map((t) => {
          if (t.status === "sending" && t.progress < 100) {
            const newProgress = Math.min(t.progress + Math.random() * 5, 100);
            return {
              ...t,
              progress: newProgress,
              status: newProgress === 100 ? "complete" : "sending",
            };
          }
          return t;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const togglePause = (id: number) => {
    setTransfers(transfers.map(t => t.id === id ? { ...t, status: t.status === 'paused' ? 'sending' : 'paused' } : t));
  }

  const removeTransfer = (id: number) => {
    setTransfers(transfers.filter(t => t.id !== id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Transfer Queue</CardTitle>
        <CardDescription>Your ongoing and completed file transfers.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No active transfers.
                    </TableCell>
                </TableRow>
            )}
            {transfers.map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {transfer.type === 'file' ? <File className="w-5 h-5 text-muted-foreground" /> : <Folder className="w-5 h-5 text-muted-foreground" />}
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium truncate">{transfer.name}</p>
                      <Progress value={transfer.progress} className="h-2 mt-1" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-code">{transfer.size}</TableCell>
                <TableCell>
                  <span className="capitalize">{transfer.status}</span>
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => togglePause(transfer.id)} disabled={transfer.status === 'complete'}>
                        {transfer.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        <span className="sr-only">{transfer.status === 'paused' ? 'Resume' : 'Pause'}</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeTransfer(transfer.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}