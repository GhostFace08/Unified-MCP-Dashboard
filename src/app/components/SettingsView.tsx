import { useState, useMemo } from "react";
import {
  Search, Save, RotateCcw, X, Upload, Download, AlertCircle, CheckCircle2,
  Settings as SettingsIcon, Activity, LayoutDashboard, Brain, Database,
  SlidersHorizontal, Cpu, Wrench, ChevronDown, ChevronRight, Plug,
  FileText, FolderOpen, Edit3, ExternalLink, Plus, Info, Tag, Trash2,
} from "lucide-react";
import { TOOLS, TOOL_MAP, type Tool } from "../config";

// ─── Styling primitives (match existing app convention) ───────────────────────
const sans = { fontFamily: "'Inter', sans-serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

const inputCls =
  "bg-secondary border border-border rounded-sm px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors w-full";
const inputStyle = { ...sans, fontSize: 12 };

// ─── Tiny shared building blocks ──────────────────────────────────────────────
function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-foreground" style={{ ...sans, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{children}</h2>
      {hint && <p className="text-muted-foreground mt-1" style={{ ...sans, fontSize: 12 }}>{hint}</p>}
    </div>
  );
}

function Card({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-sm">
      <div className="flex items-start justify-between px-4 py-3 border-b border-border/60">
        <div>
          <h3 className="text-foreground" style={{ ...sans, fontSize: 13, fontWeight: 600 }}>{title}</h3>
          {description && <p className="text-muted-foreground mt-0.5" style={{ ...sans, fontSize: 11 }}>{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 grid gap-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children, mono: useMono }: { label: string; hint?: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-foreground" style={{ ...(useMono ? mono : sans), fontSize: 11, fontWeight: 500 }}>{label}</span>
      {children}
      {hint && <span className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>{hint}</span>}
    </label>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <div>
          {label && <p className="text-foreground" style={{ ...sans, fontSize: 12, fontWeight: 500 }}>{label}</p>}
          {description && <p className="text-muted-foreground mt-0.5" style={{ ...sans, fontSize: 11 }}>{description}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors ${checked ? "bg-primary border-primary" : "bg-secondary border-border"}`}
      >
        <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex items-center p-0.5 bg-secondary border border-border rounded-sm">
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1 rounded-sm transition-colors ${active ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            style={{ ...sans, fontSize: 11, fontWeight: active ? 600 : 400 }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-border bg-secondary text-foreground" style={{ ...mono, fontSize: 11 }}>
      {children}
      {onRemove && (
        <button onClick={onRemove} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
      )}
    </span>
  );
}

function StatusBadge({ status }: { status: "connected" | "disconnected" | "error" | "warning" }) {
  const cfg = {
    connected:    { bg: "bg-[#10b981]/15", fg: "text-[#10b981]",  br: "border-[#10b981]/30", label: "Connected" },
    disconnected: { bg: "bg-muted/50",     fg: "text-muted-foreground", br: "border-border",   label: "Disconnected" },
    error:        { bg: "bg-[#e5534b]/15", fg: "text-[#e5534b]",  br: "border-[#e5534b]/30", label: "Error" },
    warning:      { bg: "bg-[#e5a030]/15", fg: "text-[#e5a030]",  br: "border-[#e5a030]/30", label: "Degraded" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border ${cfg.bg} ${cfg.fg} ${cfg.br}`} style={{ ...mono, fontSize: 10 }}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

function Banner({ icon, children, tone = "info" }: { icon?: React.ReactNode; children: React.ReactNode; tone?: "info" | "warn" }) {
  const cls = tone === "warn"
    ? "bg-[#e5a030]/10 border-[#e5a030]/30 text-[#e5a030]"
    : "bg-primary/10 border-primary/30 text-primary";
  return (
    <div className={`flex items-start gap-2 px-3 py-2 border rounded-sm ${cls}`} style={{ ...sans, fontSize: 12 }}>
      <span className="mt-0.5">{icon ?? <Info className="w-4 h-4" />}</span>
      <span className="text-foreground/90">{children}</span>
    </div>
  );
}

function PathRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-foreground" style={{ ...sans, fontSize: 11, fontWeight: 500 }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <input value={value} onChange={e => onChange(e.target.value)} className={inputCls} style={{ ...mono, fontSize: 12 }} />
        <button className="px-2.5 py-1.5 rounded-sm border border-border bg-secondary text-foreground hover:text-primary hover:border-primary/40 transition-colors" style={{ ...sans, fontSize: 11 }} title="Browse">
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
        <button className="px-2.5 py-1.5 rounded-sm border border-border bg-secondary text-foreground hover:text-primary hover:border-primary/40 transition-colors" style={{ ...sans, fontSize: 11 }} title="Edit">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button className="px-2.5 py-1.5 rounded-sm border border-border bg-secondary text-foreground hover:text-primary hover:border-primary/40 transition-colors" style={{ ...sans, fontSize: 11 }} title="Open">
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Service config (shared across monitoring platforms) ──────────────────────
type CollectionMode = "periodic" | "live";
interface ServiceConfig {
  enabled: boolean;
  baseUrl: string;
  endpoint: string;
  timeout: number;
  mode: CollectionMode;
  apiKey: string;
  apiSecret: string;
  authType: "bearer" | "basic" | "oauth2";
  tokenExpiry: string;
  refreshToken: string;
}

const DEFAULT_SERVICE: ServiceConfig = {
  enabled: true,
  baseUrl: "",
  endpoint: "/api/v2/problems",
  timeout: 30,
  mode: "periodic",
  apiKey: "",
  apiSecret: "",
  authType: "bearer",
  tokenExpiry: "3600",
  refreshToken: "",
};

const SERVICE_DEFAULTS: Record<Tool, Partial<ServiceConfig> & { lastSync: string }> = {
  all:         { lastSync: "—" },
  dynatrace:   { baseUrl: "https://abc12345.live.dynatrace.com", endpoint: "/api/v2/problems",  lastSync: "2 min ago" },
  opmanager:   { baseUrl: "https://opm.corp.local:8080",         endpoint: "/api/json/alarm",   lastSync: "5 min ago" },
  heal:        { baseUrl: "https://heal.corp.local",             endpoint: "/api/v1/incidents", lastSync: "1 min ago" },
  appdynamics: { baseUrl: "https://corp.saas.appdynamics.com",   endpoint: "/controller/rest/applications", lastSync: "12 min ago" },
};

function ServiceForm({ cfg, onChange }: { cfg: ServiceConfig; onChange: (c: ServiceConfig) => void }) {
  const set = <K extends keyof ServiceConfig>(k: K, v: ServiceConfig[K]) => onChange({ ...cfg, [k]: v });
  return (
    <div className="grid gap-4">
      <Card title="Basic Configuration" description="Connection parameters for this monitoring platform.">
        <Toggle checked={cfg.enabled} onChange={v => set("enabled", v)} label="Enable Service" description="When disabled, this provider is excluded from collection and the dashboard." />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Base URL"><input value={cfg.baseUrl} onChange={e => set("baseUrl", e.target.value)} className={inputCls} style={{ ...mono, fontSize: 12 }} placeholder="https://tenant.example.com" /></Field>
          <Field label="API Endpoint"><input value={cfg.endpoint} onChange={e => set("endpoint", e.target.value)} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
          <Field label="Request Timeout (s)"><input type="number" value={cfg.timeout} onChange={e => set("timeout", parseInt(e.target.value || "0"))} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
          <Field label="Connection Status">
            <div className="flex items-center gap-2">
              <StatusBadge status={cfg.enabled ? "connected" : "disconnected"} />
              <button className="px-2.5 py-1 rounded-sm border border-border bg-secondary text-foreground hover:border-primary/40 hover:text-primary transition-colors" style={{ ...sans, fontSize: 11 }}>
                <span className="inline-flex items-center gap-1"><Plug className="w-3 h-3" /> Test Connection</span>
              </button>
            </div>
          </Field>
        </div>
      </Card>

      <Card title="Collection Mode" description="Controls how data is retrieved from this platform.">
        <Segmented
          value={cfg.mode}
          onChange={v => set("mode", v)}
          options={[{ value: "periodic", label: "Periodic (default)" }, { value: "live", label: "Live" }]}
        />
        <Banner>
          Collection Mode controls how data is retrieved from this monitoring platform. It does <strong>not</strong> affect dashboard refresh, UI refresh interval, or client-side polling.
        </Banner>
        {cfg.mode === "live" && (
          <div className="grid grid-cols-2 gap-4 mt-1 pt-3 border-t border-border/60">
            <Field label="Authentication Type">
              <select value={cfg.authType} onChange={e => set("authType", e.target.value as any)} className={inputCls} style={{ ...sans, fontSize: 12 }}>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="oauth2">OAuth 2.0</option>
              </select>
            </Field>
            <Field label="API Key"><input value={cfg.apiKey} onChange={e => set("apiKey", e.target.value)} className={inputCls} style={{ ...mono, fontSize: 12 }} placeholder="dt0c01.XXXXXX" /></Field>
            <Field label="API Secret / Token"><input type="password" value={cfg.apiSecret} onChange={e => set("apiSecret", e.target.value)} className={inputCls} style={{ ...mono, fontSize: 12 }} placeholder="••••••••••••" /></Field>
            <Field label="Token Expiry (s)"><input type="number" value={cfg.tokenExpiry} onChange={e => set("tokenExpiry", e.target.value)} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
            <Field label="Refresh Token"><input value={cfg.refreshToken} onChange={e => set("refreshToken", e.target.value)} className={inputCls} style={{ ...mono, fontSize: 12 }} placeholder="optional" /></Field>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Settings categories ──────────────────────────────────────────────────────
type CategoryId =
  | "general" | "monitoring" | "dashboard" | "issueCategorization" | "ai" | "rag" | "search" | "performance" | "advanced";

const NAV: { id: CategoryId; label: string; icon: any; description: string }[] = [
  { id: "general",     label: "General",            icon: SettingsIcon,     description: "Application & logging" },
  { id: "monitoring",  label: "Monitoring Services",icon: Activity,         description: "Dynatrace, OpManager, HEAL, AppDynamics" },
  { id: "dashboard",   label: "Dashboard",          icon: LayoutDashboard,  description: "Defaults, alerts, display" },
  { id: "issueCategorization", label: "Issue Categorization", icon: Tag,    description: "Keyword-based categories" },
  { id: "ai",          label: "AI & Models",        icon: Brain,            description: "Local LLM & intent detection" },
  { id: "rag",         label: "Retrieval (RAG)",    icon: Database,         description: "Vector store & documents" },
  { id: "search",      label: "Search & Ranking",   icon: SlidersHorizontal,description: "Embeddings, hybrid, re-ranker" },
  { id: "performance", label: "Performance",        icon: Cpu,              description: "GPU & resources" },
  { id: "advanced",    label: "Advanced",           icon: Wrench,           description: "Prompt templates & paths" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export function SettingsView() {
  const [active, setActive] = useState<CategoryId>("monitoring");
  const [navSearch, setNavSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const markDirty = () => setDirty(true);

  // ── GENERAL ───────────────────────────
  const [logLevel, setLogLevel] = useState<"DEBUG"|"INFO"|"WARNING"|"ERROR">("INFO");
  const [logFile, setLogFile] = useState("logs/agent.log");
  const [logSize, setLogSize] = useState(10485760);
  const [logBackups, setLogBackups] = useState(5);

  // ── MONITORING ────────────────────────
  const [monitorTab, setMonitorTab] = useState<Tool>("all");
  const initialServices = useMemo<Record<Exclude<Tool,"all">, ServiceConfig>>(() => ({
    dynatrace:   { ...DEFAULT_SERVICE, ...SERVICE_DEFAULTS.dynatrace },
    opmanager:   { ...DEFAULT_SERVICE, ...SERVICE_DEFAULTS.opmanager },
    heal:        { ...DEFAULT_SERVICE, ...SERVICE_DEFAULTS.heal },
    appdynamics: { ...DEFAULT_SERVICE, ...SERVICE_DEFAULTS.appdynamics },
  }), []);
  const [services, setServices] = useState(initialServices);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const setService = (t: Exclude<Tool,"all">, c: ServiceConfig) => { setServices(s => ({ ...s, [t]: c })); markDirty(); };

  // ── DASHBOARD ─────────────────────────
  const [defaultRange, setDefaultRange] = useState("15 min");
  const [refreshInterval, setRefreshInterval] = useState(1);
  const [landingView, setLandingView] = useState("dashboard");
  const [alertsPerPage, setAlertsPerPage] = useState(10);
  const [sevVisible, setSevVisible] = useState({ Critical: true, High: true, Medium: true, Low: false });
  const [defaultSort, setDefaultSort] = useState("startTime-desc");
  const [showAck, setShowAck] = useState(false);
  const [showResolved, setShowResolved] = useState(true);
  const [compact, setCompact] = useState(false);
  const [density, setDensity] = useState<"comfortable"|"compact">("comfortable");
  const [theme, setTheme] = useState<"system"|"dark"|"light">("dark");
  const [notif, setNotif] = useState({ desktop: true, sound: false, criticalOnly: true });

  // ── AI & MODELS ───────────────────────
  const [llmUrl, setLlmUrl] = useState("http://localhost:11434");
  const [llmModel, setLlmModel] = useState("qwen2.5");
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [intentMode, setIntentMode] = useState<"keyword"|"llm"|"hybrid">("hybrid");
  const [confidence, setConfidence] = useState(0.7);
  const [llmTimeout, setLlmTimeout] = useState(15);
  const [keywords, setKeywords] = useState(["SOP","incident","runbook","playbook","guide","documentation","report","policy","procedure","postmortem"]);
  const [newKw, setNewKw] = useState("");

  // ── RAG ───────────────────────────────
  const [rag, setRag] = useState({
    baseUrl: "http://localhost:8000",
    dataEndpoint: "/data",
    askEndpoint: "/ask",
    metadataFile: "metadata.json",
    timeout: 30,
    uploadFolder: "storage/uploads",
    vectorStore: "storage/vectors",
    bm25Store: "storage/bm25",
    instructionsFile: "config/instructions.md",
    faqFile: "config/faq.json",
    metadataFile2: "config/metadata.json",
    settingsFile: "config/settings.yaml",
  });

  // ── SEARCH & RANKING ──────────────────
  const [embedModel, setEmbedModel] = useState("bge-small-en-v1.5");
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(64);
  const [topK, setTopK] = useState(8);
  const [bm25Weight, setBm25Weight] = useState(0.4);
  const [semWeight, setSemWeight] = useState(0.6);
  const [rerankEnabled, setRerankEnabled] = useState(true);
  const [rerankModel, setRerankModel] = useState("bge-reranker-base");
  const [topN, setTopN] = useState(3);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [simThreshold, setSimThreshold] = useState(0.92);
  const [cacheSize, setCacheSize] = useState(1024);
  const [ttl, setTtl] = useState(3600);

  // ── PERFORMANCE ───────────────────────
  const gpuAvailable = true;
  const [gpuThreshold, setGpuThreshold] = useState(85);
  const gpuUtil = 42;

  // ── ADVANCED ──────────────────────────
  const [mainPrompt, setMainPrompt] = useState("prompts/main.txt");
  const [vizPrompt, setVizPrompt] = useState("prompts/visualization.txt");

  // ── ISSUE CATEGORIZATION ──────────────
  interface IssueCategory { id: string; name: string; keywords: string[] }
  const [issueCats, setIssueCats] = useState<IssueCategory[]>([
    { id: "ic-1", name: "Availability",      keywords: ["down", "outage", "unreachable"] },
    { id: "ic-2", name: "Performance",       keywords: ["slow", "latency", "timeout"] },
    { id: "ic-3", name: "Infrastructure",    keywords: ["cpu", "memory", "disk", "pod"] },
    { id: "ic-4", name: "Application Error", keywords: ["exception", "error", "5xx"] },
    { id: "ic-5", name: "Security",          keywords: ["unauthorized", "jwt", "intrusion"] },
  ]);
  const [icKeywordInputs, setIcKeywordInputs] = useState<Record<string, string>>({});
  const [icWarnings, setIcWarnings] = useState<Record<string, string>>({});
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function findKeywordOwner(kw: string, exceptId?: string) {
    return issueCats.find(c => c.id !== exceptId && c.keywords.some(k => k.toLowerCase() === kw.toLowerCase()));
  }

  function addCategoryKeyword(catId: string) {
    const raw = (icKeywordInputs[catId] || "").trim();
    if (!raw) return;
    const owner = findKeywordOwner(raw, catId);
    if (owner) {
      setIcWarnings(w => ({ ...w, [catId]: `"${raw}" already belongs to "${owner.name}". Duplicate keywords cause ambiguous categorization.` }));
      return;
    }
    setIssueCats(cs => cs.map(c => c.id === catId ? { ...c, keywords: [...c.keywords, raw] } : c));
    setIcKeywordInputs(i => ({ ...i, [catId]: "" }));
    setIcWarnings(w => ({ ...w, [catId]: "" }));
    markDirty();
  }

  function removeCategoryKeyword(catId: string, kw: string) {
    setIssueCats(cs => cs.map(c => c.id === catId ? { ...c, keywords: c.keywords.filter(k => k !== kw) } : c));
    markDirty();
  }

  function addNewCategory() {
    const n = newCatName.trim();
    if (!n) return;
    setIssueCats(cs => [...cs, { id: `ic-${Date.now()}`, name: n, keywords: [] }]);
    setNewCatName("");
    markDirty();
  }

  function deleteCategory(catId: string) {
    setIssueCats(cs => cs.filter(c => c.id !== catId));
    markDirty();
  }

  function commitRename(catId: string) {
    const n = editingName.trim();
    if (n) setIssueCats(cs => cs.map(c => c.id === catId ? { ...c, name: n } : c));
    setEditingId(null); setEditingName("");
    markDirty();
  }

  const navFiltered = NAV.filter(n => !navSearch || n.label.toLowerCase().includes(navSearch.toLowerCase()) || n.description.toLowerCase().includes(navSearch.toLowerCase()));

  function addKeyword() {
    const v = newKw.trim();
    if (!v || keywords.includes(v)) return;
    setKeywords([...keywords, v]); setNewKw(""); markDirty();
  }

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* ── Left nav ── */}
      <aside className="w-64 shrink-0 border-r border-border bg-card/40 flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-border/60">
          <p className="text-muted-foreground mb-2" style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Settings</p>
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-secondary border border-border rounded-sm">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input value={navSearch} onChange={e => setNavSearch(e.target.value)} placeholder="Search settings…" className="bg-transparent outline-none text-foreground placeholder:text-muted-foreground w-full" style={{ ...sans, fontSize: 12 }} />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2" style={{ scrollbarWidth: "none" }}>
          {navFiltered.map(item => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button key={item.id} onClick={() => setActive(item.id)}
                className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-sm text-left transition-colors mb-0.5 ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p style={{ ...sans, fontSize: 12, fontWeight: isActive ? 600 : 500 }}>{item.label}</p>
                  <p className="text-muted-foreground truncate" style={{ ...sans, fontSize: 10 }}>{item.description}</p>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top action bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-secondary/30">
          <div>
            <p className="text-muted-foreground" style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Administration</p>
            <h1 className="text-foreground" style={{ ...sans, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {NAV.find(n => n.id === active)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 pb-24" style={{ scrollbarWidth: "none" }}>
          {/* Global banner */}
          <div className="mb-5">
            <Banner tone="warn" icon={<AlertCircle className="w-4 h-4" />}>
              Some backend configuration changes require restarting the monitoring services before they take effect.
            </Banner>
          </div>

          {/* ── GENERAL ── */}
          {active === "general" && (
            <div className="grid gap-5 max-w-4xl">
              <SectionTitle hint="Application-wide logging and runtime configuration.">Application Configuration</SectionTitle>
              <Card title="Logging" description="Where and how the agent writes diagnostic logs.">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Log Level">
                    <select value={logLevel} onChange={e => { setLogLevel(e.target.value as any); markDirty(); }} className={inputCls} style={inputStyle}>
                      <option value="DEBUG">DEBUG</option>
                      <option value="INFO">INFO</option>
                      <option value="WARNING">WARNING</option>
                      <option value="ERROR">ERROR</option>
                    </select>
                  </Field>
                  <Field label="Log File">
                    <input value={logFile} onChange={e => { setLogFile(e.target.value); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} />
                  </Field>
                  <Field label="Maximum Log Size (Bytes)" hint="Default: 10485760 (10 MiB)">
                    <input type="number" value={logSize} onChange={e => { setLogSize(parseInt(e.target.value || "0")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} />
                  </Field>
                  <Field label="Backup Log Files" hint="Number of rotated files to keep.">
                    <input type="number" value={logBackups} onChange={e => { setLogBackups(parseInt(e.target.value || "0")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} />
                  </Field>
                </div>
              </Card>
            </div>
          )}

          {/* ── MONITORING ── */}
          {active === "monitoring" && (
            <div className="grid gap-5 max-w-5xl">
              <SectionTitle hint="Configure each monitoring platform. All providers use the same layout for consistency.">Monitoring Services</SectionTitle>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1 border-b border-border">
                {([
                  { id: "all" as Tool,  label: "All Services" },
                  ...TOOLS.map(t => ({ id: t.id, label: t.name })),
                ]).map(t => {
                  const isActive = monitorTab === t.id;
                  return (
                    <button key={t.id} onClick={() => setMonitorTab(t.id)}
                      className={`px-3.5 py-2 -mb-px border-b-2 transition-colors ${isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                      style={{ ...sans, fontSize: 12, fontWeight: isActive ? 600 : 500 }}>
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* All services summary */}
              {monitorTab === "all" && (
                <div className="grid gap-3">
                  {TOOLS.map(t => {
                    const cfg = services[t.id as Exclude<Tool,"all">];
                    const isOpen = !!expanded[t.id];
                    const status: "connected"|"warning"|"error" = t.status === "online" ? "connected" : t.status === "degraded" ? "warning" : "error";
                    return (
                      <div key={t.id} className="bg-card border border-border rounded-sm">
                        <button onClick={() => setExpanded(e => ({ ...e, [t.id]: !e[t.id] }))} className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-secondary/40 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: t.color + "22", color: t.color, ...mono, fontSize: 10, fontWeight: 700 }}>{t.shortName}</div>
                            <div className="min-w-0">
                              <p className="text-foreground" style={{ ...sans, fontSize: 13, fontWeight: 600 }}>{t.name}</p>
                              <p className="text-muted-foreground truncate" style={{ ...sans, fontSize: 11 }}>{t.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-muted-foreground hidden md:inline" style={{ ...mono, fontSize: 10 }}>Last Sync: {SERVICE_DEFAULTS[t.id].lastSync}</span>
                            <span className="text-muted-foreground hidden md:inline" style={{ ...mono, fontSize: 10 }}>Mode: {cfg.mode}</span>
                            <StatusBadge status={status} />
                            <span onClick={(e) => e.stopPropagation()} className="px-2 py-1 rounded-sm border border-border bg-secondary text-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer" style={{ ...sans, fontSize: 11 }}>
                              <span className="inline-flex items-center gap-1"><Plug className="w-3 h-3" /> Test</span>
                            </span>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-border/60">
                            <ServiceForm cfg={cfg} onChange={c => setService(t.id as Exclude<Tool,"all">, c)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Individual service tab */}
              {monitorTab !== "all" && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: TOOL_MAP[monitorTab].color + "22", color: TOOL_MAP[monitorTab].color, ...mono, fontSize: 11, fontWeight: 700 }}>{TOOL_MAP[monitorTab].shortName}</div>
                    <div>
                      <p className="text-foreground" style={{ ...sans, fontSize: 14, fontWeight: 600 }}>{TOOL_MAP[monitorTab].name}</p>
                      <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>{TOOL_MAP[monitorTab].description}</p>
                    </div>
                  </div>
                  <ServiceForm cfg={services[monitorTab as Exclude<Tool,"all">]} onChange={c => setService(monitorTab as Exclude<Tool,"all">, c)} />
                </div>
              )}
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {active === "dashboard" && (
            <div className="grid gap-5 max-w-5xl">
              <SectionTitle hint="Defaults and display preferences for the operations dashboard.">Dashboard</SectionTitle>

              <Card title="Dashboard Defaults" description="Applied when the dashboard is first opened.">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Default Time Range">
                    <select value={defaultRange} onChange={e => { setDefaultRange(e.target.value); markDirty(); }} className={inputCls} style={inputStyle}>
                      {["5 min","10 min","15 min","30 min","1 hr","6 hr","24 hr","7 days","30 days"].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </Field>
                  <Field label="UI Refresh Interval (min)"><input type="number" value={refreshInterval} onChange={e => { setRefreshInterval(parseInt(e.target.value || "1")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                  <Field label="Default Landing View">
                    <select value={landingView} onChange={e => { setLandingView(e.target.value); markDirty(); }} className={inputCls} style={inputStyle}>
                      <option value="dashboard">Dashboard</option>
                      <option value="chat">Chat</option>
                      <option value="settings">Settings</option>
                    </select>
                  </Field>
                  <Field label="Maximum Alerts Per Page"><input type="number" value={alertsPerPage} onChange={e => { setAlertsPerPage(parseInt(e.target.value || "10")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                </div>
              </Card>

              <Card title="Alert Visibility" description="Controls which alerts appear in the issue table and KPIs.">
                <div>
                  <p className="text-foreground mb-2" style={{ ...sans, fontSize: 11, fontWeight: 500 }}>Visible Severity Levels</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(["Critical","High","Medium","Low"] as const).map(s => {
                      const on = sevVisible[s];
                      return (
                        <button key={s} onClick={() => { setSevVisible({ ...sevVisible, [s]: !on }); markDirty(); }}
                          className={`px-2.5 py-1 rounded-sm border transition-colors ${on ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`}
                          style={{ ...mono, fontSize: 11 }}>
                          {on && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Field label="Default Sorting">
                  <select value={defaultSort} onChange={e => { setDefaultSort(e.target.value); markDirty(); }} className={inputCls} style={inputStyle}>
                    <option value="startTime-desc">Start Time (newest first)</option>
                    <option value="startTime-asc">Start Time (oldest first)</option>
                    <option value="severity-desc">Severity (highest first)</option>
                    <option value="duration-desc">Duration (longest first)</option>
                  </select>
                </Field>
                <Toggle checked={showAck} onChange={v => { setShowAck(v); markDirty(); }} label="Show Acknowledged Alerts" description="Include alerts already acknowledged by an operator." />
                <Toggle checked={showResolved} onChange={v => { setShowResolved(v); markDirty(); }} label="Show Resolved Alerts" description="Include alerts marked as resolved within the time range." />
              </Card>

              <Card title="Default Evaluation Matrix Options" description="Initial selections used by the Evaluation Matrix on the dashboard.">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Default Tool">
                    <select className={inputCls} style={inputStyle} defaultValue="all">
                      <option value="all">All Tools</option>
                      {TOOLS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Include Zero-Value Cells">
                    <select className={inputCls} style={inputStyle} defaultValue="yes">
                      <option value="yes">Yes</option>
                      <option value="no">No (hide empty)</option>
                    </select>
                  </Field>
                </div>
              </Card>

              <Card title="Display Preferences" description="Visual density and theme.">
                <Toggle checked={compact} onChange={v => { setCompact(v); markDirty(); }} label="Compact Mode" description="Reduces padding across panels for high-density displays." />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Table Density">
                    <Segmented value={density} onChange={v => { setDensity(v); markDirty(); }} options={[{ value:"comfortable", label:"Comfortable"},{ value:"compact", label:"Compact"}]} />
                  </Field>
                  <Field label="Theme Preference">
                    <Segmented value={theme} onChange={v => { setTheme(v); markDirty(); }} options={[{ value:"system", label:"System"},{ value:"dark", label:"Dark"},{ value:"light", label:"Light"}]} />
                  </Field>
                </div>
              </Card>

              <Card title="Notification Preferences" description="Where and when to surface dashboard alerts.">
                <Toggle checked={notif.desktop} onChange={v => { setNotif({ ...notif, desktop: v }); markDirty(); }} label="Desktop Notifications" description="Browser notifications for new alerts." />
                <Toggle checked={notif.sound} onChange={v => { setNotif({ ...notif, sound: v }); markDirty(); }} label="Sound Alerts" description="Play a sound when a Critical alert is raised." />
                <Toggle checked={notif.criticalOnly} onChange={v => { setNotif({ ...notif, criticalOnly: v }); markDirty(); }} label="Critical Only" description="Suppress notifications below Critical severity." />
              </Card>
            </div>
          )}

          {/* ── AI & MODELS ── */}
          {active === "ai" && (
            <div className="grid gap-5 max-w-5xl">
              <SectionTitle hint="Local LLM and intent classification.">AI & Models</SectionTitle>
              <Card title="Local LLM" description="Provider used for chat completions and reasoning." action={
                <button className="px-2.5 py-1 rounded-sm border border-border bg-secondary text-foreground hover:border-primary/40 hover:text-primary transition-colors" style={{ ...sans, fontSize: 11 }}>Validate Model</button>
              }>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Base URL"><input value={llmUrl} onChange={e => { setLlmUrl(e.target.value); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                  <Field label="Model">
                    <select value={llmModel} onChange={e => { setLlmModel(e.target.value); markDirty(); }} className={inputCls} style={inputStyle}>
                      {["qwen3:0.6b","qwen2.5","llama3","phi4","mistral"].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label={`Temperature: ${temperature.toFixed(2)}`}>
                    <input type="range" min={0} max={2} step={0.05} value={temperature} onChange={e => { setTemperature(parseFloat(e.target.value)); markDirty(); }} className="w-full accent-[var(--primary)]" />
                  </Field>
                  <Field label="Max Tokens"><input type="number" value={maxTokens} onChange={e => { setMaxTokens(parseInt(e.target.value || "0")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                </div>
              </Card>

              <Card title="Intent Detection" description="How user queries are routed to retrieval or chat.">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Classifier Mode">
                    <Segmented value={intentMode} onChange={v => { setIntentMode(v); markDirty(); }} options={[{ value:"keyword", label:"Keyword"},{ value:"llm", label:"LLM"},{ value:"hybrid", label:"Hybrid"}]} />
                  </Field>
                  <Field label={`Confidence Threshold: ${confidence.toFixed(2)}`}>
                    <input type="range" min={0} max={1} step={0.01} value={confidence} onChange={e => { setConfidence(parseFloat(e.target.value)); markDirty(); }} className="w-full accent-[var(--primary)]" />
                  </Field>
                  <Field label="LLM Timeout (s)"><input type="number" value={llmTimeout} onChange={e => { setLlmTimeout(parseInt(e.target.value || "0")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                </div>
                <div>
                  <p className="text-foreground mb-2" style={{ ...sans, fontSize: 11, fontWeight: 500 }}>Keywords</p>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {keywords.map(k => (
                      <Chip key={k} onRemove={() => { setKeywords(keywords.filter(x => x !== k)); markDirty(); }}>{k}</Chip>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addKeyword())} placeholder="Add keyword…" className={inputCls + " max-w-xs"} style={{ ...mono, fontSize: 12 }} />
                    <button onClick={addKeyword} className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm border border-border bg-secondary text-foreground hover:border-primary/40 hover:text-primary transition-colors" style={{ ...sans, fontSize: 11 }}>
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── RAG ── */}
          {active === "rag" && (
            <div className="grid gap-5 max-w-5xl">
              <SectionTitle hint="Document ingestion, vector stores, and retrieval endpoints.">Retrieval (RAG)</SectionTitle>
              <Card title="Service" description="HTTP endpoints exposed by the retrieval service.">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Base URL"><input value={rag.baseUrl} onChange={e => { setRag({...rag, baseUrl: e.target.value}); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                  <Field label="Data Endpoint"><input value={rag.dataEndpoint} onChange={e => { setRag({...rag, dataEndpoint: e.target.value}); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                  <Field label="Ask Endpoint"><input value={rag.askEndpoint} onChange={e => { setRag({...rag, askEndpoint: e.target.value}); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                  <Field label="Metadata File"><input value={rag.metadataFile} onChange={e => { setRag({...rag, metadataFile: e.target.value}); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                  <Field label="Timeout (s)"><input type="number" value={rag.timeout} onChange={e => { setRag({...rag, timeout: parseInt(e.target.value || "0")}); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                </div>
              </Card>
              <Card title="Storage" description="Where ingested documents and indices live on disk.">
                <div className="grid grid-cols-2 gap-4">
                  <PathRow label="Upload Folder" value={rag.uploadFolder} onChange={v => { setRag({...rag, uploadFolder: v}); markDirty(); }} />
                  <PathRow label="Vector Store Folder" value={rag.vectorStore} onChange={v => { setRag({...rag, vectorStore: v}); markDirty(); }} />
                  <PathRow label="BM25 Store" value={rag.bm25Store} onChange={v => { setRag({...rag, bm25Store: v}); markDirty(); }} />
                  <PathRow label="Instructions File" value={rag.instructionsFile} onChange={v => { setRag({...rag, instructionsFile: v}); markDirty(); }} />
                  <PathRow label="FAQ File" value={rag.faqFile} onChange={v => { setRag({...rag, faqFile: v}); markDirty(); }} />
                  <PathRow label="Metadata File" value={rag.metadataFile2} onChange={v => { setRag({...rag, metadataFile2: v}); markDirty(); }} />
                  <PathRow label="Settings File" value={rag.settingsFile} onChange={v => { setRag({...rag, settingsFile: v}); markDirty(); }} />
                </div>
              </Card>
            </div>
          )}

          {/* ── SEARCH & RANKING ── */}
          {active === "search" && (
            <div className="grid gap-5 max-w-5xl">
              <SectionTitle hint="Embeddings, hybrid weighting and result re-ranking.">Search & Ranking</SectionTitle>
              <Card title="Embeddings" description="Vector encoding parameters.">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Embedding Model"><input value={embedModel} onChange={e => { setEmbedModel(e.target.value); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                  <Field label="Top K"><input type="number" value={topK} onChange={e => { setTopK(parseInt(e.target.value || "0")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                  <Field label="Chunk Size"><input type="number" value={chunkSize} onChange={e => { setChunkSize(parseInt(e.target.value || "0")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                  <Field label="Chunk Overlap"><input type="number" value={chunkOverlap} onChange={e => { setChunkOverlap(parseInt(e.target.value || "0")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                </div>
              </Card>
              <Card title="Hybrid Search" description="Combine lexical and semantic relevance.">
                <div className="grid grid-cols-2 gap-4">
                  <Field label={`BM25 Weight: ${bm25Weight.toFixed(2)}`}>
                    <input type="range" min={0} max={1} step={0.05} value={bm25Weight} onChange={e => { setBm25Weight(parseFloat(e.target.value)); markDirty(); }} className="w-full accent-[var(--primary)]" />
                  </Field>
                  <Field label={`Semantic Weight: ${semWeight.toFixed(2)}`}>
                    <input type="range" min={0} max={1} step={0.05} value={semWeight} onChange={e => { setSemWeight(parseFloat(e.target.value)); markDirty(); }} className="w-full accent-[var(--primary)]" />
                  </Field>
                </div>
                <Banner>BM25 Weight + Semantic Weight should ideally equal 1. Current total: <strong>{(bm25Weight + semWeight).toFixed(2)}</strong></Banner>
              </Card>
              <Card title="Re-ranking" description="Second-pass relevance model.">
                <Toggle checked={rerankEnabled} onChange={v => { setRerankEnabled(v); markDirty(); }} label="Enable Re-ranking" description="Apply a cross-encoder to the top-K candidates." />
                {rerankEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Re-ranker Model"><input value={rerankModel} onChange={e => { setRerankModel(e.target.value); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                    <Field label="Top N"><input type="number" value={topN} onChange={e => { setTopN(parseInt(e.target.value || "0")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                  </div>
                )}
              </Card>
              <Card title="Semantic Cache" description="Cache near-duplicate query responses.">
                <Toggle checked={cacheEnabled} onChange={v => { setCacheEnabled(v); markDirty(); }} label="Enable Cache" />
                {cacheEnabled && (
                  <div className="grid grid-cols-3 gap-4">
                    <Field label={`Similarity Threshold: ${simThreshold.toFixed(2)}`}>
                      <input type="range" min={0.5} max={1} step={0.01} value={simThreshold} onChange={e => { setSimThreshold(parseFloat(e.target.value)); markDirty(); }} className="w-full accent-[var(--primary)]" />
                    </Field>
                    <Field label="Cache Size"><input type="number" value={cacheSize} onChange={e => { setCacheSize(parseInt(e.target.value || "0")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                    <Field label="TTL (s)"><input type="number" value={ttl} onChange={e => { setTtl(parseInt(e.target.value || "0")); markDirty(); }} className={inputCls} style={{ ...mono, fontSize: 12 }} /></Field>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── PERFORMANCE ── */}
          {active === "performance" && (
            <div className="grid gap-5 max-w-4xl">
              <SectionTitle hint="Hardware acceleration and resource thresholds.">Performance</SectionTitle>
              <Card title="GPU" description="Acceleration parameters for embedding and re-ranking workloads.">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="GPU Available">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={gpuAvailable ? "connected" : "disconnected"} />
                      <span className="text-muted-foreground" style={{ ...mono, fontSize: 11 }}>{gpuAvailable ? "NVIDIA A10G · 24 GiB" : "Not detected"}</span>
                    </div>
                  </Field>
                  <Field label={`GPU Memory Threshold (%)`}>
                    <input type="range" min={50} max={100} value={gpuThreshold} onChange={e => { setGpuThreshold(parseInt(e.target.value)); markDirty(); }} className="w-full accent-[var(--primary)]" />
                    <span className="text-muted-foreground" style={{ ...mono, fontSize: 11 }}>{gpuThreshold}%</span>
                  </Field>
                </div>
                <div>
                  <p className="text-foreground mb-1.5" style={{ ...sans, fontSize: 11, fontWeight: 500 }}>Current GPU Utilization</p>
                  <div className="h-2 w-full rounded-full bg-secondary border border-border overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${gpuUtil}%` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-muted-foreground" style={{ ...mono, fontSize: 10 }}>
                    <span>{gpuUtil}% used</span>
                    <span>Threshold {gpuThreshold}%</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── ADVANCED ── */}
          {active === "advanced" && (
            <div className="grid gap-5 max-w-4xl">
              <SectionTitle hint="Prompt templates and advanced overrides. Changes here affect agent behaviour.">Advanced</SectionTitle>
              <Card title="Prompt Templates" description="File paths used by the agent at runtime." action={<FileText className="w-4 h-4 text-muted-foreground" />}>
                <PathRow label="Main Prompt Path" value={mainPrompt} onChange={v => { setMainPrompt(v); markDirty(); }} />
                <PathRow label="Visualization Prompt Path" value={vizPrompt} onChange={v => { setVizPrompt(v); markDirty(); }} />
              </Card>
              <Card title="Reset" description="Restore all settings to their factory defaults.">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[#e5534b]/40 bg-[#e5534b]/10 text-[#e5534b] hover:bg-[#e5534b]/20 transition-colors" style={{ ...sans, fontSize: 12 }}>
                    <RotateCcw className="w-3.5 h-3.5" /> Restore Defaults
                  </button>
                  <p className="text-muted-foreground" style={{ ...sans, fontSize: 11 }}>This cannot be undone.</p>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* ── Sticky footer ── */}
        <div className="border-t border-border bg-card/95 backdrop-blur px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dirty ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-[#e5a030]/30 bg-[#e5a030]/10 text-[#e5a030]" style={{ ...mono, fontSize: 10 }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#e5a030] animate-pulse" /> Unsaved changes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground" style={{ ...mono, fontSize: 11 }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> All changes saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDirty(false)} className="px-3 py-1.5 rounded-sm border border-border bg-secondary text-foreground hover:border-primary/40 hover:text-primary transition-colors" style={{ ...sans, fontSize: 12 }}>
              <span className="inline-flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults</span>
            </button>
            <button onClick={() => setDirty(false)} className="px-3 py-1.5 rounded-sm border border-border bg-secondary text-foreground hover:border-border/80 transition-colors" style={{ ...sans, fontSize: 12 }}>
              Cancel
            </button>
            <button onClick={() => setDirty(false)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity" style={{ ...sans, fontSize: 12, fontWeight: 600 }}>
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}