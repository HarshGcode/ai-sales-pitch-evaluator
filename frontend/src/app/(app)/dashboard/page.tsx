"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

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
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total evaluations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stats.total_evaluations}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Average score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stats.average_score ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Best performer</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.best_performer ? (
                  <>
                    <p className="text-lg font-semibold">{stats.best_performer.name}</p>
                    <p className="text-muted-foreground text-sm">{stats.best_performer.score} avg</p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No data yet</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Weakest performer</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.weakest_performer ? (
                  <>
                    <p className="text-lg font-semibold">{stats.weakest_performer.name}</p>
                    <p className="text-muted-foreground text-sm">{stats.weakest_performer.score} avg</p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No data yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Script compliance rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">
                  {stats.script_compliance_rate !== null ? `${stats.script_compliance_rate}%` : "—"}
                </p>
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
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Bar dataKey="average_score" fill="var(--primary)" radius={4} maxBarSize={64} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent evaluations</CardTitle>
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
                        <TableCell>{e.overall_score ?? "—"}</TableCell>
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
