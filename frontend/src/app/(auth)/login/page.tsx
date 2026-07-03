"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Mic, ShieldCheck, Users } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// One-click personas instead of a sign-in form: picking a card enters the
// matching demo account via the passwordless /auth/demo-login endpoint, so
// JWT sessions and role-based access keep working unchanged.
const PERSONAS = [
  {
    key: "admin",
    name: "Alice Admin",
    role: "Admin",
    email: "admin@acmecorp.com",
    description: "Run the whole workspace: manage the team, scripts and every evaluation.",
    icon: ShieldCheck,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    key: "manager",
    name: "Mark Manager",
    role: "Manager",
    email: "manager@acmecorp.com",
    description: "Upload ideal scripts, evaluate the team and track dashboards.",
    icon: BarChart3,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    key: "exec",
    name: "Sam Executive",
    role: "Sales Executive",
    email: "exec@acmecorp.com",
    description: "Record or upload your pitches and watch your scores improve.",
    icon: Mic,
    gradient: "from-emerald-500 to-teal-600",
  },
] as const;

export default function WhoAreYouPage() {
  const router = useRouter();
  const { enterAs } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  async function enterWorkspace(persona: (typeof PERSONAS)[number]) {
    if (busy) return;
    setBusy(persona.key);
    try {
      await enterAs(persona.email);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not enter the workspace";
      toast.error(message);
      setBusy(null);
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
            Pick your role to enter the AI Sales Pitch Evaluator — no password needed.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {PERSONAS.map((persona) => {
            const Icon = persona.icon;
            const isBusy = busy === persona.key;
            return (
              <Card
                key={persona.key}
                role="button"
                tabIndex={0}
                aria-label={`Continue as ${persona.name} (${persona.role})`}
                onClick={() => enterWorkspace(persona)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    enterWorkspace(persona);
                  }
                }}
                className={`group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  isBusy ? "opacity-70" : ""
                } ${busy && !isBusy ? "pointer-events-none opacity-40" : ""}`}
              >
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${persona.gradient}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">{persona.name}</p>
                    <Badge variant="secondary" className="mt-1">
                      {persona.role}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">{persona.description}</p>
                  <span className="text-primary mt-1 inline-flex items-center gap-1 text-sm font-medium">
                    {isBusy ? "Entering…" : "Continue"}
                    {!isBusy && (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-muted-foreground mt-8 flex items-center justify-center gap-1.5 text-xs">
          <Users className="h-3.5 w-3.5" />
          Shared demo workspace — everyone sees the same team and data.
        </p>
      </div>
    </div>
  );
}
