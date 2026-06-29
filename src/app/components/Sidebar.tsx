import { LayoutDashboard, MessageSquare, Settings, Activity, Radio, ChevronRight } from "lucide-react";

type View = "dashboard" | "chat" | "settings";

interface SidebarProps {
  active: View;
  onNavigate: (v: View) => void;
}

const nav = [
  { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
  { id: "chat" as View, label: "AI Assistant", icon: MessageSquare },
  { id: "settings" as View, label: "Settings", icon: Settings },
];

const servers = [
  { name: "aws-prod-01", status: "online" },
  { name: "gcp-staging", status: "online" },
  { name: "azure-dev", status: "degraded" },
  { name: "on-prem-db", status: "offline" },
];

export function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="flex flex-col w-56 shrink-0 h-full border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
        <div className="w-6 h-6 rounded-sm bg-primary flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <span className="text-foreground tracking-tight" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13 }}>
          MCP<span className="text-primary">Observe</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 pt-3 flex-1">
        <p className="px-2 pb-1.5 text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Navigation
        </p>
        {nav.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-sm w-full text-left transition-colors group ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </button>
          );
        })}

        {/* MCP Servers */}
        <div className="mt-5">
          <p className="px-2 pb-1.5 text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            MCP Servers
          </p>
          <div className="flex flex-col gap-0.5">
            {servers.map((s) => (
              <div key={s.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm hover:bg-secondary cursor-pointer group">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    s.status === "online" ? "bg-primary" : s.status === "degraded" ? "bg-[#e5a030]" : "bg-[#e5534b]"
                  }`}
                />
                <span className="text-muted-foreground group-hover:text-foreground truncate" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                  {s.name}
                </span>
                <Radio className={`w-3 h-3 ml-auto shrink-0 ${s.status === "online" ? "text-primary/60" : "text-muted-foreground/40"}`} />
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom status */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
            3/4 servers live
          </span>
        </div>
        <div className="text-muted-foreground mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
          Last sync: 12s ago
        </div>
      </div>
    </aside>
  );
}
