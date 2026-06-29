import { Check } from "lucide-react";
import type { View } from "../config";

interface HeaderProps {
  activeView: View;
  onViewChange: (v: View) => void;
}

export function Header({ activeView, onViewChange }: HeaderProps) {
  const tabs: { id: View; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "chat",      label: "AI Chat" },
    { id: "settings",  label: "Settings" },
  ];

  return (
    <header className="shrink-0 flex items-center border-b border-border bg-sidebar px-4 h-12 gap-2">
      {tabs.map(({ id, label }) => {
        const active = activeView === id;
        return (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-sm border transition-colors ${
              active
                ? "border-border bg-card text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
            }`}
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: active ? 500 : 400 }}
          >
            {active && <Check className="w-3.5 h-3.5 text-primary" />}
            {label.toUpperCase()}
          </button>
        );
      })}
      <div className="flex-1" />
      <button className="px-3 py-1.5 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
        Sign In
      </button>
      <button className="px-3 py-1.5 rounded-sm border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors" style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
        Register
      </button>
    </header>
  );
}
