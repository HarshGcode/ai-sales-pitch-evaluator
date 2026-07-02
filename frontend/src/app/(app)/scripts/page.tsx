"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { TableSkeleton } from "@/components/layout/TableSkeleton";
import { apiGet, ApiError } from "@/lib/api-client";
import type { Script } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ready: "secondary",
  processing: "outline",
  failed: "destructive",
};

export default function ScriptsPage() {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setScripts(await apiGet<Script[]>("/scripts"));
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canUpload = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scripts</h1>
          <p className="text-muted-foreground text-sm">
            Upload your ideal sales scripts for AI to evaluate pitches against.
          </p>
        </div>
        {canUpload && (
          <Button nativeButton={false} render={<Link href="/scripts/new">Upload script</Link>} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All scripts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : scripts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No scripts yet.{" "}
              {canUpload ? (
                <Link href="/scripts/new" className="underline">
                  Upload your first one
                </Link>
              ) : (
                "Ask a manager to upload one."
              )}
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scripts.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/scripts/${s.id}`} className="hover:underline">
                        {s.title}
                      </Link>
                    </TableCell>
                    <TableCell>{s.original_filename}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[s.status] ?? "outline"}>{s.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
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
