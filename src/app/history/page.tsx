import { SidebarProvider, Sidebar, SidebarInset } from "@/ui/sidebar";
import { Header } from "@/ui/components/layout/header";
import { SidebarNav } from "@/ui/components/layout/sidebar-nav";
import { TransferHistoryList } from "@/ui/components/transfer-history-list";

export default function HistoryPage() {
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
                <TransferHistoryList />
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
