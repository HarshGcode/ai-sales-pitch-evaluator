"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Mic, ShieldCheck, Users } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api-client";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// No sign-in form: the user tells us who they are (their own name) and which
// role they want, and /auth/enter finds or creates their profile on the fly.
// Typing the same name + role later returns to the same profile and history.
const ROLES: {
  value: Role;
  label: string;
  description: string;
  icon: typeof Mic;
  gradient: string;
}[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Run the whole workspace: manage the team, scripts and every evaluation.",
    icon: ShieldCheck,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    value: "manager",
    label: "Manager",
    description: "Upload ideal scripts, evaluate the team and track dashboards.",
    icon: BarChart3,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    value: "sales_exec",
    label: "Sales Executive",
    description: "Record or upload your pitches and watch your scores improve.",
    icon: Mic,
    gradient: "from-emerald-500 to-teal-600",
  },
];

export default function WhoAreYouPage() {
  const router = useRouter();
  const { enter } = useAuth();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("sales_exec");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await enter(name.trim(), role);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not enter the workspace");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg">
            <Mic className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Who are you?</h1>
          <p className="text-muted-foreground mt-2">
            Enter your name and pick your role — no password needed. Come back with the
            same name to continue where you left off.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              autoFocus
              autoComplete="name"
              placeholder="e.g. Priya Sharma"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const selected = role === r.value;
              return (
                <Card
                  key={r.value}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={0}
                  onClick={() => setRole(r.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setRole(r.value);
                    }
                  }}
                  className={`cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    selected
                      ? "ring-primary shadow-lg ring-2"
                      : "hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${r.gradient}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="font-medium">{r.label}</p>
                    <p className="text-muted-foreground text-sm">{r.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={!name.trim() || busy}
            className="mx-auto w-full max-w-sm"
          >
            {busy ? "Entering…" : "Continue"}
            {!busy && <ArrowRight className="ml-1.5 h-4 w-4" />}
          </Button>
        </form>

        <p className="text-muted-foreground mt-8 flex items-center justify-center gap-1.5 text-xs">
          <Users className="h-3.5 w-3.5" />
          Shared demo workspace — everyone sees the same team and data.
        </p>
      </div>
    </div>
  );
}
