import { useState } from "react";
import { useAuthStore } from "../store/auth.store";
import { useAdminStats, useAdminUsers, useAbuseFlags } from "../hooks";
import {
  PageHeader, StatCard, Card, Badge,
  Button, Spinner, EmptyState
} from "../components/ui";
import { api } from "../lib/api";
import { format } from "date-fns";
import { ShieldCheck, Users, Key, AlertTriangle } from "lucide-react";
import styles from "./Admin.module.css";

export function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [usersPage, setUsersPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"users" | "abuse">("users");

  const { data: stats, loading: statsLoading } = useAdminStats();
  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useAdminUsers(usersPage);
  const { data: abuseFlags, loading: abuseLoading, refetch: refetchAbuse } = useAbuseFlags();

  if (user?.role !== "admin") {
    return (
      <div className={styles.noAccess}>
        <ShieldCheck size={40} className={styles.noAccessIcon} />
        <h2>Admin Access Required</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  const handleRoleChange = async (userId: string, role: "user" | "admin") => {
    await api.patch(`/admin/users/${userId}/role`, { role });
    refetchUsers();
  };

  const handleResolveFlag = async (flagId: string) => {
    await api.patch(`/admin/abuse-flags/${flagId}/resolve`);
    refetchAbuse();
  };

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage users, keys and system health"
      />

      {/* System Stats */}
      {statsLoading ? <Spinner /> : (
        <div className={styles.statsGrid}>
          <StatCard
            label="Total Users"
            value={stats?.users ?? 0}
            accent="purple"
          />
          <StatCard
            label="Total API Keys"
            value={stats?.apiKeys ?? 0}
            accent="yellow"
          />
          <StatCard
            label="Total Requests"
            value={stats?.requests.toLocaleString() ?? 0}
            sub={`${(stats?.blockedRequests ?? 0).toLocaleString()} blocked`}
            accent="green"
          />
          <StatCard
            label="Open Abuse Flags"
            value={stats?.abuseFlags ?? 0}
            accent={stats?.abuseFlags ? "red" : "green"}
          />
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "users" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={14} /> Users
        </button>
        <button
          className={`${styles.tab} ${activeTab === "abuse" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("abuse")}
        >
          <AlertTriangle size={14} />
          Abuse Flags
          {(stats?.abuseFlags ?? 0) > 0 && (
            <span className={styles.flagCount}>{stats!.abuseFlags}</span>
          )}
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <Card>
          {usersLoading ? <Spinner /> : !usersData?.users.length ? (
            <EmptyState message="No users found." />
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>API Keys</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className={styles.userCell}>
                            <div className={styles.avatar}>
                              {u.name[0].toUpperCase()}
                            </div>
                            <span className={styles.userName}>{u.name}</span>
                          </div>
                        </td>
                        <td className={styles.mono}>{u.email}</td>
                        <td>
                          <Badge variant={u.role === "admin" ? "purple" : "default"}>
                            {u.role}
                          </Badge>
                        </td>
                        <td>
                          <div className={styles.keyCount}>
                            <Key size={12} />
                            {u._count.apiKeys}
                          </div>
                        </td>
                        <td className={styles.mono}>
                          {format(new Date(u.createdAt), "MMM d, yyyy")}
                        </td>
                        <td>
                          {u.id !== user.id && (
                            <Button
                              size="sm"
                              variant={u.role === "admin" ? "danger" : "secondary"}
                              onClick={() =>
                                handleRoleChange(u.id, u.role === "admin" ? "user" : "admin")
                              }
                            >
                              {u.role === "admin" ? "Remove Admin" : "Make Admin"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className={styles.pagination}>
                <span className={styles.pageInfo}>
                  Page {usersPage} of {usersData.pages} — {usersData.total} users
                </span>
                <div className={styles.pageButtons}>
                  <button
                    className={styles.pageBtn}
                    disabled={usersPage <= 1}
                    onClick={() => setUsersPage((p) => p - 1)}
                  >
                    ← Prev
                  </button>
                  <button
                    className={styles.pageBtn}
                    disabled={usersPage >= (usersData.pages ?? 1)}
                    onClick={() => setUsersPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Abuse Flags Tab */}
      {activeTab === "abuse" && (
        <Card>
          {abuseLoading ? <Spinner /> : !abuseFlags?.length ? (
            <EmptyState message="No open abuse flags. All clear!" />
          ) : (
            <div className={styles.flagList}>
              {abuseFlags.map((flag) => (
                <div key={flag.id} className={styles.flagItem}>
                  <div className={styles.flagIcon}>
                    <AlertTriangle size={16} />
                  </div>
                  <div className={styles.flagInfo}>
                    <div className={styles.flagKey}>
                      <span>{flag.apiKey.name}</span>
                      <code className={styles.flagPrefix}>{flag.apiKey.keyPrefix}…</code>
                    </div>
                    <p className={styles.flagReason}>{flag.reason}</p>
                    <span className={styles.flagDate}>
                      Flagged {format(new Date(flag.flaggedAt), "MMM d, yyyy 'at' HH:mm")}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleResolveFlag(flag.id)}
                  >
                    <ShieldCheck size={13} /> Resolve
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
