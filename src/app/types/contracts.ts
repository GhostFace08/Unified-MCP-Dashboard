export type Tool = "all" | "dynatrace" | "opmanager" | "appdynamics" | "heal";

export interface ChatRequestPayload {
  sessionId: string;
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface ChatResponsePayload {
  reply: string;
  meta?: Record<string, unknown>;
}

export interface AIMonitoringStats {
  updatedAt: string;
  usage: {
    totalTokens: number;
    questionsToday: number;
    requestsProcessed: number;
    totalConversations: number;
    promptTokens: number;
    completionTokens: number;
    avgResponseMs: number;
    p95Ms: number;
    cacheHitRatePct: number;
  };
  resources: {
    cachePct: number;
    memoryPct: number;
    gpuPct: number;
    cpuPct: number;
  };
  model: {
    name: string;
    endpoint: string;
    device: string;
    status: "Healthy" | "Degraded" | "Offline";
  };
  bottom: {
    vectorStoreDocs: number;
    storageUsedGb: number;
    storageTotalGb: number;
    throughputTokPerSec: number;
    errorRatePct: number;
  };
}

export type SettingsBlob = Record<string, unknown>;
