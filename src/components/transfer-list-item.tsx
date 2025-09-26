
"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trash2, File, CheckCircle2, AlertTriangle, ShieldCheck, Hourglass, RefreshCw } from "lucide-react";
import { type TransferFile, useTransferStore } from "@/core/transfer";
import { useEffect, useState } from "react";
import Image from "next/image";

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

const StatusInfo = ({ status }: { status: TransferFile['status'] }) => {
    switch (status) {
        case 'complete':
            return <><CheckCircle2 className="w-4 h-4 text-green-500" /> <span className="text-green-500">Verified</span></>;
        case 'error':
            return <><AlertTriangle className="w-4 h-4 text-destructive" /> <span className="text-destructive">Error</span></>;
        case 'verifying':
            return <><Hourglass className="w-4 h-4 text-yellow-500 animate-spin" /> <span>Verifying...</span></>;
        case 'resuming':
            return <><RefreshCw className="w-4 h-4 text-blue-500 animate-spin" /> <span>Resuming...</span></>;
        case 'sending':
            return <><ShieldCheck className="w-4 h-4 text-sky-500" /> <span>In Progress</span></>;
        default:
             return <><ShieldCheck className="w-4 h-4 text-muted-foreground" /> <span>Pending</span></>;
    }
}

const FilePreview = ({ file }: { file: File }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const isImage = file.type.startsWith('image/');

    useEffect(() => {
        let objectUrl: string | null = null;
        if (isImage && file.size > 0) {
            objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
        }

        // Cleanup function to revoke the object URL if the component unmounts
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [file, isImage]);

    if (isImage && preview) {
        return (
            <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                <Image src={preview} alt={`Preview of ${file.name}`} width={40} height={40} className="object-cover w-full h-full" />
            </div>
        )
    }

    return <File className="w-6 h-6 text-muted-foreground flex-shrink-0" />;
}


export function TransferListItem({ transfer }: TransferListItemProps) {
  const removeFile = useTransferStore(state => state.removeFile);

  const transferSpeed = transfer.speed > 0 ? `${formatBytes(transfer.speed)}/s` : '';

  return (
    <TableRow className="transition-colors hover:bg-muted/50">
      <TableCell className="w-[50%]">
        <div className="flex items-center gap-4">
          <FilePreview file={transfer.file} />
          <div className="flex-1 overflow-hidden">
            <p className="font-medium truncate text-body-text">{transfer.file.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={transfer.progress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground font-mono w-12 text-right">{transfer.progress}%</span>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-code text-sm-text">
        <div>{formatBytes(transfer.file.size)}</div>
        <div className="text-xs text-muted-foreground h-4">{transfer.status === 'sending' ? transferSpeed : ''}</div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm-text">
            <StatusInfo status={transfer.status} />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" onClick={() => removeFile(transfer.file.name)} aria-label={`Remove ${transfer.file.name} from queue`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
