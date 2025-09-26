
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TransferHistoryList } from "@/components/transfer-history-list";

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
