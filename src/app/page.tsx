import { SidebarProvider, Sidebar, SidebarInset } from "@/ui/sidebar";
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
          <SidebarInset>
            <Header />
            <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
              <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
                <div className="md:col-span-2 lg:col-span-3">
                  <FileDropzone />
                </div>
                <div className="md:col-span-1 lg:col-span-2">
                  <DeviceList />
                </div>
              </div>
              <TransferList />
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
