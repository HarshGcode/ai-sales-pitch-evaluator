"use client";

import { useRouter } from "next/navigation";
import { UserRoundPen } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  sales_exec: "Sales Executive",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleSwitchUser() {
    await logout();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-[11px] font-semibold text-white shadow-sm">
          {initials(user.full_name)}
        </div>
        <span className="text-sm font-medium">{user.full_name}</span>
        <Badge variant="secondary">{ROLE_LABELS[user.role] ?? user.role}</Badge>
        <Button variant="outline" size="sm" onClick={handleSwitchUser}>
          <UserRoundPen className="mr-1.5 h-4 w-4" />
          Switch user
        </Button>
      </div>
    </header>
  );
}
