import { useState } from "react";
import { useTimeSeries, useTopIPs, useTopKeys, useLatency, useApiKeys } from "../hooks";
import { PageHeader, Card, StatCard, Spinner } from "../components/ui";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format } from "date-fns";
import styles from "./Analytics.module.css";

const HOURS_OPTIONS = [6, 24, 48, 168];

export function AnalyticsPage() {
  const [hours, setHours] = useState(24);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();

  const { data: keys } = useApiKeys();
  const { data: series, loading: seriesLoading } = useTimeSeries(hours, selectedKey);
  const { data: topIPs } = useTopIPs();
  const { data: latency } = useLatency(selectedKey);
  const { data: topKeys } = useTopKeys();

  const chartData = series?.map((p) => ({
    ...p,
    label: format(new Date(p.hour + ":00:00Z"), hours <= 24 ? "HH:mm" : "MM/dd HH:mm"),
  })) ?? [];

  const totalAllowed = series?.reduce((s, p) => s + p.allowed, 0) ?? 0;
  const totalBlocked = series?.reduce((s, p) => s + p.blocked, 0) ?? 0;
  const total = totalAllowed + totalBlocked;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Deep dive into your API traffic" />

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Time range</label>
          <div className={styles.pills}>
            {HOURS_OPTIONS.map((h) => (
              <button
                key={h}
                className={`${styles.pill} ${hours === h ? styles.pillActive : ""}`}
                onClick={() => setHours(h)}
              >
                {h < 24 ? `${h}h` : h === 24 ? "24h" : h === 48 ? "2d" : "7d"}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.filterGroup}>
          <label>API Key</label>
          <select
            value={selectedKey ?? ""}
            onChange={(e) => setSelectedKey(e.target.value || undefined)}
            className={styles.select}
          >
            <option value="">All keys</option>
            {keys?.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mini Stats */}
      <div className={styles.miniStats}>
        <StatCard label="Total Requests" value={total.toLocaleString()} accent="purple" />
        <StatCard label="Allowed" value={totalAllowed.toLocaleString()} accent="green" />
        <StatCard label="Blocked" value={totalBlocked.toLocaleString()} accent="red" />
        <StatCard
          label="Block Rate"
          value={total > 0 ? `${Math.round((totalBlocked / total) * 100)}%` : "0%"}
          accent="yellow"
        />
      </div>

      {/* Traffic Chart */}
      <Card className={styles.chartCard}>
        <div className={styles.cardTitle}>Request Traffic</div>
        {seriesLoading ? <Spinner /> : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2a2a35" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#5a5a72", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#5a5a72", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#18181f", border: "1px solid #2a2a35", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#9898b0" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="allowed" name="Allowed" stroke="#34d399" strokeWidth={2} fill="url(#ga)" />
              <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#f87171" strokeWidth={2} fill="url(#gb)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className={styles.bottomRow}>
        {/* Latency */}
        <Card>
          <div className={styles.cardTitle}>Response Latency (last 1h)</div>
          {latency ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={[
                { label: "avg", ms: latency.avg },
                { label: "p50", ms: latency.p50 },
                { label: "p95", ms: latency.p95 },
                { label: "p99", ms: latency.p99 },
              ]} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#2a2a35" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "#5a5a72", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#5a5a72", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#18181f", border: "1px solid #2a2a35", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="ms" name="ms" fill="#7c6af7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Spinner />}
        </Card>

        {/* Top IPs */}
        <Card>
          <div className={styles.cardTitle}>Top IPs (24h)</div>
          <div className={styles.ipList}>
            {topIPs?.slice(0, 8).map((ip) => (
              <div key={ip.ipAddress} className={styles.ipItem}>
                <code className={styles.ipAddr}>{ip.ipAddress}</code>
                <div className={styles.ipBar}>
                  <div
                    className={styles.ipBarFill}
                    style={{ width: `${Math.min(100, (ip._count.id / (topIPs[0]._count.id || 1)) * 100)}%` }}
                  />
                </div>
                <span className={styles.ipCount}>{ip._count.id}</span>
              </div>
            )) ?? <span className={styles.empty}>No data</span>}
          </div>
        </Card>

        {/* Top Keys */}
        <Card>
          <div className={styles.cardTitle}>Top Keys (24h)</div>
          <div className={styles.ipList}>
            {topKeys?.map((k) => (
              <div key={k.id} className={styles.ipItem}>
                <span className={styles.ipAddr}>{k.name}</span>
                <div className={styles.ipBar}>
                  <div
                    className={`${styles.ipBarFill} ${styles.purple}`}
                    style={{ width: `${Math.min(100, (k.requests / ((topKeys[0]?.requests) || 1)) * 100)}%` }}
                  />
                </div>
                <span className={styles.ipCount}>{k.requests}</span>
              </div>
            )) ?? <span className={styles.empty}>No data</span>}
          </div>
        </Card>
      </div>
    </div>
  );
}
