
'use client';

import { useState } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePeerStore } from '@/connection/peer';
import { useBenchmarkStore, BenchmarkResult } from '@/core/benchmark';
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from "date-fns";
import { Beaker, Zap, Timer, Server, BarChart2, Trash2 } from "lucide-react";

// Helper to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const BenchmarkResults = () => {
    const { results, clearResults } = useBenchmarkStore();

    if (results.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border border-dashed rounded-lg h-64">
                <BarChart2 className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-semibold">No Benchmark Data</h3>
                <p>Run a benchmark test to see performance results here.</p>
            </div>
        )
    }
    
    const chartData = results.map(r => ({
        name: format(new Date(r.timestamp), "h:mm a"),
        Throughput: r.throughput,
    }));

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-h2">Benchmark History</CardTitle>
                    <CardDescription>Performance results from previous test runs.</CardDescription>
                </div>
                <Button variant="destructive" size="sm" onClick={clearResults}>
                    <Trash2 />
                    <span>Clear Results</span>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis unit=" Mbps" />
                            <Tooltip
                                contentStyle={{
                                    background: "hsl(var(--background))",
                                    borderColor: "hsl(var(--border))"
                                }}
                                itemStyle={{ color: "hsl(var(--foreground))" }}
                                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                            />
                            <Legend />
                            <Bar dataKey="Throughput" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

const BenchmarkRunner = () => {
    const { status: peerStatus } = usePeerStore();
    const { startBenchmark, progress, status, currentRunId } = useBenchmarkStore();
    const { toast } = useToast();

    const handleStartBenchmark = () => {
        if (peerStatus !== 'connected') {
            toast({
                variant: 'destructive',
                title: 'Not Connected',
                description: 'Please connect to a peer to run a benchmark test.',
            });
            return;
        }
        startBenchmark();
    }

    const isBenchmarking = status !== 'idle';
    
    const getStatusText = () => {
        switch(status) {
            case 'sending': return 'Sending data...';
            case 'receiving': return 'Receiving data...';
            case 'verifying': return 'Verifying data...';
            default: return 'Ready to start';
        }
    }

    return (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="text-h2">Performance Benchmark</CardTitle>
                <CardDescription>Test the raw transfer speed of your peer-to-peer connection.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 border rounded-lg">
                           <Zap className="w-8 h-8 text-primary" />
                           <div>
                               <p className="font-semibold">Throughput Test</p>
                               <p className="text-sm text-muted-foreground">Measures data transfer speed in Mbps.</p>
                           </div>
                        </div>
                         <div className="flex items-center gap-4 p-4 border rounded-lg">
                           <Server className="w-8 h-8 text-primary" />
                           <div>
                               <p className="font-semibold">100 MB Payload</p>
                               <p className="text-sm text-muted-foreground">Sends in-memory data to isolate network speed.</p>
                           </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-muted/50 p-8 rounded-lg">
                        <Button onClick={handleStartBenchmark} disabled={isBenchmarking || peerStatus !== 'connected'} size="lg">
                            <Beaker className="w-6 h-6" />
                            <span>{isBenchmarking ? 'Test in Progress...' : 'Start Benchmark Test'}</span>
                        </Button>
                        <p className="text-sm text-muted-foreground mt-4">{peerStatus === 'connected' ? `Connected to peer. ${getStatusText()}`: 'Not connected to a peer.'}</p>
                        {isBenchmarking && (
                            <div className="w-full mt-4">
                                <p className="text-center font-mono text-lg">{progress.toFixed(1)}%</p>
                                <div className="w-full bg-background rounded-full h-2.5 mt-1 border">
                                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.2s ease-in-out' }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function BenchmarkPage() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar>
          <SidebarNav />
        </Sidebar>
        <div className="flex flex-col">
          <SidebarInset>
            <Header />
            <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
                <BenchmarkRunner />
                <BenchmarkResults />
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
