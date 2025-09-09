"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from "@/ui/shadcn/card";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransferStore } from '@/core/transfer';

export function FileDropzone() {
  const addFiles = useTransferStore(state => state.addFiles);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
    noKeyboard: true
  });

  return (
    <Card 
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed h-full flex items-center justify-center transition-colors cursor-pointer", 
        isDragActive ? "border-accent bg-accent/20" : "bg-card hover:border-primary/50"
      )}
    >
      <input {...getInputProps()} />
      <CardContent className="text-center p-6 md:p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-headline text-xl font-semibold">
              {isDragActive ? "Drop the files here ..." : "Drag & drop files here"}
            </h3>
            <p className="text-muted-foreground">or click to browse</p>
          </div>
          <p className="text-xs text-muted-foreground">End-to-end encrypted. Max 10GB.</p>
        </div>
      </CardContent>
    </Card>
  );
}
