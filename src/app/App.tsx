import { useState } from "react";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { ChatView } from "./components/ChatView";
import { SettingsView } from "./components/SettingsView";
import type { View } from "./config";

export default function App() {
  const [view, setView] = useState<View>("dashboard");

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Header activeView={view} onViewChange={setView} />
      <main className="flex-1 min-h-0 overflow-hidden">
        {view === "dashboard" && <DashboardView />}
        {view === "chat"      && <ChatView />}
        {view === "settings"  && <SettingsView />}
      </main>
    </div>
  );
}
