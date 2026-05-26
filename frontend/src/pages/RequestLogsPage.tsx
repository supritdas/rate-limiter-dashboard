import { useState } from "react";
import { useRequestLogs, useApiKeys } from "../hooks";
import { PageHeader, Badge, Spinner, EmptyState } from "../components/ui";
import { format } from "date-fns";
import styles from "./RequestLogs.module.css";

export function RequestLogsPage() {
  const [page, setPage] = useState(1);
  const [blocked, setBlocked] = useState<boolean | undefined>();
  const [selectedKey, setSelectedKey] = useState<string | undefined>();

  const { data: keys } = useApiKeys();
  const { data, loading } = useRequestLogs({
    apiKeyId: selectedKey,
    blocked,
    page,
    limit: 50,
  });

  const statusBadge = (code: number) => {
    if (code === 429) return <Badge variant="red">429</Badge>;
    if (code >= 500) return <Badge variant="red">{code}</Badge>;
    if (code >= 400) return <Badge variant="yellow">{code}</Badge>;
    return <Badge variant="green">{code}</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="Request Logs"
        subtitle="Full request history across all API keys"
      />

      {/* Filters */}
      <div className={styles.filters}>
        <select
          className={styles.select}
          value={selectedKey ?? ""}
          onChange={(e) => { setSelectedKey(e.target.value || undefined); setPage(1); }}
        >
          <option value="">All keys</option>
          {keys?.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>

        <div className={styles.pills}>
          {[
            { label: "All", value: undefined },
            { label: "Allowed", value: false },
            { label: "Blocked", value: true },
          ].map(({ label, value }) => (
            <button
              key={label}
              className={`${styles.pill} ${blocked === value ? styles.pillActive : ""}`}
              onClick={() => { setBlocked(value); setPage(1); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : !data?.logs.length ? (
        <EmptyState message="No request logs found." />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Key</th>
                  <th>IP</th>
                  <th>Latency</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.id} className={log.blocked ? styles.rowBlocked : ""}>
                    <td className={styles.mono}>
                      {format(new Date(log.createdAt), "HH:mm:ss")}
                      <span className={styles.date}>{format(new Date(log.createdAt), "MMM d")}</span>
                    </td>
                    <td>
                      <Badge variant={
                        log.method === "GET" ? "green" :
                        log.method === "POST" ? "purple" :
                        log.method === "DELETE" ? "red" : "default"
                      }>
                        {log.method}
                      </Badge>
                    </td>
                    <td className={styles.path}>{log.path}</td>
                    <td>{statusBadge(log.statusCode)}</td>
                    <td>
                      <code className={styles.keyPrefix}>
                        {log.apiKey?.name ?? "—"}
                      </code>
                    </td>
                    <td className={styles.mono}>{log.ipAddress}</td>
                    <td className={styles.mono}>{log.responseTimeMs}ms</td>
                    <td>
                      {log.blocked
                        ? <Badge variant="red">blocked</Badge>
                        : <Badge variant="green">allowed</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Page {data.page} of {data.pages} — {data.total.toLocaleString()} total
            </span>
            <div className={styles.pageButtons}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </button>
              <button
                className={styles.pageBtn}
                disabled={page >= data.pages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
