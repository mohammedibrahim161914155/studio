"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { useTransferStore } from "@/core/transfer";
import { TransferListItem } from "./transfer-list-item";

export function TransferList() {
  const files = useTransferStore(state => state.files);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h2">Transfer Queue</CardTitle>
        <CardDescription>Files ready to be sent to your peer.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%] pl-6">File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No files selected. Drag files to the dropzone to get started.
                    </TableCell>
                </TableRow>
            ) : (
                files.map((transfer) => (
                    <TransferListItem key={transfer.file.name} transfer={transfer} />
                ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
