"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, LogOutIcon } from "lucide-react";

import { logout } from "@/app/actions";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LEVEL_LABELS, type CurrentUser, type NodeTree } from "@/lib/types";

function subtreeHasId(node: NodeTree, id: string | null): boolean {
  if (!id) return false;
  if (node.id === id) return true;
  return node.children.some((child) => subtreeHasId(child, id));
}

function nodeLabel(node: NodeTree) {
  return `${node.name} ${node.title}`.trim();
}

/** Link που κλείνει το drawer του sidebar σε κινητά μόλις πατηθεί. */
function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (isMobile) setOpenMobile(false);
      }}
    >
      {children}
    </Link>
  );
}

/** Κόμβος βάθους ≥ 1 (ενότητα, υποενότητα, …) μέσα σε SidebarMenuSub. */
function NavNode({
  node,
  activeId,
}: {
  node: NodeTree;
  activeId: string | null;
}) {
  const isActive = node.id === activeId;
  const hasChildren = node.children.length > 0;

  if (!hasChildren) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild isActive={isActive}>
          <NavLink href={`/n/${node.id}`}>
            <span className="truncate">{nodeLabel(node)}</span>
          </NavLink>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <SidebarMenuSubItem>
      <Collapsible
        defaultOpen={subtreeHasId(node, activeId)}
        className="group/node"
      >
        <div className="flex items-center gap-1">
          <SidebarMenuSubButton asChild isActive={isActive} className="flex-1">
            <NavLink href={`/n/${node.id}`}>
              <span className="truncate">{nodeLabel(node)}</span>
            </NavLink>
          </SidebarMenuSubButton>
          <CollapsibleTrigger
            aria-label="Ανάπτυξη"
            className="rounded p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent"
          >
            <ChevronRightIcon className="size-3.5 transition-transform group-data-[state=open]/node:rotate-90" />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <SidebarMenuSub>
            {node.children.map((child) => (
              <NavNode key={child.id} node={child} activeId={activeId} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

/** Κόμβος ρίζας (κεφάλαιο). */
function ChapterNode({
  node,
  activeId,
}: {
  node: NodeTree;
  activeId: string | null;
}) {
  const isActive = node.id === activeId;
  const hasChildren = node.children.length > 0;

  return (
    <Collapsible
      defaultOpen={subtreeHasId(node, activeId)}
      className="group/chapter"
    >
      <SidebarMenuItem>
        <div className="flex items-center gap-1">
          <SidebarMenuButton asChild isActive={isActive} className="flex-1">
            <NavLink href={`/n/${node.id}`}>
              <span className="truncate font-medium">{nodeLabel(node)}</span>
            </NavLink>
          </SidebarMenuButton>
          {hasChildren && (
            <CollapsibleTrigger
              aria-label="Ανάπτυξη"
              className="rounded p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent"
            >
              <ChevronRightIcon className="size-4 transition-transform group-data-[state=open]/chapter:rotate-90" />
            </CollapsibleTrigger>
          )}
        </div>
        {hasChildren && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {node.children.map((child) => (
                <NavNode key={child.id} node={child} activeId={activeId} />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar({
  user,
  tree,
}: {
  user: CurrentUser;
  tree: NodeTree[];
}) {
  const pathname = usePathname();
  const activeId = pathname.startsWith("/n/")
    ? decodeURIComponent(pathname.slice(3))
    : null;

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
            Φ
          </div>
          <div className="leading-tight">
            <div className="font-semibold">MyPhysics</div>
            {user.level && (
              <div className="text-xs text-muted-foreground">
                {LEVEL_LABELS[user.level]}
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Κεφάλαια</SidebarGroupLabel>
          <SidebarMenu>
            {tree.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                Δεν υπάρχουν κεφάλαια ακόμα.
              </p>
            )}
            {tree.map((chapter) => (
              <ChapterNode
                key={chapter.id}
                node={chapter}
                activeId={activeId}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {user.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span className="truncate text-muted-foreground">
                {user.name || user.email}
              </span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logout}>
              <SidebarMenuButton type="submit">
                <LogOutIcon />
                <span>Αποσύνδεση</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
