"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { apiGet, ApiError } from "@/lib/api-client";
import type { Evaluation } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  transcribing: "Transcribing audio...",
  evaluating: "AI is scoring the pitch...",
  completed: "Completed",
  failed: "Failed",
};

const POLL_INTERVAL_MS = 2000;

function talkRatioLabel(ratio: number): string {
  if (ratio > 70) return "rep is dominating the call";
  if (ratio < 30) return "customer is dominating the call";
  return "balanced conversation";
}

export default function EvaluationDetailPage() {
  const params = useParams<{ id: string }>();
  const evaluationId = params.id;
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const data = await apiGet<Evaluation>(`/evaluations/${evaluationId}`);
      setEvaluation(data);
      if (["completed", "failed"].includes(data.status) && pollRef.current) {
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
  }, [evaluationId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!evaluation) {
    return <p className="text-muted-foreground text-sm">Evaluation not found.</p>;
  }

  const inProgress = evaluation.status === "pending" || evaluation.status === "transcribing" || evaluation.status === "evaluating";
  const feedback = evaluation.feedback;

  const radarData = feedback
    ? [
        { category: "Tone", value: feedback.scores_json.tone },
        { category: "Confidence", value: feedback.scores_json.confidence },
        { category: "Empathy", value: feedback.scores_json.empathy },
        { category: "Clarity", value: feedback.scores_json.clarity },
        { category: "Compliance", value: feedback.scores_json.compliance },
        { category: "Closing", value: feedback.scores_json.closing_quality },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {evaluation.sales_exec_name} &middot; {evaluation.script_title}
        </h1>
        <Badge variant={evaluation.status === "completed" ? "secondary" : evaluation.status === "failed" ? "destructive" : "outline"}>
          {STATUS_LABELS[evaluation.status]}
        </Badge>
        {evaluation.mock_mode && <Badge variant="outline">Demo mode — simulated AI</Badge>}
      </div>

      {inProgress && (
        <Card>
          <CardContent className="text-muted-foreground pt-6 text-sm">
            {STATUS_LABELS[evaluation.status]} This page updates automatically.
          </CardContent>
        </Card>
      )}

      {evaluation.status === "failed" && (
        <Card>
          <CardContent className="text-destructive pt-6 text-sm">
            {evaluation.error_message ?? "Evaluation failed."}
          </CardContent>
        </Card>
      )}

      {evaluation.status === "completed" && feedback && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overall score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-semibold">{evaluation.overall_score}</p>
                <p className="text-muted-foreground text-sm">out of 100</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Script adherence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-semibold">{feedback.script_adherence_pct}%</p>
                <p className="text-muted-foreground text-sm">
                  {feedback.missing_mandatory_points.length === 0
                    ? "All mandatory points covered"
                    : `${feedback.missing_mandatory_points.length} point(s) missing`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filler words</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-semibold">{feedback.scores_json.filler_word_count}</p>
                <p className="text-muted-foreground text-sm">detected in transcript</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Call metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {feedback.scores_json.talk_to_listen_ratio === null ? (
                <p className="text-muted-foreground text-sm">
                  Call metrics aren&apos;t available for evaluations run before this feature was added.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-2xl font-semibold">{feedback.scores_json.talk_to_listen_ratio}%</p>
                    <p className="text-muted-foreground text-sm">
                      Rep talk time &middot; {talkRatioLabel(feedback.scores_json.talk_to_listen_ratio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{feedback.scores_json.interactivity_score}</p>
                    <p className="text-muted-foreground text-sm">Interactivity score</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{feedback.scores_json.speaking_pace_wpm}</p>
                    <p className="text-muted-foreground text-sm">Words per minute</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{feedback.scores_json.question_count}</p>
                    <p className="text-muted-foreground text-sm">Questions asked</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
                  {feedback.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weaknesses</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
                  {feedback.weaknesses.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {feedback.missing_mandatory_points.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Missed mandatory points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
                  {feedback.missing_mandatory_points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top improvement tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
                {feedback.improvement_tips.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground max-h-96 overflow-auto text-sm whitespace-pre-wrap">
                {evaluation.transcript_text}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
