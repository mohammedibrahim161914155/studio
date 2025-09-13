"use client";

import { useLogStore, LogEntry } from "@/core/transfer-log";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { File, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { ScrollArea } from "@/ui/scroll-area";

// Helper to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const LogItem = ({ log }: { log: LogEntry }) => {
    const DirectionIcon = log.direction === 'sent' ? ArrowUpRight : ArrowDownLeft;
    const StatusIcon = log.status === 'complete' ? CheckCircle2 : AlertTriangle;
    const statusColor = log.status === 'complete' ? 'text-green-500' : 'text-destructive';

    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-muted-foreground"/>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-medium truncate">{log.fileName}</p>
                        <p className="text-xs text-muted-foreground">{log.fileType}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                 <div className="flex items-center gap-2">
                    <DirectionIcon className="w-4 h-4"/>
                    <span>{log.direction === 'sent' ? 'To:' : 'From:'} {log.peerId}</span>
                </div>
            </TableCell>
            <TableCell className="font-code text-sm-text">{formatBytes(log.fileSize)}</TableCell>
             <TableCell>
                 <div className="flex items-center gap-2">
                    <StatusIcon className={`w-4 h-4 ${statusColor}`}/>
                    <span className="capitalize">{log.status}</span>
                </div>
             </TableCell>
            <TableCell className="text-right text-muted-foreground">{format(new Date(log.timestamp), "PPp")}</TableCell>
        </TableRow>
    )
}

export function TransferHistoryList() {
    const { logs, clearLogs } = useLogStore();

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-h2">Transfer History</CardTitle>
                    <CardDescription>A log of your completed transfers.</CardDescription>
                </div>
                <Button variant="destructive" onClick={clearLogs} disabled={logs.length === 0}>
                    <Trash2 className="w-4 h-4"/>
                    <span>Clear History</span>
                </Button>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">File</TableHead>
                            <TableHead>Peer</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                    No transfer history found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map(log => <LogItem key={log.id} log={log}/>)
                        )}
                    </TableBody>
                </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
