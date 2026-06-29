import { Settings } from "lucide-react";

export function SettingsView() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
      <div className="w-14 h-14 rounded-sm bg-secondary border border-border flex items-center justify-center">
        <Settings className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-foreground" style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 600 }}>
          Settings not finalised
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-xs" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          This section is under development. Configuration options will be available in a future release.
        </p>
      </div>
      <span className="px-3 py-1.5 rounded-sm border border-border bg-secondary text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
        Coming soon
      </span>
    </div>
  );
}
