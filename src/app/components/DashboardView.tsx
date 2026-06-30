import { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronDown, Search, ArrowUpDown, Copy, ExternalLink,
  Download, Check, Calendar, RefreshCw, X as XIcon,
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

interface IssueRow {
  id: string; srNo: number; source: Tool; issueId: string; application: string;
  title: string; affectedEntities: string; severity: "Critical"|"High"|"Medium"|"Low";
  category: Category; description: string; status: "Active"|"Resolved";
  startTime: string; endTime: string; duration: string;
  // Numeric sort key for "most recent" — minutes-of-day; bigger = more recent
  ts: number;
}

function tsOf(t: string): number {
  if (!t || t === "—") return -1;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

const RAW_ISSUES = [
  { id:"1",  srNo:1,  source:"dynatrace"   as Tool, issueId:"DT-4421", application:"easyTravel",  title:"JDBC Pool Exhausted",          affectedEntities:"payment-svc, checkout",     severity:"Critical" as const, category:"Availability"      as Category, description:"100/100 connections active — checkout queries timing out",              status:"Active"   as const, startTime:"14:50", endTime:"—",     duration:"3m 12s" },
  { id:"2",  srNo:2,  source:"dynatrace"   as Tool, issueId:"DT-4420", application:"petClinic",   title:"Heap OOM Warning",             affectedEntities:"jvm-heap-01",               severity:"Critical" as const, category:"Infrastructure"    as Category, description:"GC pauses >2s, heap at 94%, P99 degraded",                              status:"Active"   as const, startTime:"14:47", endTime:"—",     duration:"6m 44s" },
  { id:"3",  srNo:3,  source:"dynatrace"   as Tool, issueId:"DT-4419", application:"easyTravel",  title:"OOMKilled Pod",                affectedEntities:"payment-service-7d9f8",     severity:"High"     as const, category:"Infrastructure"    as Category, description:"K8s pod OOMKilled: exceeded 2Gi memory limit",                          status:"Resolved" as const, startTime:"14:38", endTime:"14:46", duration:"8m 00s" },
  { id:"4",  srNo:4,  source:"dynatrace"   as Tool, issueId:"DT-4418", application:"petClinic",   title:"Thread Pool Saturation",       affectedEntities:".net-clr-proc",             severity:"High"     as const, category:"Performance"       as Category, description:"92% threads busy for >30s, queue growing",                              status:"Active"   as const, startTime:"14:43", endTime:"—",     duration:"9m 01s" },
  { id:"5",  srNo:5,  source:"opmanager"   as Tool, issueId:"OM-2201", application:"network-core",title:"Firewall CPU Critical",        affectedEntities:"fw-core-01",                severity:"Critical" as const, category:"Infrastructure"    as Category, description:"CPU utilization 89%, stateful inspection throughput degraded",          status:"Active"   as const, startTime:"14:51", endTime:"—",     duration:"4m 55s" },
  { id:"6",  srNo:6,  source:"opmanager"   as Tool, issueId:"OM-2200", application:"network-core",title:"Port Gi0/24 Flapping",         affectedEntities:"core-switch-01, Gi0/24",    severity:"High"     as const, category:"Availability"      as Category, description:"12 up/down transitions in 60s — spanning-tree instability",             status:"Active"   as const, startTime:"14:46", endTime:"—",     duration:"7m 02s" },
  { id:"7",  srNo:7,  source:"opmanager"   as Tool, issueId:"OM-2199", application:"dmz-zone",    title:"LB Backend Health Failure",    affectedEntities:"lb-prod-02",                severity:"High"     as const, category:"Availability"      as Category, description:"2/6 backend nodes failing health checks",                               status:"Active"   as const, startTime:"14:40", endTime:"—",     duration:"2m 18s" },
  { id:"8",  srNo:8,  source:"opmanager"   as Tool, issueId:"OM-2198", application:"dmz-zone",    title:"DNS NXDOMAIN Spike",           affectedEntities:"dns-primary",               severity:"Medium"   as const, category:"Application Error" as Category, description:"142 NXDOMAIN in 5min — possible misconfigured zone",                    status:"Resolved" as const, startTime:"14:35", endTime:"14:48", duration:"13m 00s"},
  { id:"9",  srNo:9,  source:"appdynamics" as Tool, issueId:"AD-9901", application:"checkout",    title:"BT Health Critical",           affectedEntities:"checkout-flow, payment-gw", severity:"Critical" as const, category:"Availability"      as Category, description:"Error rate 18%, avg response 12s — checkout BT health critical",        status:"Active"   as const, startTime:"14:53", endTime:"—",     duration:"2m 41s" },
  { id:"10", srNo:10, source:"appdynamics" as Tool, issueId:"AD-9900", application:"checkout",    title:"Thread Pool Blocked",          affectedEntities:"tomcat-exec-pool",          severity:"Critical" as const, category:"Performance"       as Category, description:"All 200 Tomcat threads blocked on DB calls",                            status:"Active"   as const, startTime:"14:50", endTime:"—",     duration:"5m 10s" },
  { id:"11", srNo:11, source:"appdynamics" as Tool, issueId:"AD-9899", application:"authSvc",     title:"JWT Validation Spike",         affectedEntities:"auth-service-02",           severity:"High"     as const, category:"Security"          as Category, description:"234 JWT failures/min from IP 45.33.x.x",                                status:"Active"   as const, startTime:"14:47", endTime:"—",     duration:"6m 06s" },
  { id:"12", srNo:12, source:"appdynamics" as Tool, issueId:"AD-9898", application:"easyTL-linux",title:"Elasticsearch Latency",        affectedEntities:"es-cluster-prod",           severity:"Medium"   as const, category:"Performance"       as Category, description:"Product search P95 = 3.2s (threshold 1s)",                              status:"Active"   as const, startTime:"14:42", endTime:"—",     duration:"8m 44s" },
  { id:"13", srNo:13, source:"appdynamics" as Tool, issueId:"AD-9897", application:"checkout",    title:"Stripe API Latency",           affectedEntities:"payment-gateway",           severity:"High"     as const, category:"Application Error" as Category, description:"Stripe API P99 9.8s — conversion rate down 22%",                        status:"Active"   as const, startTime:"14:37", endTime:"—",     duration:"3m 18s" },
  { id:"14", srNo:14, source:"heal"        as Tool, issueId:"HL-0441", application:"onlineBank",  title:"Remediation Timeout",          affectedEntities:"payment-service-pod",       severity:"High"     as const, category:"Application Error" as Category, description:"restart_pod action timed out after 120s — manual required",             status:"Active"   as const, startTime:"14:54", endTime:"—",     duration:"2m 00s" },
  { id:"15", srNo:15, source:"heal"        as Tool, issueId:"HL-0440", application:"onlineBank",  title:"Root Cause Confirmed",         affectedEntities:"db-pool, checkout",         severity:"Medium"   as const, category:"Availability"      as Category, description:"DB pool exhaustion → checkout timeouts (94% confidence)",               status:"Resolved" as const, startTime:"14:48", endTime:"14:52", duration:"4m 00s" },
  { id:"16", srNo:16, source:"heal"        as Tool, issueId:"HL-0439", application:"onlineBank",  title:"Disk Predictive Alert",        affectedEntities:"db-primary-vol",            severity:"Low"      as const, category:"Infrastructure"    as Category, description:"Disk will reach 95% in ~4h at current write rate",                      status:"Active"   as const, startTime:"14:33", endTime:"—",     duration:"—"      },
];
const ALL_ISSUES: IssueRow[] = RAW_ISSUES.map(r => ({ ...r, ts: tsOf(r.startTime) }));

const KPI_DATA: { category: Category; total: number; critical: number; errors: number }[] = [
  { category: "Availability",     total: 6,  critical: 3, errors: 2 },
  { category: "Performance",      total: 4,  critical: 2, errors: 1 },
  { category: "Infrastructure",   total: 5,  critical: 2, errors: 2 },
  { category: "Application Error",total: 7,  critical: 3, errors: 3 },
  { category: "Security",         total: 2,  critical: 1, errors: 1 },
];

// Time presets: 30-day removed, max 7 days enforced
const TIME_RANGE_OPTIONS = ["5 min","10 min","15 min","30 min","1 hr","6 hr","24 hr","7 days","Custom"];
const MAX_RANGE_MS = 7 * 24 * 60 * 60 * 1000;

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

// ─── Issue Details modal ──────────────────────────────────────────────────────
function IssueDetailsModal({ row, onClose }: { row: IssueRow | null; onClose: () => void }) {
  if (!row) return null;
  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  const sans = { fontFamily: "'Inter', sans-serif" };
  const fields: { label: string; value: string }[] = [
    { label: "Issue ID",          value: row.issueId },
    { label: "Sr. No.",           value: String(row.srNo) },
    { label: "Source",            value: TOOL_MAP[row.source]?.name ?? row.source },
    { label: "Application",       value: row.application },
    { label: "Title",             value: row.title },
    { label: "Affected Entities", value: row.affectedEntities },
    { label: "Severity",          value: row.severity },
    { label: "Category",          value: row.category },
    { label: "Status",            value: row.status },
    { label: "Start Time",        value: row.startTime },
    { label: "End Time",          value: row.endTime },
    { label: "Duration",          value: row.duration },
    { label: "Description",       value: row.description },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-sm shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-3 border-b border-border">
          <div>
            <p className="text-muted-foreground" style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Issue Details</p>
            <h2 className="text-foreground mt-0.5" style={{ ...sans, fontSize: 16, fontWeight: 600 }}>{row.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-secondary text-muted-foreground hover:text-foreground">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {fields.map(f => (
              <div key={f.label} className={f.label === "Description" ? "sm:col-span-2" : ""}>
                <p className="text-muted-foreground mb-1" style={{ ...sans, fontSize: 11 }}>{f.label}</p>
                <p className="text-foreground" style={{ ...mono, fontSize: 12, lineHeight: 1.5, wordBreak: "break-word" }}>{f.value || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
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

  // Filter state: status (Total/Active/Resolved) + multiple KPI categories (union)
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Resolved" | null>(null);
  const [categoryFilters, setCategoryFilters] = useState<Category[]>([]);
  function toggleStatus(s: "all" | "Active" | "Resolved") {
    setStatusFilter(p => p === s ? null : s);
  }
  function toggleCategory(c: Category) {
    setCategoryFilters(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  }

  // Hydration-safe clock (avoid SSR mismatch)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, forceTick] = useState(0);
  function bumpRefresh() { setLastUpdated(new Date()); forceTick(t => t + 1); }

  // Countdown
  const [countdown, setCountdown] = useState(parseInt(uiRefreshTime||"1") * 60);
  useEffect(() => { setLastUpdated(new Date()); }, []);
  useEffect(() => {
    const secs = Math.max(1, parseInt(uiRefreshTime || "1")) * 60;
    setCountdown(secs);
    const id = setInterval(() => setCountdown(p => p <= 1 ? secs : p - 1), 1000);
    return () => clearInterval(id);
  }, [uiRefreshTime]);

  const fmtDate = (d: Date | null) => {
    if (!d) return "—";
    return d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) + ", " + d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", hour12:true });
  };

  // Log table state
  const [logSort, setLogSort]         = useState<{ col: keyof IssueRow; dir: "asc"|"desc" }>({ col:"srNo", dir:"asc" });
  const [showEntries, setShowEntries] = useState(10);
  const [logPage, setLogPage]         = useState(1);
  const [exportOpen, setExportOpen]   = useState(false);
  const [copiedId, setCopiedId]       = useState<string|null>(null);
  const [detailsRow, setDetailsRow]   = useState<IssueRow | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Time range validation
  const isCustom = timeRange === "Custom";
  const customRangeError = useMemo(() => {
    if (!isCustom || !startTime || !endTime) return null;
    const s = new Date(startTime).getTime();
    const e = new Date(endTime).getTime();
    if (isNaN(s) || isNaN(e)) return null;
    if (e <= s) return "End time must be after start time.";
    if (e - s > MAX_RANGE_MS) return "Maximum selectable range is 7 days.";
    return null;
  }, [isCustom, startTime, endTime]);

  // ── Global filter pipeline ───────────────────────────────────────────────
  // 1. tool filter   2. keyword search (global)   3. status (Total/Active/Resolved)
  // 4. categories (union)  — when combined with status, it's status AND union(categories)
  const filteredIssues = useMemo(() => {
    let rows = activeTool === "all" ? ALL_ISSUES : ALL_ISSUES.filter(r => r.source === activeTool);
    if (keyword) {
      const kw = keyword.toLowerCase();
      rows = rows.filter(r =>
        r.title.toLowerCase().includes(kw) ||
        r.description.toLowerCase().includes(kw) ||
        r.issueId.toLowerCase().includes(kw) ||
        r.application.toLowerCase().includes(kw) ||
        r.affectedEntities.toLowerCase().includes(kw) ||
        r.category.toLowerCase().includes(kw)
      );
    }
    if (statusFilter && statusFilter !== "all") {
      rows = rows.filter(r => r.status === statusFilter);
    }
    if (categoryFilters.length > 0) {
      rows = rows.filter(r => categoryFilters.includes(r.category));
    }
    return rows;
  }, [activeTool, keyword, statusFilter, categoryFilters]);

  // Per-section counts always reflect global filter
  const total    = filteredIssues.length;
  const active   = filteredIssues.filter(r => r.status === "Active").length;
  const resolved = filteredIssues.filter(r => r.status === "Resolved").length;

  function toolBreakdown(filter?: "Active"|"Resolved") {
    const src = filter ? filteredIssues.filter(r => r.status === filter) : filteredIssues;
    return TOOLS.map(t => {
      const c = src.filter(r => r.source === t.id).length;
      return c > 0 ? `${t.shortName} ${c}` : null;
    }).filter(Boolean).join(" | ") || "—";
  }

  // ── Evaluation Matrix derived from filteredIssues ──────────────────────
  // Columns: one per (Application, Source) pair present in current data,
  // ordered Application-first (recent issue desc), tiebreak by Source A→Z.
  const matrixCols = useMemo(() => {
    type Col = { app: string; tool: Tool; toolName: string; mostRecent: number };
    const map = new Map<string, Col>();
    filteredIssues.forEach(r => {
      const key = `${r.application}::${r.source}`;
      const prev = map.get(key);
      if (!prev || r.ts > prev.mostRecent) {
        map.set(key, { app: r.application, tool: r.source, toolName: TOOL_MAP[r.source]?.name ?? r.source, mostRecent: Math.max(prev?.mostRecent ?? -1, r.ts) });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      // App primary: app with most recent issue first (across all its sources)
      const aAppMax = Math.max(...Array.from(map.values()).filter(x => x.app === a.app).map(x => x.mostRecent));
      const bAppMax = Math.max(...Array.from(map.values()).filter(x => x.app === b.app).map(x => x.mostRecent));
      if (bAppMax !== aAppMax) return bAppMax - aAppMax;
      if (a.app !== b.app) return a.app.localeCompare(b.app);
      // Same app, same timestamp: alphabetical Source
      return a.toolName.localeCompare(b.toolName);
    });
  }, [filteredIssues]);

  // Matrix cell counts: per (category, col) → {current, total}
  function cellCounts(cat: Category, app: string, source: Tool) {
    const matches = filteredIssues.filter(r => r.category === cat && r.application === app && r.source === source);
    const current = matches.filter(r => r.status === "Active").length;
    return { current, total: matches.length };
  }

  // ── Sorting & pagination for issues table ──────────────────────────────
  const sortedIssues = useMemo(() => {
    return [...filteredIssues].sort((a, b) => {
      const av = String(a[logSort.col]), bv = String(b[logSort.col]);
      return logSort.dir === "asc" ? av.localeCompare(bv, undefined, { numeric: true }) : bv.localeCompare(av, undefined, { numeric: true });
    });
  }, [filteredIssues, logSort]);

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

  function clearAllFilters() {
    setKeyword("");
    setStatusFilter(null);
    setCategoryFilters([]);
    setTableSearch("");
  }

  function handleManualRefresh() {
    clearAllFilters();
    bumpRefresh();
    setCountdown(Math.max(1, parseInt(uiRefreshTime || "1")) * 60);
  }

  // Export
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

  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  const sans = { fontFamily: "'Inter', sans-serif" };
  const activeToolConfig = TOOL_MAP[activeTool];

  const filterActive = !!keyword || !!statusFilter || categoryFilters.length > 0 || !!tableSearch;

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
          {/* Manual Refresh */}
          <button onClick={handleManualRefresh} title="Refresh dashboard and clear filters"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            style={{ ...sans, fontSize: 12, fontWeight: 500 }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {/* UI Refresh Time */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary border border-border rounded-sm">
            <span className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>UI Refresh</span>
            <input type="number" min="1" max="60" value={uiRefreshTime}
              onChange={e => setUiRefreshTime(e.target.value)}
              className="w-10 bg-transparent text-foreground outline-none text-center" style={{ ...mono, fontSize: 11 }} />
            <span className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>min</span>
          </div>
          {/* Global keyword search */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary border border-border rounded-sm">
            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Search dashboard"
              className="bg-transparent text-foreground placeholder:text-muted-foreground outline-none w-36" style={{ ...sans, fontSize: 12 }} />
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-5 py-1.5 border-b border-border/40 bg-secondary/30">
        <p style={{ ...mono, fontSize: 10, color: "var(--muted-foreground)" }} suppressHydrationWarning>
          Last Data Retrieved: {fmtDate(lastUpdated)} &nbsp;|&nbsp; Last Data Loaded: {fmtDate(lastUpdated)}
        </p>
        <p style={{ ...mono, fontSize: 10, color: "var(--muted-foreground)" }} suppressHydrationWarning>
          Last Update Checked: {fmtDate(lastUpdated)} &nbsp;|&nbsp;
          <span style={{ color: "var(--primary)" }}>Next Refresh in: {countdown}s</span>
        </p>
      </div>

      {/* ── Active filter bar ── */}
      {filterActive && (
        <div className="flex items-center gap-2 px-5 py-2 border-b border-border/40 bg-primary/5 flex-wrap">
          <span className="text-muted-foreground" style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>Active Filters</span>
          {keyword && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-border bg-card text-foreground" style={{ ...mono, fontSize: 10 }}>Search: "{keyword}"</span>}
          {statusFilter && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-border bg-card text-foreground" style={{ ...mono, fontSize: 10 }}>Status: {statusFilter}</span>}
          {categoryFilters.map(c => <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-border bg-card text-foreground" style={{ ...mono, fontSize: 10 }}>Category: {c}</span>)}
          <button onClick={clearAllFilters} className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-muted-foreground hover:text-foreground" style={{ ...sans, fontSize: 11 }}>
            <XIcon className="w-3 h-3" /> Clear all
          </button>
        </div>
      )}

      {/* ── Tools + time range bar ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-border">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground" style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>TOOLS</span>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={() => setActiveTool("all")}
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

      {customRangeError && (
        <div className="px-5 py-1.5 border-b border-[#e5534b]/30 bg-[#e5534b]/10 text-[#e5534b]" style={{ ...sans, fontSize: 11 }}>
          {customRangeError}
        </div>
      )}

      <div className="flex flex-col gap-5 px-5 py-4">
        {/* ── Issue Details (status cards) ── */}
        <div>
          <SectionHeader title="Issue Details" open={sections.issueDetails} onToggle={() => toggleSection("issueDetails")} />
          {sections.issueDetails && (
            <div className="flex gap-3 mt-3 flex-wrap">
              {([
                { label: "Total",    count: total,    breakdown: toolBreakdown(),          value: "all"      as const },
                { label: "Active",   count: active,   breakdown: toolBreakdown("Active"),  value: "Active"   as const },
                { label: "Resolved", count: resolved, breakdown: toolBreakdown("Resolved"),value: "Resolved" as const },
              ]).map(card => {
                const isSelected = statusFilter === card.value;
                return (
                  <button key={card.label} onClick={() => toggleStatus(card.value)}
                    className={`flex flex-col gap-1.5 px-4 py-3 rounded-sm border text-left transition-all min-w-40 ${isSelected ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-border bg-card hover:border-border/80 hover:bg-secondary/40"}`}>
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
                const isSelected = categoryFilters.includes(kpi.category);
                const count = filteredIssues.filter(r => r.category === kpi.category).length;
                return (
                  <button key={kpi.category} onClick={() => toggleCategory(kpi.category)}
                    className={`flex flex-col gap-1.5 px-4 py-3 rounded-sm border text-left transition-all shrink-0 min-w-44 ${isSelected ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-border bg-card hover:border-border/80 hover:bg-secondary/40"}`}>
                    <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>{kpi.category}</p>
                    <p className="text-foreground" style={{ ...mono, fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{count}</p>
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
                {activeTool === "all" ? "All Sources" : activeToolConfig?.name} · {timeRange}{filterActive ? " · filtered" : ""}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={GRAPH_DATA[activeTool]} margin={{ top: 10, right: 16, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.15)" />
                  <XAxis dataKey="time" tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} tickLine={false} axisLine={false} label={{ value: "Count", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} />
                  <Tooltip content={(props: any) => <GraphTooltip {...props} activeTool={activeTool} />} />
                  <Line key="line-total" name="Total" type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }}
                    label={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", position: "top" }} />
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
          <p className="mb-3 text-foreground" style={{ ...sans, fontSize: 14, fontWeight: 600 }}>Evaluation Matrix</p>
          <div className="rounded-sm border border-border overflow-hidden" style={{ background: "white" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  {/* Row 1: Application (first) */}
                  <tr style={{ background: "white" }}>
                    <th rowSpan={2} className="text-left px-3 py-2 border border-gray-300" style={{ ...mono, fontSize: 10, color: "black", minWidth: 130 }}>
                      CATEGORY /<br />APPLICATIONS
                    </th>
                    {matrixCols.length === 0 ? (
                      <th className="text-center px-2 py-2 border border-gray-300" style={{ ...mono, fontSize: 10, color: "black" }}>No data</th>
                    ) : matrixCols.map((c, i) => (
                      <th key={`app-${i}`} className="text-center px-2 py-2 border border-gray-300 whitespace-nowrap" style={{ ...mono, fontSize: 10, color: "black", background: "white" }}>
                        {c.app}
                      </th>
                    ))}
                  </tr>
                  {/* Row 2: Source (immediately after Application) */}
                  <tr style={{ background: "white" }}>
                    {matrixCols.map((c, i) => (
                      <th key={`src-${i}`} className="text-center px-2 py-2 border border-gray-300 whitespace-nowrap" style={{ ...mono, fontSize: 9, color: "black", background: "white" }}>
                        {c.toolName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map(cat => {
                    const rowCells = matrixCols.map(c => cellCounts(cat, c.app, c.tool));
                    const catTotal = rowCells.reduce((s, x) => s + x.total, 0);
                    const catCurrent = rowCells.reduce((s, x) => s + x.current, 0);
                    return (
                      <tr key={cat}>
                        <td className="px-3 py-2 border border-gray-300" style={{ ...mono, fontSize: 11, color: "black", background: "white" }}>
                          {cat}<br />
                          <span style={{ fontSize: 10, color: "#555" }}>{catCurrent}/{catTotal}</span>
                        </td>
                        {rowCells.map((cell, j) => {
                          const hasActive = cell.current > 0;
                          const hasAny = cell.total > 0;
                          const bg = hasActive ? "#fde2e1" : hasAny ? "#dcf5e3" : "white";
                          return (
                            <td key={j} className="text-center px-2 py-2 border border-gray-300"
                              style={{ background: bg, color: "black" }}>
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
        </div>

        {/* ── All Issues Log ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-foreground" style={{ ...sans, fontSize: 14, fontWeight: 600 }}>All Issues Log</p>
            <div className="flex items-center gap-2">
              <div className="relative" ref={exportRef}>
                <button onClick={() => setExportOpen(o => !o)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  style={{ ...sans, fontSize: 12 }}>
                  <Download className="w-3.5 h-3.5" /> EXPORT
                  <ChevronDown className="w-3 h-3" />
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-sm shadow-xl z-20 py-1">
                    <button onClick={() => { exportCSV(); setExportOpen(false); }} className="w-full text-left px-3 py-2 text-foreground hover:bg-secondary transition-colors" style={{ ...sans, fontSize: 12 }}>Export CSV</button>
                    <button onClick={() => { exportExcel(); setExportOpen(false); }} className="w-full text-left px-3 py-2 text-foreground hover:bg-secondary transition-colors" style={{ ...sans, fontSize: 12 }}>Export Excel</button>
                  </div>
                )}
              </div>
              <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1}
                className="px-2 py-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors" style={{ ...mono, fontSize: 11 }}>‹</button>
              <button onClick={() => setLogPage(p => Math.min(totalPages, p + 1))} disabled={logPage === totalPages}
                className="px-2 py-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors" style={{ ...mono, fontSize: 11 }}>›</button>
            </div>
          </div>

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
                      <tr key={row.id} onClick={() => setDetailsRow(row)} className="border-b border-border/40 hover:bg-secondary/30 transition-colors cursor-pointer">
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
                        <td className="px-2.5 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
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

      <IssueDetailsModal row={detailsRow} onClose={() => setDetailsRow(null)} />
    </div>
  );
}