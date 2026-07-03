"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiPost, apiPut, ApiError } from "@/lib/api-client";
import type { AISettings, Evaluation, Script, User } from "@/lib/types";
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

const AI_PROVIDERS = [
  { value: "default", label: "App default (no key needed)" },
  { value: "anthropic", label: "Claude (Anthropic)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "groq", label: "Groq (Llama)" },
  { value: "gemini", label: "Gemini (Google)" },
] as const;

// Claude and Gemini don't host a Whisper-style speech-to-text API, so audio
// transcription stays on the app's engine — the user's key powers the scoring.
const SCORING_ONLY_PROVIDERS = new Set(["anthropic", "gemini"]);

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

  const [aiProvider, setAiProvider] = useState("default");
  const [apiKey, setApiKey] = useState("");
  const [savedSettings, setSavedSettings] = useState<AISettings | null>(null);

  useEffect(() => {
    apiGet<Script[]>("/scripts").then((all) => setScripts(all.filter((s) => s.status === "ready")));
    apiGet<AISettings>("/users/me/ai-settings").then((settings) => {
      setSavedSettings(settings);
      setAiProvider(settings.provider ?? "default");
    });
    if (!isSalesExec) {
      apiGet<User[]>("/users").then((all) => setExecs(all.filter((u) => u.role === "sales_exec")));
    } else if (user) {
      setSalesExecId(user.id);
    }
  }, [isSalesExec, user]);

  const keySavedForProvider = savedSettings?.has_key && savedSettings.provider === aiProvider;
  const needsKey = aiProvider !== "default" && !apiKey && !savedSettings?.has_key;

  async function syncAiSettings() {
    const provider = aiProvider === "default" ? null : aiProvider;
    const unchanged =
      provider === (savedSettings?.provider ?? null) && !apiKey;
    if (unchanged) return;
    const updated = await apiPut<AISettings>("/users/me/ai-settings", {
      provider,
      api_key: apiKey || null,
    });
    setSavedSettings(updated);
    setApiKey("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !scriptId || !salesExecId) return;
    setSubmitting(true);
    try {
      await syncAiSettings();
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
              <Select
                value={scriptId}
                onValueChange={(value) => setScriptId(value ?? "")}
                items={scripts.map((s) => ({ value: s.id, label: s.title }))}
              >
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
                <Select
                  value={salesExecId}
                  onValueChange={(value) => setSalesExecId(value ?? "")}
                  items={execs.map((u) => ({ value: u.id, label: u.full_name }))}
                >
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

            <div className="flex flex-col gap-2">
              <Label>AI engine</Label>
              <Select
                value={aiProvider}
                onValueChange={(value) => setAiProvider(value ?? "default")}
                items={AI_PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose the AI that scores this pitch" />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {aiProvider !== "default" && (
                <>
                  <div className="relative">
                    <KeyRound className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      type="password"
                      autoComplete="off"
                      className="pl-9"
                      placeholder={
                        keySavedForProvider
                          ? "Key saved — leave blank to keep using it"
                          : "Paste your API key"
                      }
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Your key is used for your evaluations only.
                    {SCORING_ONLY_PROVIDERS.has(aiProvider) &&
                      " Audio transcription still runs on the app's engine; your key powers the scoring."}
                  </p>
                </>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting || !file || !scriptId || !salesExecId || needsKey}
              className="mt-2"
            >
              {submitting ? "Submitting..." : "Submit for evaluation"}
            </Button>
            {needsKey && (
              <p className="text-muted-foreground text-xs">
                Paste an API key for the selected AI engine, or switch back to the app default.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
