"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiPost, ApiError } from "@/lib/api-client";
import type { Evaluation, Script, User } from "@/lib/types";
import { AudioRecorder } from "@/components/evaluations/AudioRecorder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewEvaluationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isSalesExec = user?.role === "sales_exec";

  const [scripts, setScripts] = useState<Script[]>([]);
  const [execs, setExecs] = useState<User[]>([]);
  const [scriptId, setScriptId] = useState("");
  const [salesExecId, setSalesExecId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<Script[]>("/scripts").then((all) => setScripts(all.filter((s) => s.status === "ready")));
    if (!isSalesExec) {
      apiGet<User[]>("/users").then((all) => setExecs(all.filter((u) => u.role === "sales_exec")));
    } else if (user) {
      setSalesExecId(user.id);
    }
  }, [isSalesExec, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !scriptId || !salesExecId) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("script_id", scriptId);
      formData.append("sales_exec_id", salesExecId);
      formData.append("file", file);
      const evaluation = await apiPost<Evaluation>("/evaluations", formData);
      toast.success("Evaluation submitted. AI is analyzing the pitch now.");
      router.push(`/evaluations/${evaluation.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New evaluation</h1>
        <p className="text-muted-foreground text-sm">
          Upload or record a sales pitch and AI will score it against your script.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Choose a script and provide the pitch audio.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Script</Label>
              <Select value={scriptId} onValueChange={(value) => setScriptId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a script" />
                </SelectTrigger>
                <SelectContent>
                  {scripts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scripts.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  No ready scripts yet. Upload one from the Scripts page first.
                </p>
              )}
            </div>

            {!isSalesExec && (
              <div className="flex flex-col gap-2">
                <Label>Sales executive</Label>
                <Select value={salesExecId} onValueChange={(value) => setSalesExecId(value ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sales executive" />
                  </SelectTrigger>
                  <SelectContent>
                    {execs.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="audio">Audio file</Label>
              <Input
                id="audio"
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,.webm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-2">
                <div className="bg-border h-px flex-1" />
                <span className="text-muted-foreground text-xs">or</span>
                <div className="bg-border h-px flex-1" />
              </div>
              <AudioRecorder onRecorded={setFile} />
              {file && <p className="text-muted-foreground text-xs">Selected: {file.name}</p>}
            </div>

            <Button type="submit" disabled={submitting || !file || !scriptId || !salesExecId} className="mt-2">
              {submitting ? "Submitting..." : "Submit for evaluation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
