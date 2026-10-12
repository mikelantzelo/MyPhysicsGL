import { redirect } from "next/navigation";

import { fetchUnreadCount } from "@/app/chat-actions";
import { AppSidebar } from "@/components/app-sidebar";
import { PushBridge } from "@/components/chat/push-ui";
import { UnreadBell } from "@/components/chat/unread-bell";
import { ThemeToggle } from "@/components/theme-toggle";
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

  const [tree, liveIds, unread] = await Promise.all([
    user.level ? getNodeTree(user.level) : [],
    getActiveNodeIds(user.id),
    fetchUnreadCount(),
  ]);

  return (
    <SidebarProvider>
      <PushBridge />
      <AppSidebar user={user} tree={tree} liveIds={liveIds} />
      {/* min-w-0: φαρδιοί πίνακες κάνουν δικό τους scroll αντί να φαρδαίνουν τη σελίδα. */}
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-1">
            <UnreadBell
              initial={unread}
              href={user.isAdmin ? "/admin/messages" : "/chat"}
            />
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
