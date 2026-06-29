import { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronDown, Search, ArrowUpDown, Copy, ExternalLink,
  Download, Check, Calendar,
} from "lucide-react";
import { TOOLS, TOOL_MAP, CATEGORIES, type Tool, type Category } from "../config";

// ─── Mock data ────────────────────────────────────────────────────────────────

const GRAPH_DATA = {
  all: [
    { time: "Mon", total: 188, dynatrace: 52, opmanager: 48, appdynamics: 71, heal: 17 },
    { time: "Tue", total: 305, dynatrace: 82, opmanager: 91, appdynamics: 112, heal: 20 },
    { time: "Wed", total: 237, dynatrace: 61, opmanager: 74, appdynamics: 88, heal: 14 },
    { time: "Thu", total: 73,  dynatrace: 18, opmanager: 22, appdynamics: 28, heal: 5  },
    { time: "Fri", total: 209, dynatrace: 55, opmanager: 68, appdynamics: 74, heal: 12 },
    { time: "Sat", total: 214, dynatrace: 59, opmanager: 61, appdynamics: 80, heal: 14 },
    { time: "Sun", total: 180, dynatrace: 48, opmanager: 52, appdynamics: 66, heal: 14 },
  ],
  dynatrace:   [{ time:"Mon",total:52 },{ time:"Tue",total:82 },{ time:"Wed",total:61 },{ time:"Thu",total:18 },{ time:"Fri",total:55 },{ time:"Sat",total:59 },{ time:"Sun",total:48 }],
  opmanager:   [{ time:"Mon",total:48 },{ time:"Tue",total:91 },{ time:"Wed",total:74 },{ time:"Thu",total:22 },{ time:"Fri",total:68 },{ time:"Sat",total:61 },{ time:"Sun",total:52 }],
  appdynamics: [{ time:"Mon",total:71 },{ time:"Tue",total:112},{ time:"Wed",total:88 },{ time:"Thu",total:28 },{ time:"Fri",total:74 },{ time:"Sat",total:80 },{ time:"Sun",total:66 }],
  heal:        [{ time:"Mon",total:17 },{ time:"Tue",total:20 },{ time:"Wed",total:14 },{ time:"Thu",total:5  },{ time:"Fri",total:12 },{ time:"Sat",total:14 },{ time:"Sun",total:14 }],
};

// Matrix: columns = { tool, app }, rows = categories
const MATRIX_COLS = [
  { tool: "dynatrace"   as Tool, toolName: "DynaTrace",   app: "easyTravel" },
  { tool: "dynatrace"   as Tool, toolName: "DynaTrace",   app: "petClinic" },
  { tool: "opmanager"   as Tool, toolName: "OPManager",   app: "network-core" },
  { tool: "opmanager"   as Tool, toolName: "OPManager",   app: "dmz-zone" },
  { tool: "appdynamics" as Tool, toolName: "AppDynamics", app: "checkout" },
  { tool: "appdynamics" as Tool, toolName: "AppDynamics", app: "authSvc" },
  { tool: "appdynamics" as Tool, toolName: "AppDynamics", app: "easyTL-linux" },
  { tool: "heal"        as Tool, toolName: "HEAL",        app: "onlineBank" },
];

// [category][col] = {current, total}
const MATRIX_DATA: Record<Category, { current: number; total: number }[]> = {
  "Availability":     [{c:0,t:2},{c:0,t:0},{c:1,t:3},{c:0,t:1},{c:2,t:5},{c:0,t:2},{c:0,t:1},{c:0,t:1}].map(x=>({current:x.c,total:x.t})),
  "Performance":      [{c:1,t:4},{c:0,t:0},{c:0,t:1},{c:0,t:0},{c:0,t:3},{c:1,t:2},{c:0,t:0},{c:0,t:0}].map(x=>({current:x.c,total:x.t})),
  "Infrastructure":   [{c:0,t:1},{c:0,t:1},{c:2,t:4},{c:0,t:2},{c:0,t:1},{c:0,t:0},{c:0,t:0},{c:0,t:0}].map(x=>({current:x.c,total:x.t})),
  "Application Error":[{c:0,t:3},{c:1,t:2},{c:0,t:0},{c:0,t:0},{c:3,t:6},{c:2,t:4},{c:1,t:3},{c:0,t:2}].map(x=>({current:x.c,total:x.t})),
  "Security":         [{c:0,t:0},{c:0,t:1},{c:0,t:0},{c:0,t:0},{c:1,t:2},{c:0,t:0},{c:0,t:1},{c:0,t:0}].map(x=>({current:x.c,total:x.t})),
};

interface IssueRow {
  id: string; srNo: number; source: Tool; issueId: string; application: string;
  title: string; affectedEntities: string; severity: "Critical"|"High"|"Medium"|"Low";
  category: Category; description: string; status: "Active"|"Resolved";
  startTime: string; endTime: string; duration: string;
}

const ALL_ISSUES: IssueRow[] = [
  { id:"1",  srNo:1,  source:"dynatrace",   issueId:"DT-4421", application:"easyTravel",  title:"JDBC Pool Exhausted",          affectedEntities:"payment-svc, checkout",     severity:"Critical", category:"Availability",     description:"100/100 connections active — checkout queries timing out",              status:"Active",   startTime:"14:50", endTime:"—",     duration:"3m 12s" },
  { id:"2",  srNo:2,  source:"dynatrace",   issueId:"DT-4420", application:"petClinic",   title:"Heap OOM Warning",             affectedEntities:"jvm-heap-01",               severity:"Critical", category:"Infrastructure",   description:"GC pauses >2s, heap at 94%, P99 degraded",                              status:"Active",   startTime:"14:47", endTime:"—",     duration:"6m 44s" },
  { id:"3",  srNo:3,  source:"dynatrace",   issueId:"DT-4419", application:"easyTravel",  title:"OOMKilled Pod",                affectedEntities:"payment-service-7d9f8",      severity:"High",     category:"Infrastructure",   description:"K8s pod OOMKilled: exceeded 2Gi memory limit",                          status:"Resolved", startTime:"14:38", endTime:"14:46", duration:"8m 00s" },
  { id:"4",  srNo:4,  source:"dynatrace",   issueId:"DT-4418", application:"petClinic",   title:"Thread Pool Saturation",       affectedEntities:".net-clr-proc",             severity:"High",     category:"Performance",      description:"92% threads busy for >30s, queue growing",                              status:"Active",   startTime:"14:43", endTime:"—",     duration:"9m 01s" },
  { id:"5",  srNo:5,  source:"opmanager",   issueId:"OM-2201", application:"network-core",title:"Firewall CPU Critical",        affectedEntities:"fw-core-01",                severity:"Critical", category:"Infrastructure",   description:"CPU utilization 89%, stateful inspection throughput degraded",           status:"Active",   startTime:"14:51", endTime:"—",     duration:"4m 55s" },
  { id:"6",  srNo:6,  source:"opmanager",   issueId:"OM-2200", application:"network-core",title:"Port Gi0/24 Flapping",         affectedEntities:"core-switch-01, Gi0/24",    severity:"High",     category:"Availability",     description:"12 up/down transitions in 60s — spanning-tree instability",              status:"Active",   startTime:"14:46", endTime:"—",     duration:"7m 02s" },
  { id:"7",  srNo:7,  source:"opmanager",   issueId:"OM-2199", application:"dmz-zone",    title:"LB Backend Health Failure",    affectedEntities:"lb-prod-02",                severity:"High",     category:"Availability",     description:"2/6 backend nodes failing health checks",                               status:"Active",   startTime:"14:40", endTime:"—",     duration:"2m 18s" },
  { id:"8",  srNo:8,  source:"opmanager",   issueId:"OM-2198", application:"dmz-zone",    title:"DNS NXDOMAIN Spike",           affectedEntities:"dns-primary",               severity:"Medium",   category:"Application Error","description":"142 NXDOMAIN in 5min — possible misconfigured zone",                   status:"Resolved", startTime:"14:35", endTime:"14:48", duration:"13m 00s"},
  { id:"9",  srNo:9,  source:"appdynamics", issueId:"AD-9901", application:"checkout",    title:"BT Health Critical",           affectedEntities:"checkout-flow, payment-gw", severity:"Critical", category:"Availability",     description:"Error rate 18%, avg response 12s — checkout BT health critical",         status:"Active",   startTime:"14:53", endTime:"—",     duration:"2m 41s" },
  { id:"10", srNo:10, source:"appdynamics", issueId:"AD-9900", application:"checkout",    title:"Thread Pool Blocked",          affectedEntities:"tomcat-exec-pool",          severity:"Critical", category:"Performance",      description:"All 200 Tomcat threads blocked on DB calls",                            status:"Active",   startTime:"14:50", endTime:"—",     duration:"5m 10s" },
  { id:"11", srNo:11, source:"appdynamics", issueId:"AD-9899", application:"authSvc",     title:"JWT Validation Spike",         affectedEntities:"auth-service-02",           severity:"High",     category:"Security",         description:"234 JWT failures/min from IP 45.33.x.x",                                status:"Active",   startTime:"14:47", endTime:"—",     duration:"6m 06s" },
  { id:"12", srNo:12, source:"appdynamics", issueId:"AD-9898", application:"easyTL-linux",title:"Elasticsearch Latency",        affectedEntities:"es-cluster-prod",           severity:"Medium",   category:"Performance",      description:"Product search P95 = 3.2s (threshold 1s)",                              status:"Active",   startTime:"14:42", endTime:"—",     duration:"8m 44s" },
  { id:"13", srNo:13, source:"appdynamics", issueId:"AD-9897", application:"checkout",    title:"Stripe API Latency",           affectedEntities:"payment-gateway",           severity:"High",     category:"Application Error","description":"Stripe API P99 9.8s — conversion rate down 22%",                       status:"Active",   startTime:"14:37", endTime:"—",     duration:"3m 18s" },
  { id:"14", srNo:14, source:"heal",        issueId:"HL-0441", application:"onlineBank",  title:"Remediation Timeout",          affectedEntities:"payment-service-pod",       severity:"High",     category:"Application Error","description":"restart_pod action timed out after 120s — manual required",              status:"Active",   startTime:"14:54", endTime:"—",     duration:"2m 00s" },
  { id:"15", srNo:15, source:"heal",        issueId:"HL-0440", application:"onlineBank",  title:"Root Cause Confirmed",         affectedEntities:"db-pool, checkout",         severity:"Medium",   category:"Availability",     description:"DB pool exhaustion → checkout timeouts (94% confidence)",               status:"Resolved", startTime:"14:48", endTime:"14:52", duration:"4m 00s" },
  { id:"16", srNo:16, source:"heal",        issueId:"HL-0439", application:"onlineBank",  title:"Disk Predictive Alert",        affectedEntities:"db-primary-vol",            severity:"Low",      category:"Infrastructure",   description:"Disk will reach 95% in ~4h at current write rate",                      status:"Active",   startTime:"14:33", endTime:"—",     duration:"—"      },
];

// KPI data
const KPI_DATA: { category: Category; total: number; critical: number; errors: number }[] = [
  { category: "Availability",     total: 6,  critical: 3, errors: 2 },
  { category: "Performance",      total: 4,  critical: 2, errors: 1 },
  { category: "Infrastructure",   total: 5,  critical: 2, errors: 2 },
  { category: "Application Error",total: 7,  critical: 3, errors: 3 },
  { category: "Security",         total: 2,  critical: 1, errors: 1 },
];

const TIME_RANGE_OPTIONS = ["5 min","10 min","15 min","30 min","1 hr","6 hr","24 hr","7 days","30 days","Custom"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-1.5 group select-none" style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
      {title}
      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
    </button>
  );
}

function SevChip({ sev }: { sev: IssueRow["severity"] }) {
  const cfg: Record<string, string> = {
    Critical: "bg-[#e5534b]/15 text-[#e5534b] border-[#e5534b]/30",
    High:     "bg-[#e5a030]/15 text-[#e5a030] border-[#e5a030]/30",
    Medium:   "bg-[#5b8af0]/15 text-[#5b8af0] border-[#5b8af0]/30",
    Low:      "bg-muted/50 text-muted-foreground border-border",
  };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[10px] ${cfg[sev]}`} style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:500 }}>{sev}</span>;
}

// Custom tooltip for graph
function GraphTooltip({ active, payload, label, activeTool }: any) {
  if (!active || !payload?.length) return null;
  const isAll = activeTool === "all";
  const total = payload[0]?.value ?? 0;
  return (
    <div className="bg-card border border-border rounded-sm px-3 py-2.5 shadow-xl" style={{ minWidth: 160 }}>
      <p className="text-foreground mb-1.5" style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, fontWeight:600 }}>
        Total: {isAll ? payload.find((p:any) => p.dataKey === "total")?.value ?? total : total}
      </p>
      {isAll && (
        <>
          <div className="border-t border-border/50 mb-1.5" />
          {TOOLS.map(t => {
            const val = payload.find((p:any) => p.dataKey === t.id)?.value;
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 mb-0.5">
                <span style={{ color: t.color, fontFamily:"'JetBrains Mono', monospace", fontSize:10 }}>{t.name}</span>
                <span style={{ color:"var(--foreground)", fontFamily:"'JetBrains Mono', monospace", fontSize:10 }}>{val ?? 0}</span>
              </div>
            );
          })}
        </>
      )}
      <p className="text-muted-foreground mt-1" style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:9 }}>{label}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DashboardView() {
  const [activeTool, setActiveTool] = useState<Tool>("all");
  const [timeRange, setTimeRange]   = useState("15 min");
  const [startTime, setStartTime]   = useState("");
  const [endTime, setEndTime]       = useState("");
  const [uiRefreshTime, setUiRefreshTime] = useState("1");
  const [keyword, setKeyword]       = useState("");

  // Collapsible sections
  const [sections, setSections] = useState({ issueDetails: true, kpis: true, graph: true });
  function toggleSection(k: keyof typeof sections) { setSections(p => ({ ...p, [k]: !p[k] })); }

  // Active filter from card clicks
  type ActiveFilter = { type: "status"; value: "Active"|"Resolved"|"all" } | { type: "category"; value: Category } | null;
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null);
  function setFilter(f: ActiveFilter) { setActiveFilter(p => (JSON.stringify(p)===JSON.stringify(f) ? null : f)); }

  // Countdown
  const [countdown, setCountdown] = useState(parseInt(uiRefreshTime||"1") * 60);
  const [lastUpdated] = useState(new Date());
  useEffect(() => {
    const secs = Math.max(1, parseInt(uiRefreshTime || "1")) * 60;
    setCountdown(secs);
    const id = setInterval(() => setCountdown(p => p <= 1 ? secs : p - 1), 1000);
    return () => clearInterval(id);
  }, [uiRefreshTime]);

  const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) + ", " + d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", hour12:true });

  // Log table state
  const [logSearch, setLogSearch]     = useState("");
  const [logSort, setLogSort]         = useState<{ col: keyof IssueRow; dir: "asc"|"desc" }>({ col:"srNo", dir:"asc" });
  const [showEntries, setShowEntries] = useState(10);
  const [logPage, setLogPage]         = useState(1);
  const [exportOpen, setExportOpen]   = useState(false);
  const [copiedId, setCopiedId]       = useState<string|null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered issues (by tool, keyword, activeFilter)
  const filteredIssues = useMemo(() => {
    let rows = activeTool === "all" ? ALL_ISSUES : ALL_ISSUES.filter(r => r.source === activeTool);
    if (keyword) {
      const kw = keyword.toLowerCase();
      rows = rows.filter(r => r.title.toLowerCase().includes(kw) || r.description.toLowerCase().includes(kw) || r.issueId.toLowerCase().includes(kw) || r.application.toLowerCase().includes(kw));
    }
    if (activeFilter?.type === "status") {
      if (activeFilter.value !== "all") rows = rows.filter(r => r.status === activeFilter.value);
    } else if (activeFilter?.type === "category") {
      rows = rows.filter(r => r.category === activeFilter.value);
    }
    return rows;
  }, [activeTool, keyword, activeFilter]);

  const sortedIssues = useMemo(() => {
    return [...filteredIssues].sort((a, b) => {
      const av = String(a[logSort.col]), bv = String(b[logSort.col]);
      return logSort.dir === "asc" ? av.localeCompare(bv, undefined, { numeric: true }) : bv.localeCompare(av, undefined, { numeric: true });
    });
  }, [filteredIssues, logSort]);

  // Additional log-table search (separate from keyword)
  const [tableSearch, setTableSearch] = useState("");
  const tableFiltered = useMemo(() => {
    if (!tableSearch) return sortedIssues;
    const ts = tableSearch.toLowerCase();
    return sortedIssues.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(ts)));
  }, [sortedIssues, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(tableFiltered.length / showEntries));
  const pageRows = tableFiltered.slice((logPage - 1) * showEntries, logPage * showEntries);

  function sortBy(col: keyof IssueRow) {
    setLogSort(p => p.col === col ? { col, dir: p.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
    setLogPage(1);
  }

  // Issue summary counts
  const toolIssues = activeTool === "all" ? ALL_ISSUES : ALL_ISSUES.filter(r => r.source === activeTool);
  const total    = toolIssues.length;
  const active   = toolIssues.filter(r => r.status === "Active").length;
  const resolved = toolIssues.filter(r => r.status === "Resolved").length;

  // Per-tool breakdown string e.g. "DT 4 | OPM 3"
  function toolBreakdown(filter?: "Active"|"Resolved") {
    const src = filter ? toolIssues.filter(r => r.status === filter) : toolIssues;
    return TOOLS.map(t => {
      const c = src.filter(r => r.source === t.id).length;
      return c > 0 ? `${t.shortName} ${c}` : null;
    }).filter(Boolean).join(" | ") || "—";
  }

  // Matrix cols filtered by activeTool
  const visibleCols = activeTool === "all" ? MATRIX_COLS : MATRIX_COLS.filter(c => c.tool === activeTool);
  const visibleColIdxs = visibleCols.map(c => MATRIX_COLS.indexOf(c));

  // Export helpers
  function exportCSV() {
    const headers = ["Sr.No","Source","Issue ID","Application","Title","Affected Entities","Severity","Category","Description","Status","Start Time","End Time","Duration"];
    const rows = tableFiltered.map(r => [r.srNo,r.source,r.issueId,r.application,r.title,r.affectedEntities,r.severity,r.category,`"${r.description}"`,r.status,r.startTime,r.endTime,r.duration].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "issues.csv"; a.click();
    URL.revokeObjectURL(url);
  }
  function exportExcel() {
    const headers = ["Sr.No","Source","Issue ID","Application","Title","Affected Entities","Severity","Category","Description","Status","Start Time","End Time","Duration"];
    const html = `<table><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr>${tableFiltered.map(r=>`<tr><td>${r.srNo}</td><td>${r.source}</td><td>${r.issueId}</td><td>${r.application}</td><td>${r.title}</td><td>${r.affectedEntities}</td><td>${r.severity}</td><td>${r.category}</td><td>${r.description}</td><td>${r.status}</td><td>${r.startTime}</td><td>${r.endTime}</td><td>${r.duration}</td></tr>`).join("")}</table>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "issues.xls"; a.click();
    URL.revokeObjectURL(url);
  }

  function copyIssue(row: IssueRow) {
    const text = `Issue ID: ${row.issueId}\nSource: ${TOOL_MAP[row.source]?.name}\nApplication: ${row.application}\nTitle: ${row.title}\nSeverity: ${row.severity}\nCategory: ${row.category}\nStatus: ${row.status}\nDescription: ${row.description}\nStart: ${row.startTime} | End: ${row.endTime} | Duration: ${row.duration}`;
    navigator.clipboard.writeText(text).then(() => { setCopiedId(row.id); setTimeout(() => setCopiedId(null), 1500); });
  }

  const isCustom = timeRange === "Custom";
  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  const sans = { fontFamily: "'Inter', sans-serif" };

  const activeToolConfig = TOOL_MAP[activeTool];

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background" style={{ scrollbarWidth: "none" }}>
      {/* ── Title row ── */}
      <div className="flex items-start justify-between px-5 pt-4 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-sm bg-primary flex items-center justify-center">
            <span style={{ ...mono, fontSize: 9, color: "var(--primary-foreground)", fontWeight: 700 }}>M</span>
          </div>
          <h1 style={{ ...sans, fontSize: 18, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
            MCP DASHBOARD
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* UI Refresh Time */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary border border-border rounded-sm">
            <span className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>UI Refresh</span>
            <input
              type="number" min="1" max="60" value={uiRefreshTime}
              onChange={e => setUiRefreshTime(e.target.value)}
              className="w-10 bg-transparent text-foreground outline-none text-center"
              style={{ ...mono, fontSize: 11 }}
            />
            <span className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>min</span>
          </div>
          {/* Keyword search */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary border border-border rounded-sm">
            <input
              value={keyword} onChange={e => setKeyword(e.target.value)}
              placeholder="Enter Keyword"
              className="bg-transparent text-foreground placeholder:text-muted-foreground outline-none w-32"
              style={{ ...sans, fontSize: 12 }}
            />
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-5 py-1.5 border-b border-border/40 bg-secondary/30">
        <p style={{ ...mono, fontSize: 10, color: "var(--muted-foreground)" }}>
          Last Data Retrieved: {fmtDate(lastUpdated)} &nbsp;|&nbsp; Last Data Loaded: {fmtDate(lastUpdated)}
        </p>
        <p style={{ ...mono, fontSize: 10, color: "var(--muted-foreground)" }}>
          Last Update Checked: {fmtDate(lastUpdated)} &nbsp;|&nbsp;
          <span style={{ color: "var(--primary)" }}>Next Refresh in: {countdown}s</span>
        </p>
      </div>

      {/* ── Tools + time range bar ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-border">
        {/* Tool pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground" style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>TOOLS</span>
          <div className="w-px h-4 bg-border mx-1" />
          {/* All */}
          <button
            onClick={() => setActiveTool("all")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-sm border transition-all ${activeTool === "all" ? "border-border bg-card text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground"}`}
            style={{ ...sans, fontSize: 12 }}>
            {activeTool === "all" && <Check className="w-3 h-3 text-primary" />}
            All Tools
          </button>
          {TOOLS.map(t => {
            const isActive = activeTool === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTool(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-sm border transition-all ${isActive ? "text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground"}`}
                style={{ ...sans, fontSize: 12, borderColor: isActive ? t.color+"60" : undefined, background: isActive ? t.color+"14" : undefined, boxShadow: isActive ? `0 0 0 1px ${t.color}25` : undefined }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.status === "online" ? t.color : t.status === "degraded" ? "#f59e0b" : "#e5534b" }} />
                <span style={{ color: isActive ? t.color : undefined, fontWeight: isActive ? 500 : 400 }}>{t.name}</span>
                {t.status === "degraded" && <span style={{ ...mono, fontSize: 9, color: "#f59e0b" }}>⚠</span>}
              </button>
            );
          })}
        </div>

        {/* Time controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
            disabled={!isCustom}
            className={`bg-secondary border border-border rounded-sm px-2 py-1 text-foreground outline-none transition-opacity ${!isCustom ? "opacity-40 cursor-not-allowed" : ""}`}
            style={{ ...mono, fontSize: 10 }} />
          <span className="text-muted-foreground" style={{ ...mono, fontSize: 10 }}>TO</span>
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)}
            disabled={!isCustom}
            className={`bg-secondary border border-border rounded-sm px-2 py-1 text-foreground outline-none transition-opacity ${!isCustom ? "opacity-40 cursor-not-allowed" : ""}`}
            style={{ ...mono, fontSize: 10 }} />
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)}
            className="bg-secondary border border-border rounded-sm px-2 py-1 text-foreground outline-none focus:border-primary/50"
            style={{ ...mono, fontSize: 11 }}>
            {TIME_RANGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 py-4">

        {/* ── Issue Details ── */}
        <div>
          <SectionHeader title="Issue Details" open={sections.issueDetails} onToggle={() => toggleSection("issueDetails")} />
          {sections.issueDetails && (
            <div className="flex gap-3 mt-3 flex-wrap">
              {[
                { label: "Total", count: total, breakdown: toolBreakdown(), filter: { type: "status" as const, value: "all" as const } },
                { label: "Active", count: active, breakdown: toolBreakdown("Active"), filter: { type: "status" as const, value: "Active" as const } },
                { label: "Resolved", count: resolved, breakdown: toolBreakdown("Resolved"), filter: { type: "status" as const, value: "Resolved" as const } },
              ].map(card => {
                const isActive = activeFilter?.type === "status" && activeFilter.value === card.filter.value;
                return (
                  <button key={card.label} onClick={() => setFilter(card.filter)}
                    className={`flex flex-col gap-1.5 px-4 py-3 rounded-sm border text-left transition-all min-w-40 ${isActive ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-border/80 hover:bg-secondary/40"}`}>
                    <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>{card.label}</p>
                    <p className="text-foreground" style={{ ...mono, fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{card.count}</p>
                    <p className="text-muted-foreground" style={{ ...mono, fontSize: 10 }}>{card.breakdown}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── KPIs ── */}
        <div>
          <SectionHeader title="KPIs" open={sections.kpis} onToggle={() => toggleSection("kpis")} />
          {sections.kpis && (
            <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {KPI_DATA.map(kpi => {
                const isActive = activeFilter?.type === "category" && activeFilter.value === kpi.category;
                const toolCount = activeTool === "all" ? toolIssues.filter(r => r.category === kpi.category).length : toolIssues.filter(r => r.category === kpi.category).length;
                return (
                  <button key={kpi.category} onClick={() => setFilter({ type: "category", value: kpi.category })}
                    className={`flex flex-col gap-1.5 px-4 py-3 rounded-sm border text-left transition-all shrink-0 min-w-44 ${isActive ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-border/80 hover:bg-secondary/40"}`}>
                    <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>{kpi.category}</p>
                    <p className="text-foreground" style={{ ...mono, fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{toolCount}</p>
                    <p className="text-muted-foreground" style={{ ...mono, fontSize: 10 }}>Critical {kpi.critical} | Error {kpi.errors}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Graph ── */}
        <div>
          <SectionHeader title="Total Issues Graph" open={sections.graph} onToggle={() => toggleSection("graph")} />
          {sections.graph && (
            <div className="mt-3 bg-card border border-border rounded-sm p-4">
              <p className="text-foreground mb-1" style={{ ...sans, fontSize: 12, fontWeight: 500 }}>Total Issues</p>
              <p className="text-muted-foreground mb-3" style={{ ...mono, fontSize: 10 }}>
                {activeTool === "all" ? "All Sources" : activeToolConfig?.name} · {timeRange}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={GRAPH_DATA[activeTool]} margin={{ top: 10, right: 16, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill: "#6b7080", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#6b7080", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} tickLine={false} axisLine={false} label={{ value: "Count", angle: -90, position: "insideLeft", fill: "#6b7080", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} />
                  <Tooltip content={(props: any) => <GraphTooltip {...props} activeTool={activeTool} />} />
                  <Line key="line-total" name="Total" type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }}
                    label={{ fill: "#a0a5b4", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", position: "top" }} />
                  {/* Hidden lines for tooltip data */}
                  {activeTool === "all" && TOOLS.map(t => (
                    <Line key={`line-${t.id}`} name={t.name} type="monotone" dataKey={t.id} stroke={t.color} strokeWidth={0} dot={false} legendType="none" />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Evaluation Matrix ── */}
        <div>
          <p className="mb-3" style={{ ...sans, fontSize: 14, fontWeight: 600, color: "white" }}>Evaluation Matrix</p>
          <div className="rounded-sm border border-border overflow-hidden" style={{ background: "white" }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                {/* Row 1: tool source headers */}
                <tr style={{ background: "#1e2028" }}>
                  <th rowSpan={2} className="text-left px-3 py-2 border border-gray-200/20" style={{ ...mono, fontSize: 10, color: "white", minWidth: 130 }}>
                    CATEGORY /<br />APPLICATIONS
                  </th>
                  {(() => {
                    // Group consecutive same-tool columns
                    const groups: { tool: Tool; name: string; span: number }[] = [];
                    visibleCols.forEach(c => {
                      const last = groups[groups.length - 1];
                      if (last && last.tool === c.tool) last.span++;
                      else groups.push({ tool: c.tool, name: c.toolName, span: 1 });
                    });
                    return groups.map((g, i) => (
                      <th key={i} colSpan={g.span} className="text-center px-2 py-2 border border-gray-200/20" style={{ ...mono, fontSize: 10, color: TOOL_MAP[g.tool]?.color ?? "white" }}>
                        {g.name}
                      </th>
                    ));
                  })()}
                </tr>
                {/* Row 2: application names */}
                <tr style={{ background: "#2a2d38" }}>
                  {visibleCols.map((c, i) => (
                    <th key={i} className="text-center px-2 py-2 border border-gray-200/20 whitespace-nowrap" style={{ ...mono, fontSize: 9, color: "#a0a5b4" }}>
                      {c.app}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map(cat => {
                  const rowCells = MATRIX_DATA[cat];
                  const catTotal = visibleColIdxs.reduce((s, ci) => s + rowCells[ci].total, 0);
                  const catCurrent = visibleColIdxs.reduce((s, ci) => s + rowCells[ci].current, 0);
                  return (
                    <tr key={cat} className="border-b border-gray-200">
                      <td className="px-3 py-2 border border-gray-200 bg-[#1e2028]" style={{ ...mono, fontSize: 11, color: "white" }}>
                        {cat}<br />
                        <span style={{ fontSize: 10, color: "#a0a5b4" }}>{catCurrent}/{catTotal}</span>
                      </td>
                      {visibleColIdxs.map((ci, j) => {
                        const cell = rowCells[ci];
                        const hasActive = cell.current > 0;
                        return (
                          <td key={j} className="text-center px-2 py-2 border border-gray-200"
                            style={{ background: hasActive ? "#ef4444" : "#22c55e", color: "white" }}>
                            <span style={{ ...mono, fontSize: 11, fontWeight: 500 }}>{cell.current}/{cell.total}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── All Issues Log ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-foreground" style={{ ...sans, fontSize: 14, fontWeight: 600 }}>All Issues Log</p>
            <div className="flex items-center gap-2">
              {/* Export */}
              <div className="relative" ref={exportRef}>
                <button onClick={() => setExportOpen(o => !o)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  style={{ ...sans, fontSize: 12 }}>
                  <Download className="w-3.5 h-3.5" /> EXPORT
                  <ChevronDown className="w-3 h-3" />
                </button>
                {exportOpen && (
                  <div className="absolute left-0 top-full mt-1 w-36 bg-card border border-border rounded-sm shadow-xl z-20 py-1">
                    <button onClick={() => { exportCSV(); setExportOpen(false); }} className="w-full text-left px-3 py-2 text-foreground hover:bg-secondary transition-colors" style={{ ...sans, fontSize: 12 }}>Export CSV</button>
                    <button onClick={() => { exportExcel(); setExportOpen(false); }} className="w-full text-left px-3 py-2 text-foreground hover:bg-secondary transition-colors" style={{ ...sans, fontSize: 12 }}>Export Excel</button>
                  </div>
                )}
              </div>
              {/* Pagination arrows */}
              <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1}
                className="px-2 py-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors" style={{ ...mono, fontSize: 11 }}>‹</button>
              <button onClick={() => setLogPage(p => Math.min(totalPages, p + 1))} disabled={logPage === totalPages}
                className="px-2 py-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors" style={{ ...mono, fontSize: 11 }}>›</button>
            </div>
          </div>

          {/* Table controls */}
          <div className="flex items-center justify-between mb-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground" style={{ ...sans, fontSize: 12 }}>Show</span>
              <select value={showEntries} onChange={e => { setShowEntries(Number(e.target.value)); setLogPage(1); }}
                className="bg-secondary border border-border rounded-sm px-2 py-1 text-foreground outline-none" style={{ ...mono, fontSize: 11 }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-muted-foreground" style={{ ...sans, fontSize: 12 }}>Entries</span>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary border border-border rounded-sm px-2.5 py-1.5">
              <input value={tableSearch} onChange={e => { setTableSearch(e.target.value); setLogPage(1); }}
                placeholder="Enter Filters"
                className="bg-transparent text-foreground placeholder:text-muted-foreground outline-none w-40"
                style={{ ...sans, fontSize: 12 }} />
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-secondary/60 border-b border-border">
                    {([
                      { col:"srNo",            label:"Sr. No." },
                      { col:"source",          label:"Source" },
                      { col:"issueId",         label:"Issue ID" },
                      { col:"application",     label:"Application" },
                      { col:"title",           label:"Title" },
                      { col:"affectedEntities",label:"Affected Entities" },
                      { col:"severity",        label:"Severity" },
                      { col:"category",        label:"Category" },
                      { col:"description",     label:"Description" },
                      { col:"status",          label:"Status" },
                      { col:"startTime",       label:"Start Time" },
                      { col:"endTime",         label:"End Time" },
                      { col:"duration",        label:"Duration" },
                    ] as { col: keyof IssueRow; label: string }[]).map(({ col, label }) => (
                      <th key={col} onClick={() => sortBy(col)}
                        className="text-left px-2.5 py-2 text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap"
                        style={{ ...mono, fontSize: 10, letterSpacing: "0.05em" }}>
                        <span className="flex items-center gap-1">
                          {label}
                          {logSort.col === col
                            ? <span style={{ color: "var(--primary)" }}>{logSort.dir === "asc" ? "↑" : "↓"}</span>
                            : <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />}
                        </span>
                      </th>
                    ))}
                    <th className="text-center px-2.5 py-2 text-muted-foreground whitespace-nowrap" style={{ ...mono, fontSize: 10, letterSpacing: "0.05em" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr><td colSpan={14} className="text-center py-8 text-muted-foreground" style={{ ...sans, fontSize: 13 }}>No issues found.</td></tr>
                  ) : pageRows.map(row => {
                    const toolCfg = TOOL_MAP[row.source];
                    return (
                      <tr key={row.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                        <td className="px-2.5 py-2 text-muted-foreground whitespace-nowrap" style={{ ...mono, fontSize: 11 }}>{row.srNo}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span style={{ ...mono, fontSize: 11, color: toolCfg?.color, fontWeight: 500 }}>{toolCfg?.name}</span>
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span style={{ ...mono, fontSize: 11, color: "var(--primary)" }}>{row.issueId}</span>
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap text-foreground" style={{ ...mono, fontSize: 11 }}>{row.application}</td>
                        <td className="px-2.5 py-2 max-w-36 truncate text-foreground" style={{ ...sans, fontSize: 12 }}>{row.title}</td>
                        <td className="px-2.5 py-2 max-w-32 truncate text-muted-foreground" style={{ ...mono, fontSize: 10 }}>{row.affectedEntities}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap"><SevChip sev={row.severity} /></td>
                        <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground" style={{ ...sans, fontSize: 11 }}>{row.category}</td>
                        <td className="px-2.5 py-2 max-w-48 truncate text-foreground" style={{ ...sans, fontSize: 11 }}>{row.description}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[10px] ${row.status === "Active" ? "bg-[#e5534b]/15 text-[#e5534b] border-[#e5534b]/30" : "bg-primary/10 text-primary border-primary/20"}`} style={{ ...mono, fontWeight: 500 }}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground" style={{ ...mono, fontSize: 10 }}>{row.startTime}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground" style={{ ...mono, fontSize: 10 }}>{row.endTime}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground" style={{ ...mono, fontSize: 10 }}>{row.duration}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 justify-center">
                            <button onClick={() => copyIssue(row)} title="Copy issue details"
                              className={`p-1.5 rounded-sm border transition-colors ${copiedId === row.id ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"}`}>
                              {copiedId === row.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button onClick={() => window.open(toolCfg?.url, "_blank")} title="Open in tool"
                              className="p-1.5 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination footer */}
            <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
              <span className="text-muted-foreground" style={{ ...mono, fontSize: 10 }}>
                Showing {Math.min((logPage-1)*showEntries+1, tableFiltered.length)}–{Math.min(logPage*showEntries, tableFiltered.length)} of {tableFiltered.length} entries
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setLogPage(p)}
                    className={`w-7 h-7 rounded-sm flex items-center justify-center transition-colors ${p === logPage ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                    style={{ ...mono, fontSize: 11 }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="h-6 shrink-0" />
      </div>
    </div>
  );
}
