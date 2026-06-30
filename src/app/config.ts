export type Tool = "all" | "dynatrace" | "opmanager" | "appdynamics" | "heal";
export type View = "dashboard" | "chat" | "settings" | "ai-monitoring";

export interface ToolConfig {
  id: Tool;
  name: string;
  shortName: string;
  color: string;
  status: "online" | "degraded" | "offline";
  latency: string;
  description: string;
  url: string;
}

export const TOOLS: ToolConfig[] = [
  { id: "dynatrace",   name: "DynaTrace",   shortName: "DT",  color: "#6366f1", status: "online",   latency: "14ms",  description: "APM & Infrastructure",    url: "https://www.dynatrace.com" },
  { id: "opmanager",   name: "OPManager",   shortName: "OPM", color: "#f59e0b", status: "online",   latency: "31ms",  description: "Network & Server",         url: "https://www.manageengine.com/network-monitoring" },
  { id: "appdynamics", name: "AppDynamics", shortName: "APD", color: "#10b981", status: "degraded", latency: "412ms", description: "Application Performance",  url: "https://www.appdynamics.com" },
  { id: "heal",        name: "HEAL",        shortName: "HL",  color: "#00e5c3", status: "online",   latency: "9ms",   description: "AI Remediation",           url: "https://heal.com" },
];

export const TOOL_MAP = Object.fromEntries(TOOLS.map(t => [t.id, t])) as Record<Tool, ToolConfig>;

export const CATEGORIES = [
  "Availability",
  "Performance",
  "Infrastructure",
  "Application Error",
  "Security",
] as const;

export type Category = typeof CATEGORIES[number];
