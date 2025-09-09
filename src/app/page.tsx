import { SidebarProvider, Sidebar, SidebarInset } from "@/ui/shadcn/sidebar";
import { Header } from "@/components/layout/header";
import { FileDropzone } from "@/components/file-dropzone";
import { TransferList } from "@/components/transfer-list";
import { DeviceList } from "@/components/device-list";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export default function Home() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar>
          <SidebarNav />
        </Sidebar>
        <div className="flex flex-col">
          <SidebarInset className="flex flex-col">
            <Header />
            <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8">
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <FileDropzone />
                </div>
                <DeviceList />
              </div>
              <TransferList />
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
