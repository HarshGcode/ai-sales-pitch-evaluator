"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { apiGet, ApiError } from "@/lib/api-client";
import type { Script, ScriptSection } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SECTION_LABELS: Record<string, string> = {
  mandatory_point: "Mandatory points",
  optional_point: "Optional points",
  compliance_statement: "Compliance statements",
  objection_handling: "Objection handling",
  closing: "Closing",
};

const POLL_INTERVAL_MS = 2000;

export default function ScriptDetailPage() {
  const params = useParams<{ id: string }>();
  const scriptId = params.id;
  const [script, setScript] = useState<Script | null>(null);
  const [sections, setSections] = useState<ScriptSection[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const data = await apiGet<Script>(`/scripts/${scriptId}`);
      setScript(data);
      if (data.status === "ready") {
        setSections(await apiGet<ScriptSection[]>(`/scripts/${scriptId}/sections`));
      }
      if (data.status !== "processing" && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!script) {
    return <p className="text-muted-foreground text-sm">Script not found.</p>;
  }

  const grouped = sections.reduce<Record<string, ScriptSection[]>>((acc, section) => {
    (acc[section.section_type] ??= []).push(section);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{script.title}</h1>
        <Badge variant={script.status === "ready" ? "secondary" : script.status === "failed" ? "destructive" : "outline"}>
          {script.status}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">{script.original_filename}</p>

      {script.status === "processing" && (
        <Card>
          <CardContent className="text-muted-foreground pt-6 text-sm">
            AI is structuring this script into mandatory points, compliance statements, and
            objection handling. This page will update automatically.
          </CardContent>
        </Card>
      )}

      {script.status === "failed" && (
        <Card>
          <CardContent className="text-destructive pt-6 text-sm">
            {script.error_message ?? "Script structuring failed."}
          </CardContent>
        </Card>
      )}

      {script.status === "ready" && (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(SECTION_LABELS).map(([type, label]) => {
            const items = grouped[type] ?? [];
            if (items.length === 0) return null;
            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="text-base">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-2 text-sm">
                    {items.map((item) => {
                      if (type === "objection_handling") {
                        const [objection, response] = item.content.split(" || ");
                        return (
                          <li key={item.id} className="border-l-2 pl-3">
                            <p className="font-medium">{objection}</p>
                            <p className="text-muted-foreground">{response}</p>
                          </li>
                        );
                      }
                      return (
                        <li key={item.id} className="border-l-2 pl-3">
                          {item.content}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raw script text</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-muted-foreground max-h-96 overflow-auto text-xs whitespace-pre-wrap">
            {script.raw_text}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
