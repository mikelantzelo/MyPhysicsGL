import { redirect } from "next/navigation";
import { BellIcon } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getUser } from "@/lib/auth";
import { getActiveNodeIds, getNodeTree } from "@/lib/data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const [tree, liveIds] = await Promise.all([
    user.level ? getNodeTree(user.level) : [],
    getActiveNodeIds(user.id),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar user={user} tree={tree} liveIds={liveIds} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ειδοποιήσεις"
              disabled
            >
              <BellIcon className="size-4" />
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2 sm:p-3">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
