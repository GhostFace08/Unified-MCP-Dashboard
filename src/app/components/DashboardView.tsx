import { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronDown, Search, ArrowUpDown, Copy, ExternalLink,
  Download, Check, Calendar, RefreshCw, X as XIcon, ChevronLeft, ChevronRight,
} from "lucide-react";
import { TOOLS, TOOL_MAP, CATEGORIES, type Tool, type Category } from "../config";

// ─── Mock data ────────────────────────────────────────────────────────────────

// Graph data will be computed from `filteredIssues` below. The chart expects
// objects shaped: { time: string, total: number, dynatrace: number, opmanager: number, appdynamics: number, heal: number }

interface IssueRow {
  id: string; srNo: number; source: Tool; issueId: string; application: string;
  title: string; affectedEntities: string; severity: "Critical"|"High"|"Medium"|"Low";
  category: Category; description: string; status: "Active"|"Resolved";
  startTime: string; endTime: string; duration: string;
  endTs?: number | null;
  // Numeric sort key for "most recent" — minutes-of-day; bigger = more recent
  ts: number;
}

function tsOf(t: string): number {
  if (!t || t === "—") return -1;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ─── Real-world timestamp parsers ──────────────────────────────────────────
// Dynatrace sends ISO timestamps with 9 fractional-second digits
// (e.g. "2026-05-08T06:00:47.972000000Z"), which `new Date()` cannot parse
// reliably. Truncate to 3 fractional digits first.
function parseDynatraceTime(str?: string | null): Date | null {
  if (!str) return null;
  const cleaned = str.replace(/\.(\d{3})\d+Z$/, ".$1Z");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

// OPManager sends timestamps like "17 Jun 2026 07:03:03 AM IST", which is
// not a format the native Date parser understands. Parse it manually.
function parseOpManagerTime(str?: string | null): Date | null {
  if (!str) return null;
  const match = str.match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})\s(\d{1,2}):(\d{2}):(\d{2})\s(AM|PM)\sIST$/);
  if (!match) return null;
  let [, day, month, year, hour, minute, second, ampm] = match;
  const months: Record<string, number> = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  let h = Number(hour);
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const d = new Date(Number(year), months[month], Number(day), h, Number(minute), Number(second));
  return isNaN(d.getTime()) ? null : d;
}

// Parses a raw timestamp string, dispatching to the right parser based on
// which source produced it. Falls back to native Date parsing for any
// other ISO-ish strings (e.g. endTime fields, generic timestamps).
function parseSourceTime(raw: string | null | undefined, source: Tool): Date | null {
  if (!raw) return null;
  if (source === "dynatrace") return parseDynatraceTime(raw);
  if (source === "opmanager") return parseOpManagerTime(raw);
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// Issues are loaded from public/data/issues.json at runtime (state created inside component)

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
  const [timeRange, setTimeRange]   = useState("7 days");
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
  const [fileLoaded, setFileLoaded] = useState<Date | null>(null);
  const [fileUpdated, setFileUpdated] = useState<Date | null>(null);
  const [fileChecked, setFileChecked] = useState<Date | null>(null);
  const [fileModified, setFileModified] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

  // When countdown resets (i.e., reaches the configured interval again),
  // refresh durations in the table: for Active issues show running duration
  // (now - start), for Resolved keep end - start. This is a lightweight
  // UI-only update and does not re-fetch data.
  useEffect(() => {
    const secs = Math.max(1, parseInt(uiRefreshTime || "1")) * 60;
    if (countdown === secs) {
      setAllIssues(prev => prev.map(r => {
        try {
          const start = r.ts ? new Date(r.ts) : null;
          // For resolved issues, prefer recorded endTs; if missing, fall back to fileLoaded (when the file was loaded)
          // or finally to the start time (so duration shows 0 rather than blank).
          let end: Date | null = null;
          if (r.status === 'Active') {
            end = null;
          } else {
            if (r.endTs) end = new Date(r.endTs);
            else if (fileLoaded) end = fileLoaded;
            else if (r.ts) end = new Date(r.ts);
            else end = null;
          }
          const newDuration = start ? formatDuration(start, end) : r.duration;
          const newEndTime = end ? formatFullDate(end) : (r.status === 'Active' ? '—' : r.endTime);
          return { ...r, duration: newDuration, endTime: newEndTime };
        } catch (e) {
          return r;
        }
      }));
    }
  }, [countdown, uiRefreshTime]);

  const fmtDate = (d: Date | null) => {
    if (!d) return "—";
    return d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) + ", " + d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", hour12:true });
  };

  function formatHeaderDate(d: Date | null) {
    if (!d) return "—";
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  }

  function formatFullDate(d: Date | null) {
    if (!d) return "—";
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  }

  function formatDuration(start?: Date | null, end?: Date | null) {
    if (!start) return "—";
    const s = start.getTime();
    const e = end ? end.getTime() : Date.now();
    if (isNaN(s) || isNaN(e)) return "—";
    let diff = Math.max(0, e - s);
    const days = Math.floor(diff / (24 * 3600 * 1000));
    diff -= days * 24 * 3600 * 1000;
    const hours = Math.floor(diff / (3600 * 1000));
    diff -= hours * 3600 * 1000;
    const minutes = Math.floor(diff / (60 * 1000));
    diff -= minutes * 60 * 1000;
    const seconds = Math.floor(diff / 1000);
    const parts: string[] = [];
    if (days) parts.push(`${days} day${days>1?"s":""}`);
    if (hours) parts.push(`${hours} hr${hours>1?"s":""}`);
    if (minutes) parts.push(`${minutes} min${minutes>1?"s":""}`);
    if (seconds || parts.length === 0) parts.push(`${seconds} sec${seconds>1?"s":""}`);
    return parts.join(", ");
  }

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

  const DATA_URL = '/data/issues.json';
  const [allIssues, setAllIssues] = useState<IssueRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(DATA_URL, { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const lastModified = res.headers.get('last-modified');
        const data = await res.json();
        return { data, lastModified };
      })
      .then(({ data, lastModified }: any) => {
        if (cancelled) return;
        setErrorMsg(null);
        if (lastModified) setFileModified(new Date(lastModified));
        // Determine the most recent start timestamp across all rows and
        // treat that as the "Last Data Loaded At" time (when newest data
        // started appearing in the UI). Fall back to now if unavailable.
        // json contains { allIssues: [...] } where each entry is a *group*
        // (array) of raw items — NOT tagged with a source field. Source is
        // determined per item: Dynatrace items carry `display_id`,
        // OPManager items carry `alarmId`.
        const groups: any[] = Array.isArray(data.allIssues) ? data.allIssues : (Array.isArray(data) ? data : []);

        const rows: IssueRow[] = [];
        let maxStart = 0;

        groups.forEach(group => {
          const items = Array.isArray(group) ? group : (Array.isArray(group?.data) ? group.data : []);
          items.forEach((item: any, idx: number) => {
            const isDynatrace = item.display_id !== undefined;
            const isOpManager = !isDynatrace && item.alarmId !== undefined;
            const source: Tool = isDynatrace ? ("dynatrace" as Tool) : isOpManager ? ("opmanager" as Tool) : ("unknown" as Tool);

            const issueId = isDynatrace ? item.display_id : isOpManager ? item.alarmId : (item.id ?? `#${idx}`);
            const application = isDynatrace
              ? ((item.affected_entity_names && item.affected_entity_names[0]) || '—')
              : isOpManager
                ? (item.displayName || '—')
                : (item.application || '—');
            const title = isDynatrace ? (item['event.name'] || '—') : isOpManager ? (item.message || '—') : (item.title || '—');
            const affectedEntities = isDynatrace
              ? (Array.isArray(item.affected_entity_names) ? item.affected_entity_names.join(', ') : '—')
              : isOpManager
                ? (item.displayName || '—')
                : '—';

            // ── Severity: source-specific, matching real field shapes ──
            // Dynatrace: numeric string in `event.severity` (1=Low .. 5=Critical-ish)
            // OPManager: free-text in `severity` (Critical/Major/Trouble/Warning/Clear...)
            let severity: IssueRow['severity'] = 'Medium';
            if (isDynatrace) {
              const n = Number(item['event.severity']);
              if (n >= 4) severity = 'Critical';
              else if (n === 3) severity = 'High';
              else if (n === 2) severity = 'Medium';
              else severity = 'Low';
            } else if (isOpManager) {
              const sev = (item.severity || '').toString().toLowerCase();
              if (sev.includes('critical')) severity = 'Critical';
              else if (sev.includes('major') || sev.includes('trouble')) severity = 'High';
              else if (sev.includes('warning')) severity = 'Medium';
              else if (sev.includes('clear') || sev.includes('info')) severity = 'Low';
              else severity = 'Medium';
            }

            const rawCategory = isDynatrace ? (item['event.category'] || item['event.category'.toString()] || '') : isOpManager ? (item.category || '') : (item.category || '');
            const normalizeCategory = (s: string) => {
              if (!s) return 'Unknown';
              const raw = s.replace(/[_\-]/g, ' ').trim();
              const clean = raw.toLowerCase();

              // direct canonical match
              const direct = CATEGORIES.find(c => c.toLowerCase() === clean || clean.includes(c.toLowerCase()));
              if (direct) return direct;

              // heuristic keyword mapping
              if (clean.includes('avail')) return 'Availability';
              if (clean.includes('perf') || clean.includes('latenc') || clean.includes('response') || clean.includes('throughput')) return 'Performance';
              if (clean.includes('cpu') || clean.includes('memory') || clean.includes('disk') || clean.includes('switch') || clean.includes('interface') || clean.includes('server') || clean.includes('process') || clean.includes('probe') || clean.includes('selfmonitor') || clean.includes('apm') || clean.includes('network')) return 'Infrastructure';
              if (clean.includes('error') || clean.includes('exception') || clean.includes('app') || clean.includes('application') || clean.includes('fault') || clean.includes('service')) return 'Application Error';
              if (clean.includes('security') || clean.includes('auth') || clean.includes('access') || clean.includes('attack') || clean.includes('cve')) return 'Security';

              // fallback: capitalize single word
              return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
            };
            const category = normalizeCategory(String(rawCategory));

            // ── Status: source-specific "active" rule ──
            // Dynatrace: active when event.status === ACTIVE
            // OPManager: active whenever status is anything other than CLEAR
            let status: IssueRow['status'] = 'Resolved';
            if (isDynatrace) {
              status = (item['event.status'] || '').toString().toUpperCase() === 'ACTIVE' ? 'Active' : 'Resolved';
            } else if (isOpManager) {
              status = (item.status || '').toString().toUpperCase() !== 'CLEAR' ? 'Active' : 'Resolved';
            }

            // ── Timestamps: parse with the correct per-source parser ──
            const rawStart = isDynatrace ? item['event.start'] : isOpManager ? item.modTime : null;
            const rawEnd = isDynatrace ? (item['event.end'] || null) : null; // OPManager has no distinct end time
            const startDate = parseSourceTime(rawStart, source);
            const endDate = parseSourceTime(rawEnd, source);
            const startTime = formatFullDate(startDate);
            const endTime = status === 'Active' ? '—' : formatFullDate(endDate ?? startDate);
            const duration = formatDuration(startDate, status === 'Active' ? null : (endDate ?? startDate));
            const ts = startDate ? startDate.getTime() : 0;
            const endTs = endDate ? endDate.getTime() : (status === 'Active' ? null : ts);
            if (startDate && startDate.getTime() > maxStart) maxStart = startDate.getTime();

            rows.push({
              id: String(issueId) + `-${source}-${idx}`,
              srNo: rows.length + 1,
              source,
              issueId: String(issueId),
              application: String(application),
              title: String(title),
              affectedEntities: String(affectedEntities),
              severity,
              category: category as Category,
              description: String(item['event.description'] || item.message || ''),
              status,
              startTime,
              endTime,
              duration: String(duration),
              endTs,
              ts
            });
          });
        });

        setAllIssues(rows);
        // set Last Data Loaded At to the newest start timestamp found
        setFileLoaded(maxStart ? new Date(maxStart) : new Date());
        // Mark when the file was loaded into the dashboard UI
        setFileUpdated(new Date());
        // lastUpdated continues to be the hydration-safe clock / UI heartbeat
        setLastUpdated(new Date());
      })
      .catch(err => {
        console.error('Failed to load issues.json', err);
        setErrorMsg(String(err?.message || err));
      });
    return () => { cancelled = true; };
  }, []);

  // Periodic lightweight HEAD check to update fileChecked and fileModified
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const resp = await fetch(DATA_URL, { method: 'HEAD', cache: 'no-store' });
        if (cancelled) return;
        setFileChecked(new Date());
        const lm = resp.headers.get('last-modified');
        if (lm) setFileModified(new Date(lm));
      } catch (e) {
        // ignore
      }
    };
    const id = setInterval(() => { check(); }, 60000);
    // run once immediately
    check();
    return () => { cancelled = true; clearInterval(id); };
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

  // ── Time range → cutoff window (ms) ─────────────────────────────────────
  const RANGE_MS: Record<string, number> = {
    "5 min": 5 * 60 * 1000,
    "10 min": 10 * 60 * 1000,
    "15 min": 15 * 60 * 1000,
    "30 min": 30 * 60 * 1000,
    "1 hr": 60 * 60 * 1000,
    "6 hr": 6 * 60 * 60 * 1000,
    "24 hr": 24 * 60 * 60 * 1000,
    "7 days": 7 * 24 * 60 * 60 * 1000,
  };

  // ── Global filter pipeline ───────────────────────────────────────────────
  // 1. tool filter   2. time range   3. keyword search (global)
  // 4. status (Total/Active/Resolved)   5. categories (union)
  const filteredIssues = useMemo(() => {
    let rows = activeTool === "all" ? allIssues : allIssues.filter(r => r.source === activeTool);

    if (isCustom) {
      if (startTime && endTime && !customRangeError) {
        const s = new Date(startTime).getTime();
        const e = new Date(endTime).getTime();
        rows = rows.filter(r => r.ts >= s && r.ts <= e);
      }
    } else {
      const windowMs = RANGE_MS[timeRange];
      if (windowMs) {
        const cutoff = Date.now() - windowMs;
        rows = rows.filter(r => r.ts >= cutoff);
      }
    }

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
  }, [activeTool, keyword, statusFilter, categoryFilters, timeRange, startTime, endTime, isCustom, customRangeError, allIssues]);

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

  // Build graph data from filteredIssues: daily buckets between the selected
  // range (or last 7 days). Returns an array of objects with counts per tool
  // and total. Memoized for performance.
  const graphData = useMemo(() => {
    // determine range
    let startMs: number;
    let endMs: number = Date.now();
    if (isCustom && startTime && endTime && !customRangeError) {
      startMs = new Date(startTime).getTime();
      endMs = new Date(endTime).getTime();
    } else {
      const windowMs = RANGE_MS[timeRange] ?? RANGE_MS['7 days'];
      startMs = Date.now() - (windowMs ?? RANGE_MS['7 days']);
    }

    const spanMs = Math.max(0, endMs - startMs);
    const useHourlyBuckets = spanMs <= 24 * 60 * 60 * 1000;
    const bucketMs = useHourlyBuckets ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const startDate = new Date(startMs);
    if (useHourlyBuckets) {
      startDate.setMinutes(0, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }

    const buckets: number[] = [];
    for (let t = startDate.getTime(); t <= endMs; t += bucketMs) {
      buckets.push(t);
    }
    if (buckets.length === 0) {
      buckets.push(startDate.getTime());
    }

    const tools = ['dynatrace','opmanager','appdynamics','heal'];
    const rows = buckets.map((bucketStart, index) => {
      const bucketEnd = index === buckets.length - 1 ? endMs : buckets[index + 1] - 1;
      const bucketIssues = filteredIssues.filter(r => r.ts >= bucketStart && r.ts <= bucketEnd);
      const obj: any = {
        time: useHourlyBuckets
          ? new Date(bucketStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : new Date(bucketStart).toLocaleDateString('en-GB', { weekday: 'short' }),
        total: bucketIssues.length,
      };
      tools.forEach(t => { obj[t] = bucketIssues.filter(r => r.source === (t as any)).length; });
      return obj;
    });
    return rows;
  }, [filteredIssues, timeRange, isCustom, startTime, endTime, customRangeError]);

  // Matrix cell counts: per (category, col) → {current, total}
  function cellCounts(cat: Category, app: string, source: Tool) {
    const matches = filteredIssues.filter(r => r.category === cat && r.application === app && r.source === source);
    const current = matches.filter(r => r.status === "Active").length;
    return { current, total: matches.length };
  }

  // Matrix sliding window (first col locked, rest slide one-by-one)
  const [colWindowStart, setColWindowStart] = useState(0);
  const VISIBLE_COLS = 6; // including first locked column visually; actual first is locked separate
  const slideableCols = matrixCols.slice();
  const visibleCols = slideableCols.slice(colWindowStart, colWindowStart + VISIBLE_COLS);
  function slideLeft() { setColWindowStart(s => Math.max(0, s - 1)); }
  function slideRight() { setColWindowStart(s => Math.min(Math.max(0, slideableCols.length - VISIBLE_COLS), s + 1)); }

  // ── Sorting & pagination for issues table ──────────────────────────────
  const sortedIssues = useMemo(() => {
    return [...filteredIssues].sort((a, b) => {
      if (logSort.col === "startTime") {
        return logSort.dir === "asc" ? a.ts - b.ts : b.ts - a.ts;
      }
      if (logSort.col === "endTime") {
        const av = a.endTs ?? a.ts;
        const bv = b.endTs ?? b.ts;
        return logSort.dir === "asc" ? av - bv : bv - av;
      }
      if (logSort.col === "duration") {
        const av = (a.endTs ?? Date.now()) - a.ts;
        const bv = (b.endTs ?? Date.now()) - b.ts;
        return logSort.dir === "asc" ? av - bv : bv - av;
      }
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

  useEffect(() => {
    setLogPage(p => Math.min(p, totalPages));
  }, [totalPages]);

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

  // Compute per-category counts from filteredIssues (robust match to canonical CATEGORIES)
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    filteredIssues.forEach(r => {
      const key = (CATEGORIES.find(c => c.toLowerCase() === String(r.category).toLowerCase()) ?? 'Other');
      m.set(key, (m.get(key) || 0) + 1);
    });
    return m;
  }, [filteredIssues]);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background" style={{ scrollbarWidth: "none" }}>
      {errorMsg && (
        <div className="px-5 py-2 bg-[#fdecea] border border-[#f5c6cb] text-[#611a15]">
          <strong>Data load error:</strong> {errorMsg}
        </div>
      )}
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
        <div>
          <p style={{ ...mono, fontSize: 10, color: "var(--muted-foreground)" }} suppressHydrationWarning>
            Last Data Modified At: {formatHeaderDate(fileModified)} &nbsp;|&nbsp; Last Data Updated At: {formatHeaderDate(fileUpdated)}
          </p>
        </div>
        <div>
          <p style={{ ...mono, fontSize: 10, color: "var(--muted-foreground)" }} suppressHydrationWarning>
            Last Data Checked At: {formatHeaderDate(fileChecked)} &nbsp;|&nbsp;
            <span style={{ color: "var(--primary)" }}>Next Refresh in: {countdown}s</span>
          </p>
        </div>
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
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-border bg-secondary/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-foreground" style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>TOOLS</span>
          <div className="w-px h-4 bg-border/80 mx-1" />
          <button onClick={() => setActiveTool("all")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm border transition-all ${activeTool === "all" ? "border-primary/50 bg-primary/20 text-foreground shadow-sm" : "border-border/70 bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            style={{ ...sans, fontSize: 12, fontWeight: activeTool === "all" ? 600 : 500 }}>
            {activeTool === "all" && <Check className="w-3 h-3 text-primary" />}
            All Tools
          </button>
          {TOOLS.map(t => {
            const isActive = activeTool === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTool(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm border transition-all ${isActive ? "text-foreground shadow-sm" : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary/90"}`}
                style={{ ...sans, fontSize: 12, fontWeight: isActive ? 600 : 500, borderColor: isActive ? t.color+"70" : undefined, background: isActive ? t.color+"22" : "rgba(255,255,255,0.02)", boxShadow: isActive ? `0 0 0 1px ${t.color}30` : undefined }}>
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
                const rowsForCategory = filteredIssues.filter(r => r.category === kpi.category);
                const count = categoryCounts.get(kpi.category) || 0;
                const critical = rowsForCategory.filter(r => r.severity === "Critical").length;
                const errors = rowsForCategory.filter(r => r.category === "Application Error").length;
                return (
                  <button key={kpi.category} onClick={() => toggleCategory(kpi.category)}
                    className={`flex flex-col gap-1.5 px-4 py-3 rounded-sm border text-left transition-all shrink-0 min-w-44 ${isSelected ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-border bg-card hover:border-border/80 hover:bg-secondary/40"}`}>
                    <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>{kpi.category}</p>
                    <p className="text-foreground" style={{ ...mono, fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{count}</p>
                    <p className="text-muted-foreground" style={{ ...mono, fontSize: 10 }}>Critical {critical} | Error {errors}</p>
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
                {/* If a single tool is selected, show that tool's counts as `total` for the chart */}
                <LineChart data={activeTool === 'all' ? graphData : graphData.map(d => ({ time: d.time, total: d[activeTool] || 0 }))} margin={{ top: 10, right: 16, left: -15, bottom: 0 }}>
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
          <div className="rounded-sm border border-border overflow-hidden" style={{ background: "var(--background)" }}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/5">
              <button onClick={slideLeft} className="px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40" disabled={colWindowStart===0}>◀</button>
              <span className="text-muted-foreground" style={{ ...mono, fontSize: 12 }}>Matrix Columns</span>
              <button onClick={slideRight} className="ml-auto px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40" disabled={colWindowStart >= Math.max(0, slideableCols.length - VISIBLE_COLS)}>▶</button>
            </div>
            <div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  {/* Row 1: Application (first) */}
                  <tr style={{ background: "var(--background)" }}>
                    <th rowSpan={2} className="text-left px-3 py-2 border border-gray-300" style={{ ...mono, fontSize: 10, color: "var(--foreground)", minWidth: 130 }}>
                      CATEGORY /<br />APPLICATIONS
                    </th>
                    {matrixCols.length === 0 ? (
                      <th className="text-center px-2 py-2 border border-gray-300" style={{ ...mono, fontSize: 10, color: "var(--foreground)" }}>No data</th>
                    ) : (
                      // Always show first locked column visually as header cell already; now render visible slice
                      visibleCols.map((c, i) => (
                        <th key={`app-${i}`} className="text-center px-2 py-2 border border-gray-300 whitespace-nowrap" style={{ ...mono, fontSize: 10, color: "var(--foreground)", background: "var(--background)" }}>
                          {c.app}
                        </th>
                      ))
                    )}
                  </tr>
                  {/* Row 2: Source (immediately after Application) */}
                  <tr style={{ background: "var(--background)" }}>
                    {visibleCols.map((c, i) => (
                      <th key={`src-${i}`} className="text-center px-2 py-2 border border-gray-300 whitespace-nowrap" style={{ ...mono, fontSize: 9, color: "var(--foreground)", background: "var(--background)" }}>
                        {c.toolName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map(cat => {
                    const rowCells = visibleCols.map(c => cellCounts(cat, c.app, c.tool));
                    const fullRowCells = matrixCols.map(c => cellCounts(cat, c.app, c.tool));
                    const catTotal = fullRowCells.reduce((s, x) => s + x.total, 0);
                    const catCurrent = fullRowCells.reduce((s, x) => s + x.current, 0);
                    return (
                      <tr key={cat}>
                        <td className="px-3 py-2 border border-gray-300" style={{ ...mono, fontSize: 11, color: "var(--foreground)", background: "var(--background)" }}>
                          {cat}<br />
                          <span style={{ fontSize: 10, color: "#555" }}>{catCurrent}/{catTotal}</span>
                        </td>
                        {rowCells.map((cell, j) => {
                          const open = cell.current;
                          const total = cell.total;
                          const closed = Math.max(0, total - open);
                          const isActive = open > 0;
                          const hasAny = total > 0;
                          // Colors (light tints) for states
                          const ACTIVE_BG = "#fde2e1"; // light red
                          const CLOSED_BG = "#f3f4f6"; // neutral light
                          const EMPTY_BG = "#e6f9ed";  // light green

                          const bg = isActive ? ACTIVE_BG : hasAny ? CLOSED_BG : EMPTY_BG;

                          // Use dark text on light backgrounds for good contrast
                          const DARK_TEXT = "#111827"; // slate-900
                          const GREEN_TEXT = "#065f46";
                          const textColor = isActive || hasAny ? DARK_TEXT : GREEN_TEXT;

                          // Show closed\open\total as requested
                          const display = `${closed}\\${open}\\${total}`;

                          return (
                            <td key={j} className="text-center px-2 py-2 border border-gray-300"
                              style={{ background: bg, color: textColor }}>
                              <span style={{ ...mono, fontSize: 11, fontWeight: 700 }}>{display}</span>
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-border rounded-md bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-35 disabled:cursor-not-allowed transition-all shadow-sm"
                style={{ ...sans, fontSize: 12, fontWeight: 600 }}>
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button onClick={() => setLogPage(p => Math.min(totalPages, p + 1))} disabled={logPage === totalPages}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-primary/30 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-35 disabled:cursor-not-allowed transition-all shadow-sm"
                style={{ ...sans, fontSize: 12, fontWeight: 600 }}>
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
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
                        <td className="px-2.5 py-2 max-w-36 break-words whitespace-normal text-foreground" style={{ ...sans, fontSize: 12, wordBreak: 'break-word' }}>{row.title}</td>
                        <td className="px-2.5 py-2 max-w-32 break-words whitespace-normal text-muted-foreground" style={{ ...mono, fontSize: 10, wordBreak: 'break-word' }}>{row.affectedEntities}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap"><SevChip sev={row.severity} /></td>
                        <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground" style={{ ...sans, fontSize: 11 }}>{row.category}</td>
                        <td className="px-2.5 py-2 max-w-48 break-words whitespace-normal text-foreground" style={{ ...sans, fontSize: 11, wordBreak: 'break-word' }}>{row.description}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[10px] ${row.status === "Active" ? "bg-[#e5534b]/15 text-[#e5534b] border-[#e5534b]/30" : "bg-primary/10 text-primary border-primary/20"}`} style={{ ...mono, fontWeight: 500 }}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground" style={{ ...mono, fontSize: 10 }}>{row.startTime}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground" style={{ ...mono, fontSize: 10 }}>{row.endTime}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground" style={{ ...mono, fontSize: 10 }}>{row.duration}</td>
                        <td className="px-2.5 py-2" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2 justify-center">
                            <button onClick={() => copyIssue(row)} title="Copy issue details" aria-label="Copy issue details"
                              className={`p-2 rounded-md border transition-all ${copiedId === row.id ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80"}`}>
                              <Copy className="w-4 h-4" />
                            </button>
                            <button onClick={() => window.open(toolCfg?.url, "_blank")} title="Open in tool" aria-label="Open in tool"
                              className="p-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80 transition-all">
                              <ExternalLink className="w-4 h-4" />
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