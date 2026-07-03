"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Mic,
  Plus,
  Trophy,
  Users,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/evaluations", label: "Evaluations", icon: Mic },
  { href: "/scripts", label: "Scripts", icon: FileText },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/users", label: "Team", icon: Users, roles: ["admin", "manager"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-sm">
          <Mic className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Pitch Evaluator</p>
          <p className="text-muted-foreground text-[11px]">AI sales coaching</p>
        </div>
      </div>
      <div className="p-3 pb-0">
        <Link
          href="/evaluations/new"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          New evaluation
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="text-muted-foreground border-t p-4 text-[11px] leading-relaxed">
        Shared demo workspace.
        <br />
        Scores are AI-generated guidance.
      </div>
    </aside>
  );
}
