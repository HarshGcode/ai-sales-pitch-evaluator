"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trophy } from "lucide-react";

import { apiGet, ApiError } from "@/lib/api-client";
import type { LeaderboardEntry } from "@/lib/types";
import { TableSkeleton } from "@/components/layout/TableSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<LeaderboardEntry[]>("/dashboard/leaderboard")
      .then(setEntries)
      .catch((err) => {
        if (err instanceof ApiError) toast.error(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground text-sm">Ranked by average score across completed evaluations.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No completed evaluations yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Evaluations</TableHead>
                  <TableHead>Average score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, i) => (
                  <TableRow key={entry.user_id}>
                    <TableCell className="font-medium">
                      {i < 3 ? (
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                            i === 0
                              ? "bg-amber-400/20 text-amber-600 dark:text-amber-400"
                              : i === 1
                                ? "bg-slate-400/20 text-slate-600 dark:text-slate-300"
                                : "bg-orange-400/20 text-orange-700 dark:text-orange-400"
                          }`}
                        >
                          {i === 0 ? <Trophy className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                      ) : (
                        <span className="text-muted-foreground pl-2">{i + 1}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{entry.full_name}</TableCell>
                    <TableCell>{entry.department ?? "—"}</TableCell>
                    <TableCell>{entry.evaluation_count}</TableCell>
                    <TableCell
                      className={`font-semibold ${
                        entry.average_score >= 80
                          ? "text-emerald-600 dark:text-emerald-400"
                          : entry.average_score >= 60
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {entry.average_score}
                    </TableCell>
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
