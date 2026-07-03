"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ArrowRight, Gauge, Mic, TrendingDown, Trophy } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { apiGet, ApiError } from "@/lib/api-client";
import type { DashboardStats } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "destructive"> = {
  completed: "secondary",
  failed: "destructive",
  pending: "outline",
  transcribing: "outline",
  evaluating: "outline",
};

function scoreColor(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function StatCard({
  title,
  icon: Icon,
  iconClass,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<DashboardStats>("/dashboard/stats")
      .then(setStats)
      .catch((err) => {
        if (err instanceof ApiError) toast.error(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user?.full_name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          You are signed in as {user?.role.replace("_", " ")}.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : !stats ? (
        <p className="text-muted-foreground text-sm">Could not load dashboard.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total evaluations"
              icon={Mic}
              iconClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            >
              <p className="text-3xl font-semibold tracking-tight">{stats.total_evaluations}</p>
            </StatCard>
            <StatCard
              title="Average score"
              icon={Gauge}
              iconClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            >
              <p className={`text-3xl font-semibold tracking-tight ${scoreColor(stats.average_score)}`}>
                {stats.average_score ?? "—"}
              </p>
            </StatCard>
            <StatCard
              title="Best performer"
              icon={Trophy}
              iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              {stats.best_performer ? (
                <>
                  <p className="text-lg font-semibold">{stats.best_performer.name}</p>
                  <p className="text-muted-foreground text-sm">{stats.best_performer.score} avg</p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No data yet</p>
              )}
            </StatCard>
            <StatCard
              title="Needs coaching"
              icon={TrendingDown}
              iconClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            >
              {stats.weakest_performer ? (
                <>
                  <p className="text-lg font-semibold">{stats.weakest_performer.name}</p>
                  <p className="text-muted-foreground text-sm">{stats.weakest_performer.score} avg</p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No data yet</p>
              )}
            </StatCard>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Script compliance rate</CardTitle>
              </CardHeader>
              <CardContent className="flex h-full flex-col justify-center gap-4">
                <p className="text-4xl font-semibold tracking-tight">
                  {stats.script_compliance_rate !== null ? `${stats.script_compliance_rate}%` : "—"}
                </p>
                {stats.script_compliance_rate !== null && (
                  <>
                    <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-600 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, stats.script_compliance_rate))}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Share of mandatory script points covered across all completed evaluations.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly improvement</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.monthly_trend.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Not enough data yet.</p>
                ) : (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.monthly_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
                        <Bar
                          dataKey="average_score"
                          fill="var(--chart-1)"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={48}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Recent evaluations</CardTitle>
              <Link
                href="/evaluations"
                className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              {stats.recent_evaluations.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No evaluations yet.{" "}
                  <Link href="/evaluations/new" className="underline">
                    Submit your first one
                  </Link>
                  .
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sales exec</TableHead>
                      <TableHead>Script</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recent_evaluations.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">
                          <Link href={`/evaluations/${e.id}`} className="hover:underline">
                            {e.sales_exec_name}
                          </Link>
                        </TableCell>
                        <TableCell>{e.script_title}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[e.status] ?? "outline"}>{e.status}</Badge>
                        </TableCell>
                        <TableCell className={`font-semibold ${scoreColor(e.overall_score)}`}>
                          {e.overall_score ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
