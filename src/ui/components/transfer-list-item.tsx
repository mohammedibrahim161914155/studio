"use client";

import { TableCell, TableRow } from "@/ui/table";
import { Progress } from "@/ui/progress";
import { Button } from "@/ui/button";
import { Trash2, File, Folder } from "lucide-react";
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

export function TransferListItem({ transfer }: TransferListItemProps) {
  const removeFile = useTransferStore(state => state.removeFile);

  const getStatusBadgeVariant = () => {
    switch(transfer.status) {
      case 'complete': return 'default';
      case 'sending': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <File className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1 overflow-hidden">
            <p className="font-medium truncate">{transfer.file.name}</p>
            <Progress value={transfer.progress} className="h-2 mt-1" />
          </div>
        </div>
      </TableCell>
      <TableCell className="font-code">{formatBytes(transfer.file.size)}</TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant()} className="capitalize">{transfer.status}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" onClick={() => removeFile(transfer.file.name)}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}
