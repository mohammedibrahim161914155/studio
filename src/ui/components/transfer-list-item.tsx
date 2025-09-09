"use client";

import { TableCell, TableRow } from "@/ui/table";
import { Progress } from "@/ui/progress";
import { Button } from "@/ui/button";
import { Trash2, File } from "lucide-react";
import { TransferFile, useTransferStore } from "@/core/transfer";
import { Badge } from "@/ui/badge";

interface TransferListItemProps {
  transfer: TransferFile;
}

// Helper to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatSpeed = (bytes: number) => {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const formatEta = (bytesRemaining: number, speed: number) => {
    if (speed === 0 || bytesRemaining === 0) return '~';
    const seconds = Math.ceil(bytesRemaining / speed);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    return `${Math.ceil(seconds / 3600)}h`;
}


export function TransferListItem({ transfer }: TransferListItemProps) {
  const removeFile = useTransferStore(state => state.removeFile);

  const getStatusBadgeVariant = () => {
    switch(transfer.status) {
      case 'complete': return 'success';
      case 'sending': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  }

  const bytesRemaining = transfer.file.size * (1 - transfer.progress / 100);

  return (
    <TableRow className="transition-colors hover:bg-muted/50">
      <TableCell className="w-[50%]">
        <div className="flex items-center gap-4">
          <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 overflow-hidden">
            <p className="font-medium truncate text-body-text">{transfer.file.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={transfer.progress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground font-mono w-12 text-right">{transfer.progress}%</span>
            </div>
             <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground font-mono">{formatSpeed(transfer.speed)}</span>
                <span className="text-xs text-muted-foreground font-mono">ETA: {formatEta(bytesRemaining, transfer.speed)}</span>
             </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-code text-sm-text">{formatBytes(transfer.file.size)}</TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant()} className="capitalize text-xs">{transfer.status}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" onClick={() => removeFile(transfer.file.name)} aria-label={`Remove ${transfer.file.name} from queue`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
