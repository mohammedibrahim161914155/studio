"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, Share2, Smartphone, Settings, Shield, BarChart2, HardDrive } from "lucide-react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SidebarNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-h1 font-headline">BlackWire</h1>
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
            <SidebarMenuButton asChild isActive={isActive("/shared")} tooltip="Shared Links">
              <Link href="#">
                <Share2 />
                <span>Shared Links</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/devices")} tooltip="Devices">
              <Link href="#">
                <Smartphone />
                <span>Devices</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/storage")} tooltip="Storage">
              <Link href="#">
                <HardDrive />
                <span>Storage</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel>Enterprise</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/analytics")} tooltip="Analytics">
              <Link href="#">
                <BarChart2 />
                <span>Analytics</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>
      <SidebarFooter className="p-2">
        <Separator className="my-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings">
              <Link href="#">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-3 p-2 mt-2 rounded-lg bg-muted/50">
          <Avatar>
            <AvatarImage src="https://picsum.photos/40/40" width={40} height={40} data-ai-hint="person avatar" alt="User Avatar" />
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
