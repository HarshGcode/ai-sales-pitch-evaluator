"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { ChangePasswordDialog } from "@/components/layout/ChangePasswordDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div />
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{ROLE_LABELS[user.role] ?? user.role}</Badge>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-full outline-none">
                <Avatar>
                  <AvatarFallback>{initials(user.full_name)}</AvatarFallback>
                </Avatar>
              </button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user.full_name}</span>
                  <span className="text-muted-foreground text-xs">{user.email}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Change password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ChangePasswordDialog
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
        />
      </div>
    </header>
  );
}
