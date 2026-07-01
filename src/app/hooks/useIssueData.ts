import { useCallback, useEffect, useRef, useState } from "react";
const DATA_URL = "/data/issues.json";
const POLL_INTERVAL_MS = 60_000;

interface IssuesFileResponse {
  data: unknown;
  lastModified: Date | null;
  fetchedAt: Date;
}

async function fetchIssuesFile(): Promise<IssuesFileResponse> {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Dashboard data request failed with HTTP ${response.status}`);
  }

  const lastModifiedHeader = response.headers.get("Last-Modified");
  const data = await response.json();

  return {
    data,
    lastModified: lastModifiedHeader ? new Date(lastModifiedHeader) : null,
    fetchedAt: new Date(),
  };
}

async function checkIssuesFile(): Promise<{ lastModified: Date | null; checkedAt: Date }> {
  const response = await fetch(DATA_URL, { method: "HEAD", cache: "no-store" });
  const lastModifiedHeader = response.headers.get("Last-Modified");

  return {
    lastModified: lastModifiedHeader ? new Date(lastModifiedHeader) : null,
    checkedAt: new Date(),
  };
}

export interface IssueDataSnapshot {
  data: unknown;
  fileModified: Date | null;
  fileLoaded: Date | null;
  fileUpdated: Date | null;
  fileChecked: Date | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useIssueData(): IssueDataSnapshot {
  const [data, setData] = useState<unknown>(null);
  const [fileModified, setFileModified] = useState<Date | null>(null);
  const [fileLoaded, setFileLoaded] = useState<Date | null>(null);
  const [fileUpdated, setFileUpdated] = useState<Date | null>(null);
  const [fileChecked, setFileChecked] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const modifiedRef = useRef<Date | null>(null);

  const reload = useCallback(async () => {
    try {
      const snapshot = await fetchIssuesFile();
      setData(snapshot.data);
      setFileModified(snapshot.lastModified);
      setFileLoaded(snapshot.fetchedAt);
      setFileUpdated(snapshot.fetchedAt);
      modifiedRef.current = snapshot.lastModified;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const snapshot = await checkIssuesFile();
        setFileChecked(snapshot.checkedAt);
        if (snapshot.lastModified && (!modifiedRef.current || snapshot.lastModified.getTime() > modifiedRef.current.getTime())) {
          modifiedRef.current = snapshot.lastModified;
          await reload();
        }
      } catch {
        // leave the last known data visible
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [reload]);

  return { data, fileModified, fileLoaded, fileUpdated, fileChecked, loading, error, reload };
}
