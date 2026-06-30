import { Cpu, MessageSquare, Database, Gauge, Activity, Zap, Brain, Clock, HardDrive, CheckCircle2, BarChart3, Server, Send } from "lucide-react";

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
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-sm bg-primary flex items-center justify-center">
            <Brain className="w-3 h-3" style={{ color: "var(--primary-foreground)" }} />
          </div>
          <h1 style={{ ...sans, fontSize: 18, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>AI MONITORING</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]" style={{ ...mono, fontSize: 10 }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" /> Model Online
        </span>
      </div>

      <div className="px-5 py-4 flex flex-col gap-5">
        {/* Top stats */}
        <div>
          <p className="text-foreground mb-3" style={{ ...sans, fontSize: 14, fontWeight: 600 }}>Usage</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard icon={Zap}          label="Total Tokens Used"    value="1,284,910"  sub="last 24h" />
            <StatCard icon={MessageSquare}label="Questions Today"      value="342"        sub="+18% vs yesterday" />
            <StatCard icon={Send}         label="Requests Processed"   value="9,217"      sub="rolling 24h" />
            <StatCard icon={MessageSquare}label="Total Conversations"  value="1,043"      sub="across all users" />
            <StatCard icon={Zap}          label="Prompt Tokens"        value="892,103"   />
            <StatCard icon={Zap}          label="Completion Tokens"    value="392,807"   />
            <StatCard icon={Clock}        label="Avg Response Time"    value="412 ms"     sub="P95: 1.2s" accent="#10b981" />
            <StatCard icon={CheckCircle2} label="Cache Hit Rate"       value="64%"        sub="last 1h" accent="#10b981" />
          </div>
        </div>

        {/* Meters */}
        <div>
          <p className="text-foreground mb-3" style={{ ...sans, fontSize: 14, fontWeight: 600 }}>Resources</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Meter label="Cache Usage"  pct={62} color="#6366f1" />
            <Meter label="Memory Usage" pct={48} color="#10b981" />
            <Meter label="GPU Usage"    pct={71} color="#f59e0b" />
            <Meter label="CPU Usage"    pct={34} color="#00e5c3" />
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
                <p className="text-foreground" style={{ ...mono, fontSize: 13, fontWeight: 600 }}>qwen2.5-7b-instruct</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Server className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>Endpoint</p>
                <p className="text-foreground" style={{ ...mono, fontSize: 12 }}>localhost:11434</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Cpu className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>Device</p>
                <p className="text-foreground" style={{ ...mono, fontSize: 12 }}>NVIDIA A10G · 24 GiB</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Activity className="w-4 h-4 text-[#10b981] mt-0.5" />
              <div>
                <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>Status</p>
                <p style={{ ...mono, fontSize: 13, fontWeight: 600, color: "#10b981" }}>Healthy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom small stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Database}  label="Vector Store"    value="48,210"    sub="documents indexed" />
          <StatCard icon={HardDrive} label="Storage Used"    value="3.4 GB"    sub="of 50 GB" />
          <StatCard icon={Gauge}     label="Throughput"      value="142 t/s"   sub="tokens/sec" />
          <StatCard icon={BarChart3} label="Error Rate"      value="0.3%"      sub="last 1h" accent="#10b981" />
        </div>

        <div className="h-6 shrink-0" />
      </div>
    </div>
  );
}