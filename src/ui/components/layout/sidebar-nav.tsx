"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, History, Settings, Shield } from "lucide-react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/ui/sidebar";
import { Separator } from "@/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";

export function SidebarNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-headline font-bold">BlackWire</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 flex-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/")} tooltip="Transfer">
              <Link href="/">
                <Send />
                <span>Transfer</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/history")} tooltip="Transfer History">
              <Link href="/history">
                <History />
                <span>History</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Separator className="my-2" />
        <div className="flex items-center gap-3 p-2 mt-2 rounded-lg bg-muted/50">
          <Avatar>
            <AvatarImage src="https://picsum.photos/40/40" width={40} height={40} data-ai-hint="person avatar" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">User</span>
            <span className="text-xs text-muted-foreground truncate">user@blackwire.dev</span>
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
