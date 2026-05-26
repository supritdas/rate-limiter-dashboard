import { useAuthStore } from "../store/auth.store";
import { useOverview, useTimeSeries, useTopKeys, useLatency } from "../hooks";
import { StatCard, PageHeader, Card, Spinner, Badge } from "../components/ui";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import { format } from "date-fns";
import styles from "./Dashboard.module.css";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: overview, loading: ovLoading } = useOverview();
  const { data: series, loading: seriesLoading } = useTimeSeries(24);
  const { data: topKeys } = useTopKeys();
  const { data: latency } = useLatency();

  const chartData = series?.map((p) => ({
    ...p,
    label: format(new Date(p.hour + ":00:00Z"), "HH:mm"),
  })) ?? [];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "dev"}`}
        subtitle="Here's your API traffic overview"
      />

      {/* Stats */}
      {ovLoading ? <Spinner /> : (
        <div className={styles.statsGrid}>
          <StatCard label="Total Requests" value={overview?.totalRequests.toLocaleString() ?? "—"} accent="purple" />
          <StatCard label="Allowed" value={overview?.allowedRequests.toLocaleString() ?? "—"} sub="last all time" accent="green" />
          <StatCard label="Blocked" value={overview?.blockedRequests.toLocaleString() ?? "—"} sub={`${overview?.blockRate ?? 0}% block rate`} accent="red" />
          <StatCard label="Active Keys" value={`${overview?.activeKeys ?? 0} / ${overview?.totalKeys ?? 0}`} sub="keys active" accent="yellow" />
        </div>
      )}

      <div className={styles.row}>
        {/* Traffic Chart */}
        <Card className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Traffic — last 24h</span>
          </div>
          {seriesLoading ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="allowed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="blocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2a2a35" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "#5a5a72", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#5a5a72", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#18181f", border: "1px solid #2a2a35", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#9898b0" }}
                />
                <Area type="monotone" dataKey="allowed" stroke="#34d399" strokeWidth={2} fill="url(#allowed)" />
                <Area type="monotone" dataKey="blocked" stroke="#f87171" strokeWidth={2} fill="url(#blocked)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Latency + Top Keys */}
        <div className={styles.sidebar}>
          <Card>
            <div className={styles.cardHeader}><span className={styles.cardTitle}>Latency (1h)</span></div>
            <div className={styles.latencyGrid}>
              {[
                { label: "avg", value: latency?.avg },
                { label: "p50", value: latency?.p50 },
                { label: "p95", value: latency?.p95 },
                { label: "p99", value: latency?.p99 },
              ].map(({ label, value }) => (
                <div key={label} className={styles.latencyItem}>
                  <span className={styles.latencyLabel}>{label}</span>
                  <span className={styles.latencyValue}>{value ?? "—"}<span className={styles.latencyUnit}>ms</span></span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className={styles.cardHeader}><span className={styles.cardTitle}>Top Keys (24h)</span></div>
            <div className={styles.topKeysList}>
              {topKeys?.length ? topKeys.map((k) => (
                <div key={k.id} className={styles.topKeyItem}>
                  <div>
                    <div className={styles.keyName}>{k.name}</div>
                    <code className={styles.keyPrefix}>{k.keyPrefix}…</code>
                  </div>
                  <Badge variant="purple">{k.requests.toLocaleString()}</Badge>
                </div>
              )) : <span className={styles.empty}>No traffic yet</span>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
