"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRightIcon,
  ChevronsUpDownIcon,
  ClipboardListIcon,
  DownloadIcon,
  InfoIcon,
  type LucideIcon,
  LogOutIcon,
  MessageSquareIcon,
  PencilLineIcon,
  StarIcon,
  TrophyIcon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { logout } from "@/app/actions";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function subtreeHasAny(node: NodeTree, ids: Set<string>): boolean {
  if (ids.has(node.id)) return true;
  return node.children.some((child) => subtreeHasAny(child, ids));
}

/** Χρώμα για την παράγραφο που διδάσκεται τώρα (πίνακας `active`). */
const LIVE_CLASS =
  "bg-amber-500/15 text-amber-800 font-medium hover:bg-amber-500/25 dark:text-amber-300";

/** Τελεία που «πάλλεται» δίπλα στην ενεργή παράγραφο. */
function LiveDot() {
  return (
    <span
      className="relative ml-auto flex size-2 shrink-0"
      aria-label="Τρέχουσα παράγραφος"
    >
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
    </span>
  );
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
  liveIds,
}: {
  node: NodeTree;
  activeId: string | null;
  liveIds: Set<string>;
}) {
  const isActive = node.id === activeId;
  const isLive = liveIds.has(node.id);
  const hasChildren = node.children.length > 0;

  const activeClass =
    "data-[active=true]:bg-sidebar-primary/10 data-[active=true]:text-sidebar-primary data-[active=true]:font-medium";

  if (!hasChildren) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          asChild
          isActive={isActive}
          className={`${isLive ? LIVE_CLASS : ""} ${activeClass}`}
        >
          <NavLink href={`/n/${node.id}`}>
            <span className="truncate">{nodeLabel(node)}</span>
            {isLive && <LiveDot />}
          </NavLink>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <SidebarMenuSubItem>
      <Collapsible
        defaultOpen={
          subtreeHasId(node, activeId) || subtreeHasAny(node, liveIds)
        }
        className="group/node"
      >
        <div className="flex items-center gap-1">
          <SidebarMenuSubButton
            asChild
            isActive={isActive}
            className={`flex-1 ${isLive ? LIVE_CLASS : ""} ${activeClass}`}
          >
            <NavLink href={`/n/${node.id}`}>
              <span className="truncate">{nodeLabel(node)}</span>
              {isLive && <LiveDot />}
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
              <NavNode
                key={child.id}
                node={child}
                activeId={activeId}
                liveIds={liveIds}
              />
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
  liveIds,
}: {
  node: NodeTree;
  activeId: string | null;
  liveIds: Set<string>;
}) {
  const isActive = node.id === activeId;
  const isLive = liveIds.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <Collapsible
      defaultOpen={
        subtreeHasId(node, activeId) || subtreeHasAny(node, liveIds)
      }
      className="group/chapter"
    >
      <SidebarMenuItem>
        <div className="flex items-center gap-1">
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className={`flex-1 ${isLive ? LIVE_CLASS : ""} data-[active=true]:bg-sidebar-primary/10 data-[active=true]:text-sidebar-primary`}
          >
            <NavLink href={`/n/${node.id}`}>
              <span className="truncate font-medium">{nodeLabel(node)}</span>
              {isLive && <LiveDot />}
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
                <NavNode
                key={child.id}
                node={child}
                activeId={activeId}
                liveIds={liveIds}
              />
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
  liveIds,
}: {
  user: CurrentUser;
  tree: NodeTree[];
  /** $id των κόμβων που είναι ενεργοί για το τμήμα του μαθητή. */
  liveIds: string[];
}) {
  const pathname = usePathname();
  const live = new Set(liveIds);
  const activeId = pathname.startsWith("/n/")
    ? decodeURIComponent(pathname.slice(3))
    : null;

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 font-bold text-primary-foreground shadow-sm">
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
                liveIds={live}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <NavUser user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

/** Ομάδες στοιχείων μενού χρήστη — προς το παρόν placeholders (σύντομα διαθέσιμα). */
const MENU_GROUPS: { icon: LucideIcon; label: string }[][] = [
  [
    { icon: StarIcon, label: "Βαθμολογίες" },
    { icon: TrophyIcon, label: "Αποτελέσματα Quiz" },
  ],
  [
    { icon: ClipboardListIcon, label: "Εργασίες" },
    { icon: UploadIcon, label: "Αποστολή αρχείου" },
  ],
  [
    { icon: DownloadIcon, label: "Έκτακτα Αρχεία" },
    { icon: InfoIcon, label: "Χρήσιμα" },
  ],
  [
    { icon: PencilLineIcon, label: "Εξετάσεις" },
    { icon: MessageSquareIcon, label: "Συνομιλία" },
  ],
];

/** Το κουμπί με το όνομα κάτω-αριστερά· κλικ → μενού χρήστη. */
function NavUser({ user }: { user: CurrentUser }) {
  const { isMobile } = useSidebar();

  const initial = user.name?.[0]?.toUpperCase() ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground">
            {initial}
          </div>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate text-sm font-medium">
              {user.name || user.email}
            </span>
            {user.name && (
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            )}
          </div>
          <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 opacity-60" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={isMobile ? "bottom" : "top"}
        align="start"
        sideOffset={8}
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
      >
        <DropdownMenuLabel className="flex items-center gap-2 py-2 font-normal">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground">
            {initial}
          </div>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate text-sm font-medium">
              {user.name || user.email}
            </span>
            {user.name && (
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            )}
          </div>
        </DropdownMenuLabel>

        {MENU_GROUPS.map((group, i) => (
          <Fragment key={i}>
            <DropdownMenuSeparator />
            {group.map(({ icon: Icon, label }) => (
              <DropdownMenuItem
                key={label}
                onSelect={() => toast.info(`${label} — σύντομα διαθέσιμο`)}
              >
                <Icon />
                {label}
              </DropdownMenuItem>
            ))}
          </Fragment>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onSelect={() => logout()}>
          <LogOutIcon />
          Αποσύνδεση
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
