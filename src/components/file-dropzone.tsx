"use client";

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDropzone() {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <Card 
      className={cn(
        "border-2 border-dashed h-full flex items-center justify-center transition-colors", 
        isDragOver ? "border-accent bg-accent/20" : "bg-card hover:border-primary/50"
      )}
      onDragEnter={() => setIsDragOver(true)}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        // Handle file drop logic
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      <CardContent className="text-center p-6 md:p-12 cursor-pointer">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-headline text-xl font-semibold">Drag & drop files here</h3>
            <p className="text-muted-foreground">or click to browse</p>
          </div>
          <p className="text-xs text-muted-foreground">End-to-end encrypted. Max 10GB.</p>
        </div>
      </CardContent>
    </Card>
  );
}
