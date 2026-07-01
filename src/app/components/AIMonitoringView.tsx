import { useEffect, useState } from "react";
import { Cpu, MessageSquare, Database, Gauge, Activity, Zap, Brain, Clock, HardDrive, CheckCircle2, BarChart3, Server, Send, AlertTriangle } from "lucide-react";
import type { AIMonitoringStats } from "../types/contracts";

const DEFAULT_STATS: AIMonitoringStats = {
  updatedAt: new Date(0).toISOString(),
  usage: {
    totalTokens: 0,
    questionsToday: 0,
    requestsProcessed: 0,
    totalConversations: 0,
    promptTokens: 0,
    completionTokens: 0,
    avgResponseMs: 0,
    p95Ms: 0,
    cacheHitRatePct: 0,
  },
  resources: {
    cachePct: 0,
    memoryPct: 0,
    gpuPct: 0,
    cpuPct: 0,
  },
  model: {
    name: "—",
    endpoint: "—",
    device: "—",
    status: "Offline",
  },
  bottom: {
    vectorStoreDocs: 0,
    storageUsedGb: 0,
    storageTotalGb: 0,
    throughputTokPerSec: 0,
    errorRatePct: 0,
  },
};

async function fetchAIMonitoringStats(): Promise<AIMonitoringStats> {
  try {
    const response = await fetch("/data/ai-monitoring.json", { cache: "no-store" });
    if (!response.ok) {
      return DEFAULT_STATS;
    }

    const data = await response.json().catch(() => null);
    if (!data || typeof data !== "object") {
      return DEFAULT_STATS;
    }

    return {
      ...DEFAULT_STATS,
      ...data,
      usage: { ...DEFAULT_STATS.usage, ...(data as any).usage },
      resources: { ...DEFAULT_STATS.resources, ...(data as any).resources },
      model: { ...DEFAULT_STATS.model, ...(data as any).model },
      bottom: { ...DEFAULT_STATS.bottom, ...(data as any).bottom },
    };
  } catch {
    return DEFAULT_STATS;
  }
}

const sans = { fontFamily: "'Inter', sans-serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-card border border-border rounded-sm p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>{label}</p>
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <p style={{ ...mono, fontSize: 22, fontWeight: 600, color: accent ?? "var(--foreground)", lineHeight: 1 }}>{value}</p>
      {sub && <p className="text-muted-foreground" style={{ ...mono, fontSize: 10 }}>{sub}</p>}
    </div>
  );
}

function Meter({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-foreground" style={{ ...sans, fontSize: 12, fontWeight: 500 }}>{label}</p>
        <span style={{ ...mono, fontSize: 12, color }}>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary border border-border overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function AIMonitoringView() {
  const [stats, setStats] = useState<AIMonitoringStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAIMonitoringStats()
      .then(result => {
        if (cancelled) return;
        setStats(result);
        setError(null);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const formatPercent = (value: number) => `${Math.round(value)}%`;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-sm bg-primary flex items-center justify-center">
            <Brain className="w-3 h-3" style={{ color: "var(--primary-foreground)" }} />
          </div>
          <h1 style={{ ...sans, fontSize: 18, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>AI MONITORING</h1>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border ${stats.model.status === "Healthy" ? "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]" : stats.model.status === "Degraded" ? "border-[#e5a030]/30 bg-[#e5a030]/10 text-[#e5a030]" : "border-[#e5534b]/30 bg-[#e5534b]/10 text-[#e5534b]"}`} style={{ ...mono, fontSize: 10 }}>
          <span className={`w-1.5 h-1.5 rounded-full ${stats.model.status === "Healthy" ? "bg-[#10b981]" : stats.model.status === "Degraded" ? "bg-[#e5a030]" : "bg-[#e5534b]"} animate-pulse`} />
          {loading ? "Loading…" : stats.model.status}
        </span>
      </div>

      {error && (
        <div className="mx-5 mt-4 flex items-center gap-2 px-3 py-2 rounded-sm border border-[#e5a030]/30 bg-[#e5a030]/10 text-[#e5a030]" style={{ ...mono, fontSize: 11 }}>
          <AlertTriangle className="w-4 h-4" /> Falling back to default AI monitoring values: {error}
        </div>
      )}

      <div className="px-5 py-4 flex flex-col gap-5">
        {/* Top stats */}
        <div>
          <p className="text-foreground mb-3" style={{ ...sans, fontSize: 14, fontWeight: 600 }}>Usage</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard icon={Zap}          label="Total Tokens Used"    value={stats.usage.totalTokens.toLocaleString()}  sub="last 24h" />
            <StatCard icon={MessageSquare}label="Questions Today"      value={stats.usage.questionsToday.toString()}     sub="+18% vs yesterday" />
            <StatCard icon={Send}         label="Requests Processed"   value={stats.usage.requestsProcessed.toLocaleString()} sub="rolling 24h" />
            <StatCard icon={MessageSquare}label="Total Conversations"  value={stats.usage.totalConversations.toString()}  sub="across all users" />
            <StatCard icon={Zap}          label="Prompt Tokens"        value={stats.usage.promptTokens.toLocaleString()} />
            <StatCard icon={Zap}          label="Completion Tokens"    value={stats.usage.completionTokens.toLocaleString()} />
            <StatCard icon={Clock}        label="Avg Response Time"    value={`${stats.usage.avgResponseMs} ms`} sub={`P95: ${stats.usage.p95Ms} ms`} accent="#10b981" />
            <StatCard icon={CheckCircle2} label="Cache Hit Rate"       value={formatPercent(stats.usage.cacheHitRatePct)} sub="last 1h" accent="#10b981" />
          </div>
        </div>

        {/* Meters */}
        <div>
          <p className="text-foreground mb-3" style={{ ...sans, fontSize: 14, fontWeight: 600 }}>Resources</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Meter label="Cache Usage"  pct={stats.resources.cachePct} color="#6366f1" />
            <Meter label="Memory Usage" pct={stats.resources.memoryPct} color="#10b981" />
            <Meter label="GPU Usage"    pct={stats.resources.gpuPct} color="#f59e0b" />
            <Meter label="CPU Usage"    pct={stats.resources.cpuPct} color="#00e5c3" />
          </div>
        </div>

        {/* Model status */}
        <div>
          <p className="text-foreground mb-3" style={{ ...sans, fontSize: 14, fontWeight: 600 }}>Active Model</p>
          <div className="bg-card border border-border rounded-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <Brain className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>Model</p>
                  <p className="text-foreground" style={{ ...mono, fontSize: 13, fontWeight: 600 }}>{stats.model.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Server className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>Endpoint</p>
                  <p className="text-foreground" style={{ ...mono, fontSize: 12 }}>{stats.model.endpoint}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Cpu className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>Device</p>
                  <p className="text-foreground" style={{ ...mono, fontSize: 12 }}>{stats.model.device}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
                <Activity className={`w-4 h-4 mt-0.5 ${stats.model.status === "Healthy" ? "text-[#10b981]" : stats.model.status === "Degraded" ? "text-[#e5a030]" : "text-[#e5534b]"}`} />
              <div>
                <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>Status</p>
                  <p style={{ ...mono, fontSize: 13, fontWeight: 600, color: stats.model.status === "Healthy" ? "#10b981" : stats.model.status === "Degraded" ? "#e5a030" : "#e5534b" }}>{stats.model.status}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom small stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Database}  label="Vector Store"    value={stats.bottom.vectorStoreDocs.toLocaleString()} sub="documents indexed" />
          <StatCard icon={HardDrive} label="Storage Used"    value={`${stats.bottom.storageUsedGb.toFixed(1)} GB`} sub={`of ${stats.bottom.storageTotalGb} GB`} />
          <StatCard icon={Gauge}     label="Throughput"      value={`${stats.bottom.throughputTokPerSec} t/s`} sub="tokens/sec" />
          <StatCard icon={BarChart3} label="Error Rate"      value={formatPercent(stats.bottom.errorRatePct)} sub="last 1h" accent="#10b981" />
        </div>

        <div className="h-6 shrink-0" />
      </div>
    </div>
  );
}