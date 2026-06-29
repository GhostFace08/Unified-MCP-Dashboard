import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { TOOLS } from "../config";

interface FilterDialogProps { open: boolean; onClose: () => void; apiEnabled?: boolean; }

type TabId = "categories" | "calls" | "api";

interface CategoryRule { id: string; keyword: string; category: string; }

const DEFAULT_CATEGORIES = ["Availability", "Performance", "Infrastructure", "Application Error", "Security"];

const DEFAULT_RULES: CategoryRule[] = [
  { id: "1", keyword: "down",      category: "Availability" },
  { id: "2", keyword: "timeout",   category: "Availability" },
  { id: "3", keyword: "latency",   category: "Performance" },
  { id: "4", keyword: "cpu",       category: "Infrastructure" },
  { id: "5", keyword: "memory",    category: "Infrastructure" },
  { id: "6", keyword: "error",     category: "Application Error" },
  { id: "7", keyword: "exception", category: "Application Error" },
  { id: "8", keyword: "ssl",       category: "Security" },
  { id: "9", keyword: "auth",      category: "Security" },
];

export function FilterDialog({ open, onClose, apiEnabled = true }: FilterDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>("categories");

  // Tab 1: Categories
  const [rules, setRules] = useState<CategoryRule[]>(DEFAULT_RULES);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [newKeyword, setNewKeyword] = useState("");
  const [newKeywordCat, setNewKeywordCat] = useState(DEFAULT_CATEGORIES[0]);
  const [newCatName, setNewCatName] = useState("");

  // Tab 2: Calls
  const [fileCheckTime, setFileCheckTime] = useState("5");
  const [dataCollectionTime, setDataCollectionTime] = useState("10");

  // Tab 3: API
  const [apiTool, setApiTool] = useState(TOOLS[0].id);
  const [apiKey, setApiKey] = useState("");
  const [savedApis, setSavedApis] = useState<Record<string, string>>({});

  if (!open) return null;

  function addRule() {
    if (!newKeyword.trim()) return;
    setRules(prev => [...prev, { id: Date.now().toString(), keyword: newKeyword.trim().toLowerCase(), category: newKeywordCat }]);
    setNewKeyword("");
  }

  function removeRule(id: string) {
    setRules(prev => prev.filter(r => r.id !== id));
  }

  function addCategory() {
    if (!newCatName.trim() || categories.includes(newCatName.trim())) return;
    setCategories(prev => [...prev, newCatName.trim()]);
    setNewCatName("");
  }

  function saveApi() {
    setSavedApis(prev => ({ ...prev, [apiTool]: apiKey }));
    setApiKey("");
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: "categories", label: "Customize Categories" },
    { id: "calls",      label: "Customize Calls" },
    { id: "api",        label: "Set Up API" },
  ];

  const inputCls = "bg-secondary border border-border rounded-sm px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors w-full";
  const inputStyle = { fontFamily: "'Inter', sans-serif", fontSize: 12 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-sm shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 className="text-foreground" style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600 }}>Filters &amp; Configuration</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 border-b-2 transition-colors -mb-px ${activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>

          {/* ── Tab 1: Customize Categories ── */}
          {activeTab === "categories" && (
            <div className="flex flex-col gap-5">
              {/* Existing rules grouped by category */}
              {categories.map(cat => {
                const catRules = rules.filter(r => r.category === cat);
                return (
                  <div key={cat}>
                    <p className="text-foreground mb-2" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500 }}>{cat}</p>
                    <div className="flex flex-wrap gap-1.5 min-h-6">
                      {catRules.length === 0
                        ? <span className="text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>No keywords</span>
                        : catRules.map(r => (
                          <span key={r.id} className="flex items-center gap-1 px-2 py-0.5 bg-secondary border border-border rounded-sm">
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--foreground)" }}>{r.keyword}</span>
                            <button onClick={() => removeRule(r.id)} className="text-muted-foreground hover:text-[#e5534b] transition-colors"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })}

              {/* Add keyword */}
              <div className="border-t border-border pt-4">
                <p className="text-muted-foreground mb-2" style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Add Keyword Rule</p>
                <div className="flex gap-2">
                  <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && addRule()}
                    placeholder="keyword..." className={inputCls} style={inputStyle} />
                  <select value={newKeywordCat} onChange={e => setNewKeywordCat(e.target.value)}
                    className="bg-secondary border border-border rounded-sm px-2 py-1.5 text-foreground outline-none focus:border-primary/50 shrink-0" style={inputStyle}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={addRule} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity shrink-0" style={inputStyle}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Add category */}
              <div>
                <p className="text-muted-foreground mb-2" style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Add New Category</p>
                <div className="flex gap-2">
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()}
                    placeholder="Category name..." className={inputCls} style={inputStyle} />
                  <button onClick={addCategory} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity shrink-0" style={inputStyle}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 2: Customize Calls ── */}
          {activeTab === "calls" && (
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-foreground mb-1.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500 }}>File Check Time</label>
                <p className="text-muted-foreground mb-2" style={{ fontFamily: "'Inter', sans-serif", fontSize: 11 }}>How often (in minutes) the system checks for new data files from the tool.</p>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="60" value={fileCheckTime} onChange={e => setFileCheckTime(e.target.value)}
                    className={inputCls} style={{ ...inputStyle, maxWidth: 100 }} />
                  <span className="text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>minutes</span>
                </div>
              </div>
              <div>
                <label className="block text-foreground mb-1.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500 }}>Data Collection Time</label>
                <p className="text-muted-foreground mb-2" style={{ fontFamily: "'Inter', sans-serif", fontSize: 11 }}>How often (in minutes) the MCP server collects data from observability tools.</p>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="120" value={dataCollectionTime} onChange={e => setDataCollectionTime(e.target.value)}
                    className={inputCls} style={{ ...inputStyle, maxWidth: 100 }} />
                  <span className="text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>minutes</span>
                </div>
              </div>
              <div className="p-3 bg-secondary/50 rounded-sm border border-border">
                <p className="text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  Current: File check every {fileCheckTime}m · Collection every {dataCollectionTime}m
                </p>
              </div>
            </div>
          )}

          {/* ── Tab 3: Set Up API ── */}
          {activeTab === "api" && (
            <div className="flex flex-col gap-4">
              {!apiEnabled && (
                <div className="px-3 py-2 rounded-sm border border-[#e5a030]/40 bg-[#e5a030]/10 text-[#e5a030]" style={{ fontFamily: "'Inter', sans-serif", fontSize: 11 }}>
                  Switch the dashboard refresh mode to <strong>Live</strong> to configure webhook APIs. This tab is read-only in Periodic mode.
                </div>
              )}
              <fieldset disabled={!apiEnabled} className={`flex flex-col gap-4 border-0 p-0 m-0 min-w-0 ${!apiEnabled ? "opacity-50 pointer-events-none select-none" : ""}`}>
              <div>
                <label className="block text-foreground mb-1.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500 }}>Select Tool</label>
                <select value={apiTool} onChange={e => { setApiTool(e.target.value as typeof apiTool); setApiKey(savedApis[e.target.value] ?? ""); }}
                  className="bg-secondary border border-border rounded-sm px-2.5 py-1.5 text-foreground outline-none focus:border-primary/50 w-full" style={inputStyle}>
                  {TOOLS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-foreground mb-1.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500 }}>
                  API Key / URL for {TOOLS.find(t => t.id === apiTool)?.name}
                </label>
                <textarea value={apiKey} onChange={e => setApiKey(e.target.value)} rows={3}
                  placeholder="Paste your API key or base URL here..."
                  className={`${inputCls} resize-none`} style={inputStyle} />
              </div>
              <button onClick={saveApi} className="px-4 py-2 bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity self-start" style={inputStyle}>
                Save API Config
              </button>
              {/* Saved configs */}
              {Object.keys(savedApis).length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-muted-foreground mb-2" style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Saved Configs</p>
                  {Object.entries(savedApis).map(([tid, key]) => {
                    const tool = TOOLS.find(t => t.id === tid);
                    return (
                      <div key={tid} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "var(--foreground)" }}>{tool?.name}</span>
                        <div className="flex items-center gap-2">
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--muted-foreground)" }}>
                            {key.length > 20 ? key.slice(0, 10) + "••••" + key.slice(-4) : "••••" + key.slice(-4)}
                          </span>
                          <button onClick={() => setSavedApis(p => { const n={...p}; delete n[tid]; return n; })} className="text-muted-foreground hover:text-[#e5534b]"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </fieldset>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 rounded-sm border border-border text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
            Close
          </button>
          <button onClick={onClose} className="px-4 py-1.5 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
