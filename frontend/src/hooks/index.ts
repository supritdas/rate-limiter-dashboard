import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { ApiKey, OverviewStats, TimeSeriesPoint, RequestLog, AbuseFlag } from "../types";

// ─── Generic fetch hook ───────────────────────────────────────────────────────
export function useFetch<T>(url: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(url);
      setData(res.data.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { fetch(); }, deps);

  return { data, loading, error, refetch: fetch };
}

// ─── API Keys ─────────────────────────────────────────────────────────────────
export function useApiKeys() {
  return useFetch<ApiKey[]>("/keys");
}

export function useApiKeyStats(id: string) {
  return useFetch<{ total: number; blocked: number; allowed: number; last24h: number }>(
    `/keys/${id}/stats`,
    [id]
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export function useOverview() {
  return useFetch<OverviewStats>("/analytics/overview");
}

export function useTimeSeries(hours = 24, apiKeyId?: string) {
  const params = new URLSearchParams({ hours: String(hours) });
  if (apiKeyId) params.set("apiKeyId", apiKeyId);
  return useFetch<TimeSeriesPoint[]>(`/analytics/timeseries?${params}`, [hours, apiKeyId]);
}

export function useTopKeys() {
  return useFetch<Array<{ id: string; name: string; keyPrefix: string; requests: number }>>(
    "/analytics/top-keys"
  );
}

export function useTopIPs() {
  return useFetch<Array<{ ipAddress: string; _count: { id: number } }>>(
    "/analytics/top-ips"
  );
}

export function useLatency(apiKeyId?: string) {
  const params = apiKeyId ? `?apiKeyId=${apiKeyId}` : "";
  return useFetch<{ avg: number; p50: number; p95: number; p99: number }>(
    `/analytics/latency${params}`,
    [apiKeyId]
  );
}

// ─── Request Logs ─────────────────────────────────────────────────────────────
export function useRequestLogs(filters: {
  apiKeyId?: string;
  blocked?: boolean;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters.apiKeyId) params.set("apiKeyId", filters.apiKeyId);
  if (filters.blocked !== undefined) params.set("blocked", String(filters.blocked));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  return useFetch<{ logs: RequestLog[]; total: number; page: number; pages: number }>(
    `/requests?${params}`,
    [filters.apiKeyId, filters.blocked, filters.page]
  );
}

// ─── Abuse Flags ──────────────────────────────────────────────────────────────
export function useAbuseFlags() {
  return useFetch<AbuseFlag[]>("/admin/abuse-flags");
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export function useAdminStats() {
  return useFetch<{
    users: number;
    apiKeys: number;
    requests: number;
    blockedRequests: number;
    abuseFlags: number;
  }>("/admin/stats");
}

export function useAdminUsers(page = 1) {
  return useFetch<{
    users: Array<{
      id: string;
      email: string;
      name: string;
      role: string;
      createdAt: string;
      _count: { apiKeys: number };
    }>;
    total: number;
    page: number;
    pages: number;
  }>(`/admin/users?page=${page}`, [page]);
}
