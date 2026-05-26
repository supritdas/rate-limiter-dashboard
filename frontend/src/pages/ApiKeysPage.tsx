import { useState } from "react";
import { useApiKeys } from "../hooks";
import { api } from "../lib/api";
import {
  PageHeader, Button, Badge, Card, Modal,
  EmptyState, Spinner
} from "../components/ui";
import { Key, Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import styles from "./ApiKeys.module.css";

interface NewKeyForm {
  name: string;
  rateLimit: number;
  windowSeconds: number;
  algorithm: "fixed" | "sliding";
}

export function ApiKeysPage() {
  const { data: keys, loading, refetch } = useApiKeys();
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState<NewKeyForm>({
    name: "", rateLimit: 100, windowSeconds: 60, algorithm: "fixed",
  });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setCreating(true);
    setError("");
    try {
      const res = await api.post("/keys", form);
      setNewKey(res.data.data.rawKey);
      setShowCreate(false);
      setForm({ name: "", rateLimit: 100, windowSeconds: 60, algorithm: "fixed" });
      refetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await api.patch(`/keys/${id}`, { isActive: !isActive });
    refetch();
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await api.delete(`/keys/${id}`);
    refetch();
  };

  const copyKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <PageHeader
        title="API Keys"
        subtitle="Create and manage your API keys"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Key
          </Button>
        }
      />

      {loading ? <Spinner /> : !keys?.length ? (
        <EmptyState message="No API keys yet. Create one to get started." />
      ) : (
        <div className={styles.grid}>
          {keys.map((key) => (
            <Card key={key.id} className={styles.keyCard}>
              <div className={styles.keyHeader}>
                <div className={styles.keyIcon}><Key size={14} /></div>
                <div className={styles.keyInfo}>
                  <span className={styles.keyName}>{key.name}</span>
                  <code className={styles.keyPrefix}>{key.keyPrefix}••••••••</code>
                </div>
                <Badge variant={key.isActive ? "green" : "red"}>
                  {key.isActive ? "active" : "inactive"}
                </Badge>
              </div>

              <div className={styles.keyMeta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Rate Limit</span>
                  <span className={styles.metaValue}>{key.rateLimit} req</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Window</span>
                  <span className={styles.metaValue}>{key.windowSeconds}s</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Algorithm</span>
                  <Badge variant="purple">{key.algorithm}</Badge>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Requests</span>
                  <span className={styles.metaValue}>{key._count?.requestLogs ?? 0}</span>
                </div>
              </div>

              <div className={styles.keyFooter}>
                <span className={styles.keyDate}>
                  Created {format(new Date(key.createdAt), "MMM d, yyyy")}
                </span>
                <div className={styles.keyActions}>
                  <button
                    className={styles.iconBtn}
                    onClick={() => handleToggle(key.id, key.isActive)}
                    title={key.isActive ? "Deactivate" : "Activate"}
                  >
                    {key.isActive
                      ? <ToggleRight size={16} className={styles.iconGreen} />
                      : <ToggleLeft size={16} className={styles.iconMuted} />}
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.danger}`}
                    onClick={() => handleRevoke(key.id)}
                    title="Revoke key"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create API Key">
        <div className={styles.form}>
          <div className={styles.field}>
            <label>Name</label>
            <input
              placeholder="e.g. Production Key"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Rate Limit (requests)</label>
              <input
                type="number"
                min={1}
                value={form.rateLimit}
                onChange={(e) => setForm({ ...form, rateLimit: +e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Window (seconds)</label>
              <input
                type="number"
                min={1}
                value={form.windowSeconds}
                onChange={(e) => setForm({ ...form, windowSeconds: +e.target.value })}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label>Algorithm</label>
            <select
              value={form.algorithm}
              onChange={(e) => setForm({ ...form, algorithm: e.target.value as "fixed" | "sliding" })}
            >
              <option value="fixed">Fixed Window</option>
              <option value="sliding">Sliding Window</option>
            </select>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <Button onClick={handleCreate} loading={creating}>Create API Key</Button>
        </div>
      </Modal>

      {/* New Key Reveal Modal */}
      <Modal open={!!newKey} onClose={() => setNewKey(null)} title="Your New API Key">
        <div className={styles.revealBox}>
          <p className={styles.revealWarning}>
            ⚠️ Copy this key now — it won't be shown again.
          </p>
          <div className={styles.keyReveal}>
            <code>{newKey}</code>
            <button className={styles.copyBtn} onClick={copyKey}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <Button onClick={() => setNewKey(null)} variant="secondary">Done</Button>
        </div>
      </Modal>
    </div>
  );
}
