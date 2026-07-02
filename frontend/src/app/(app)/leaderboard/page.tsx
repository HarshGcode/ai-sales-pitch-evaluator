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
                      {i === 0 ? <Trophy className="h-4 w-4 text-yellow-500" /> : `#${i + 1}`}
                    </TableCell>
                    <TableCell className="font-medium">{entry.full_name}</TableCell>
                    <TableCell>{entry.department ?? "—"}</TableCell>
                    <TableCell>{entry.evaluation_count}</TableCell>
                    <TableCell>{entry.average_score}</TableCell>
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
