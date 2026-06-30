import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Paperclip, Sparkles, FileText, Image, Mic, Plus, X } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  files?: { name: string; size: string; type: string }[];
  thinking?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  messages: Message[];
}

const SEED_SESSIONS: ChatSession[] = [
  {
    id: "g-1", createdAt: Date.now() - 1000 * 60 * 60 * 2,
    title: "Incident analysis — DB pool",
    preview: "Root cause confirmed: DB connection pool exhaustion…",
    messages: [
      { id: "1", role: "assistant", timestamp: "14:30", content: "Hello! I'm your MCP Observability AI. I have full context across all connected sources.\n\nWhat would you like to explore?" },
      { id: "2", role: "user",      timestamp: "14:31", content: "Summarise the active critical alerts right now." },
      { id: "3", role: "assistant", timestamp: "14:31", content: "**Active Critical Alerts**\n\nI see **4 critical** issues. Top priority is the JDBC pool exhaustion on easyTravel — it appears to be the root cause cascading into the checkout BT health alerts." },
    ],
  },
  {
    id: "g-2", createdAt: Date.now() - 1000 * 60 * 60 * 24,
    title: "Weekly error summary",
    preview: "Last 7 days: 1,426 total events…",
    messages: [
      { id: "1", role: "assistant", timestamp: "09:00", content: "Loaded weekly summary. 1,426 events across all sources this week, down 12% vs prior week." },
    ],
  },
];

function formatContent(text: string) {
  return text.split("\n").map((line, i) => {
    if (!line) return <div key={i} className="h-2" />;
    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="text-foreground mb-1 font-semibold" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>{line.replace(/\*\*/g, "")}</p>;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-foreground mb-0.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: 1.65 }}>
        {parts.map((p, j) => p.startsWith("**") ? <strong key={j}>{p.replace(/\*\*/g, "")}</strong> : p)}
      </p>
    );
  });
}

export function ChatView() {
  const [sessions, setSessions] = useState<ChatSession[]>(SEED_SESSIONS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<{ name: string; size: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const active = useMemo(() => sessions.find(s => s.id === activeId) || null, [sessions, activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages.length, activeId]);

  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  const sans = { fontFamily: "'Inter', sans-serif" };

  function startNewChat() {
    const id = `chat-${Date.now()}`;
    const greeting = "Hello! I'm your MCP Observability AI. What would you like to explore?";
    const newSession: ChatSession = {
      id,
      createdAt: Date.now(),
      title: "New chat",
      preview: greeting.slice(0, 60),
      messages: [{
        id: "init", role: "assistant",
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        content: greeting,
      }],
    };
    setSessions(p => [newSession, ...p]);
    setActiveId(id);
  }

  // Auto-open a fresh blank conversation when AI Chat is opened.
  useEffect(() => {
    startNewChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files; if (!f) return;
    setFiles(prev => [...prev, ...Array.from(f).map(file => ({ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, type: file.type.includes("image") ? "image" : "file" }))]);
    e.target.value = "";
  }

  function sendMessage() {
    if (!active) return;
    if (!input.trim() && !files.length) return;
    const ts = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim(), timestamp: ts, files: files.length ? [...files] : undefined };
    const thinkMsg: Message = { id: Date.now() + "-t", role: "assistant", content: "", timestamp: "", thinking: true };
    const userText = input.trim();
    setSessions(p => p.map(s => s.id === active.id ? {
      ...s,
      title: s.title === "New chat" && userText ? userText.slice(0, 40) : s.title,
      preview: userText || s.preview,
      messages: [...s.messages, userMsg, thinkMsg],
    } : s));
    setInput(""); setFiles([]); setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setTimeout(() => {
      const reply: Message = {
        id: Date.now() + "-r", role: "assistant",
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        content: `Analysing data from **all connected tools**…\n\nBased on current telemetry, I see elevated error rates correlating with recent deployments. Would you like a detailed breakdown or a remediation plan?`,
      };
      setSessions(p => p.map(s => s.id === active.id ? { ...s, messages: [...s.messages.filter(m => !m.thinking), reply] } : s));
      setLoading(false);
    }, 1400);
  }

  const sortedSessions = useMemo(() => [...sessions].sort((a, b) => b.createdAt - a.createdAt), [sessions]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left sidebar: unified chronological history ── */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-border bg-sidebar overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="px-3 pt-3 pb-2 border-b border-border">
          <p className="text-muted-foreground mb-2" style={{ ...mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>Chat History</p>
          <button
            onClick={startNewChat}
            className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-sm border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            style={{ ...sans, fontSize: 12, fontWeight: 500 }}
          >
            <Plus className="w-3.5 h-3.5" /> New Chat
          </button>
        </div>

        <div className="px-2 py-2 flex flex-col gap-0.5">
          {sortedSessions.map(s => {
            const isActive = activeId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`flex flex-col w-full text-left px-2 py-2 rounded-sm transition-colors ${isActive ? "bg-secondary" : "hover:bg-secondary/60"}`}
              >
                <span className="text-foreground truncate" style={{ ...sans, fontSize: 12, fontWeight: isActive ? 500 : 400 }}>{s.title}</span>
                <span className="text-muted-foreground truncate mt-0.5" style={{ ...mono, fontSize: 10 }}>{s.preview}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Main chat ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {active && (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-primary/10 border border-primary/20">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-foreground" style={{ ...sans, fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{active.title}</p>
                  <p style={{ ...mono, fontSize: 10, color: "var(--primary)" }}>● MCP Observability AI</p>
                </div>
              </div>
              <button
                onClick={startNewChat}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
                style={{ ...sans, fontSize: 11 }}
              >
                <Plus className="w-3 h-3" /> New chat
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
              {active.messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-7 h-7 rounded-sm shrink-0 flex items-center justify-center mt-0.5 ${msg.role === "assistant" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {msg.role === "assistant" ? <Sparkles className="w-3.5 h-3.5" /> : <span style={{ ...mono, fontSize: 10 }}>U</span>}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[76%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    {msg.thinking ? (
                      <div className="bg-card border border-border rounded-sm px-3 py-2.5 flex items-center gap-2">
                        {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                        <span className="text-muted-foreground" style={{ ...mono, fontSize: 11 }}>Analysing…</span>
                      </div>
                    ) : (
                      <>
                        {msg.files?.length ? (
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {msg.files.map((f, i) => (
                              <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-sm border border-border">
                                {f.type === "image" ? <Image className="w-3 h-3 text-primary" /> : <FileText className="w-3 h-3 text-primary" />}
                                <span className="text-foreground" style={{ ...mono, fontSize: 10 }}>{f.name}</span>
                                <span className="text-muted-foreground" style={{ ...mono, fontSize: 9 }}>{f.size}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className={`px-3 py-2.5 rounded-sm border ${msg.role === "assistant" ? "bg-card border-border" : "bg-primary/10 border-primary/25"}`}>
                          {msg.role === "assistant"
                            ? <div>{formatContent(msg.content)}</div>
                            : <p style={{ ...sans, fontSize: 13, lineHeight: 1.65, color: "var(--foreground)" }}>{msg.content}</p>}
                        </div>
                        {msg.timestamp && <span className="text-muted-foreground" style={{ ...mono, fontSize: 9 }}>{msg.timestamp}</span>}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 shrink-0">
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileAdd} accept=".txt,.log,.json,.csv,.png,.jpg,.pdf" />
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2 px-3 py-2 bg-card border border-border rounded-sm">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-sm">
                      {f.type === "image" ? <Image className="w-3 h-3 text-primary" /> : <FileText className="w-3 h-3 text-primary" />}
                      <span style={{ ...mono, fontSize: 10, color: "var(--foreground)" }}>{f.name}</span>
                      <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))}><X className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2 bg-card border border-border rounded-sm px-3 py-2 focus-within:border-primary/40 transition-colors">
                <div className="flex items-center gap-1 pb-0.5">
                  <button onClick={() => fileRef.current?.click()} className="w-7 h-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Paperclip className="w-3.5 h-3.5" /></button>
                  <button className="w-7 h-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Mic className="w-3.5 h-3.5" /></button>
                </div>
                <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }}
                  placeholder="Ask the MCP Observability AI… (Shift+Enter for newline)"
                  rows={1} className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none resize-none py-1"
                  style={{ ...sans, fontSize: 13, lineHeight: 1.5, minHeight: 36, maxHeight: 120 }} />
                <button onClick={sendMessage} disabled={loading || (!input.trim() && !files.length)}
                  className="w-8 h-8 rounded-sm flex items-center justify-center bg-primary text-primary-foreground transition-opacity disabled:opacity-30 hover:opacity-90 shrink-0 mb-0.5">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}