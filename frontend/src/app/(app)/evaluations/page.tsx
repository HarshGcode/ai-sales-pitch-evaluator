"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download } from "lucide-react";

import { apiGet, apiUrl, ApiError } from "@/lib/api-client";
import type { Evaluation } from "@/lib/types";
import { TableSkeleton } from "@/components/layout/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Filters {
  employee: string;
  department: string;
}

const EMPTY_FILTERS: Filters = { employee: "", department: "" };

function buildQuery(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.employee) params.set("employee", filters.employee);
  if (filters.department) params.set("department", filters.department);
  return params.toString();
}

function averageTalkRatio(evaluations: Evaluation[]): number | null {
  const ratios = evaluations
    .map((e) => e.feedback?.scores_json.talk_to_listen_ratio)
    .filter((v): v is number => v !== null && v !== undefined);
  if (ratios.length === 0) return null;
  return Math.round(ratios.reduce((sum, v) => sum + v, 0) / ratios.length);
}

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  async function load(activeFilters: Filters) {
    setLoading(true);
    try {
      const query = buildQuery(activeFilters);
      const path = query ? `/search/evaluations?${query}` : "/evaluations";
      setEvaluations(await apiGet<Evaluation[]>(path));
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(EMPTY_FILTERS);
  }, []);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(filters);
  }

  function handleClear() {
    setFilters(EMPTY_FILTERS);
    load(EMPTY_FILTERS);
  }

  const query = buildQuery(filters);
  const exportHref = apiUrl(`/export/evaluations.csv${query ? `?${query}` : ""}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Evaluations</h1>
          <p className="text-muted-foreground text-sm">
            AI-scored sales pitches compared against your scripts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a href={exportHref} download>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export CSV
              </a>
            }
          />
          <Button nativeButton={false} render={<Link href="/evaluations/new">New evaluation</Link>} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFilterSubmit} className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="employee">Employee</Label>
              <Input
                id="employee"
                value={filters.employee}
                onChange={(e) => setFilters((f) => ({ ...f, employee: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={filters.department}
                onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Search</Button>
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All evaluations</CardTitle>
          {!loading && evaluations.length > 0 && (
            <p className="text-muted-foreground text-sm">
              Avg. rep talk time:{" "}
              <span className="text-foreground font-medium">
                {averageTalkRatio(evaluations) ?? "—"}
                {averageTalkRatio(evaluations) !== null && "%"}
              </span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : evaluations.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No evaluations found.{" "}
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
                  <TableHead>Talk ratio</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((e) => (
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
                    <TableCell>
                      {e.feedback?.scores_json.talk_to_listen_ratio != null
                        ? `Rep ${e.feedback.scores_json.talk_to_listen_ratio}%`
                        : "—"}
                    </TableCell>
                    <TableCell>{new Date(e.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
