import { useState, useRef } from "react";
import { useApiKeys } from "../hooks";
import { PageHeader, Card } from "../components/ui";
import { Play, Square, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import styles from "./TestPanel.module.css";

interface LogLine {
  id: number;
  text: string;
  type: "info" | "success" | "error" | "warn" | "header";
}

export function TestPanelPage() {
  const { data: keys } = useApiKeys();
  const [selectedKey, setSelectedKey] = useState("");
  const [rawKey, setRawKey] = useState("");
  const [requestCount, setRequestCount] = useState(10);
  const [delayMs, setDelayMs] = useState(100);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [stats, setStats] = useState({ allowed: 0, blocked: 0, total: 0 });
  const logId = useRef(0);
  const stopRef = useRef(false);

  const addLog = (text: string, type: LogLine["type"] = "info") => {
    setLogs((prev) => [...prev, { id: logId.current++, text, type }]);
  };

  const clearLogs = () => {
    setLogs([]);
    setStats({ allowed: 0, blocked: 0, total: 0 });
  };

  const stop = () => { stopRef.current = true; };

  const runTest = async (mode: "ratelimit" | "abuse" | "burst" | "custom") => {
    if (!rawKey) { addLog("⚠️ Please paste your API key (rl_...) in the field below!", "warn"); return; }

    setRunning(true);
    stopRef.current = false;
    clearLogs();

    let allowed = 0;
    let blocked = 0;

    const hit = async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:4000"}/api/test`, {
      headers: { "x-api-key": rawKey },
      });
      return res.status;
    };
    if (mode === "ratelimit") {
      addLog("━━━ Rate Limit Test ━━━━━━━━━━━━━━━━━━━━━", "header");
      addLog(`Sending ${requestCount} requests with ${delayMs}ms delay...`, "info");

      for (let i = 1; i <= requestCount; i++) {
        if (stopRef.current) { addLog("⛔ Stopped by user", "warn"); break; }
        const status = await hit();
        if (status === 200) {
          allowed++;
          addLog(`Request ${i} → ✅ Allowed (200)`, "success");
        } else {
          blocked++;
          addLog(`Request ${i} → ❌ Blocked (429) — Rate limit hit!`, "error");
        }
        setStats({ allowed, blocked, total: i });
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    if (mode === "burst") {
      addLog("━━━ Burst Test ━━━━━━━━━━━━━━━━━━━━━━━━━━", "header");
      addLog("Sending 20 requests instantly (no delay)...", "info");
      const promises = Array.from({ length: 20 }, (_, i) =>
        hit().then((status) => {
          if (status === 200) allowed++;
          else blocked++;
          setStats({ allowed, blocked, total: allowed + blocked });
          addLog(
            `Request ${i + 1} → ${status === 200 ? "✅ Allowed" : "❌ Blocked (429)"}`,
            status === 200 ? "success" : "error"
          );
        })
      );
      await Promise.all(promises);
    }

    if (mode === "abuse") {
      addLog("━━━ Abuse Detection Test ━━━━━━━━━━━━━━━━", "header");
      addLog("Sending 60 rapid requests to trigger abuse detector...", "info");
      addLog("(Abuse triggers when >80% requests are blocked)", "warn");

      for (let i = 1; i <= 60; i++) {
        if (stopRef.current) { addLog("⛔ Stopped by user", "warn"); break; }
        const status = await hit();
        if (status === 200) allowed++;
        else blocked++;
        setStats({ allowed, blocked, total: i });
        if (i % 10 === 0) addLog(`${i}/60 requests sent... (${blocked} blocked)`, "info");
      }
      addLog("✅ Done! Go to Admin → Abuse Flags to see the flag", "success");
    }

    if (mode === "custom") {
      addLog("━━━ Custom Test ━━━━━━━━━━━━━━━━━━━━━━━━━", "header");
      addLog(`Sending ${requestCount} requests with ${delayMs}ms delay...`, "info");

      for (let i = 1; i <= requestCount; i++) {
        if (stopRef.current) { addLog("⛔ Stopped by user", "warn"); break; }
        const status = await hit();
        if (status === 200) allowed++;
        else blocked++;
        setStats({ allowed, blocked, total: i });
        addLog(
          `Request ${i}/${requestCount} → ${status === 200 ? "✅ Allowed" : "❌ Blocked (429)"}`,
          status === 200 ? "success" : "error"
        );
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "header");
    addLog(`Final: ${allowed} allowed, ${blocked} blocked out of ${allowed + blocked} total`, "info");
    addLog("Refresh the Dashboard, Analytics and Request Logs to see updated data!", "warn");
    setRunning(false);
  };


  return (
    <div>
      <PageHeader
        title="Test Panel"
        subtitle="Test rate limiting, abuse detection and more — right from the browser"
      />

      <div className={styles.layout}>
        {/* Controls */}
        <div className={styles.controls}>
          {/* Key Selector */}
          <Card>
            <div className={styles.sectionTitle}>1. Select API Key</div>
            <div className={styles.keyList}>
              {keys?.length ? keys.map((k) => (
                <button
                  key={k.id}
                  className={`${styles.keyBtn} ${selectedKey === k.id ? styles.keyBtnActive : ""}`}
                  onClick={() => setSelectedKey(k.id)}
                >
                  <div className={styles.keyBtnName}>{k.name}</div>
                  <div className={styles.keyBtnMeta}>
                    {k.rateLimit} req / {k.windowSeconds}s · {k.algorithm}
                  </div>
                </button>
              )) : (
                <p className={styles.empty}>No API keys found. Create one first.</p>
              )}
            </div>
            <div className={styles.rawKeyInput}>
              <label>Paste your full API key (rl_...)</label>
              <input
                type="text"
                placeholder="rl_xxxxxxxxxxxxxxxx..."
                value={rawKey}
                onChange={(e) => setRawKey(e.target.value.trim())}
              />
              {rawKey && <div className={styles.keyValid}>✅ Key entered — ready to test!</div>}
            </div>
          </Card>

          {/* Quick Tests */}
          <Card>
            <div className={styles.sectionTitle}>2. Run a Test</div>
            <div className={styles.testButtons}>
              <button
                className={`${styles.testBtn} ${styles.green}`}
                onClick={() => runTest("ratelimit")}
                disabled={running}
              >
                <Play size={14} />
                <div>
                  <div className={styles.testBtnTitle}>Rate Limit Test</div>
                  <div className={styles.testBtnSub}>Send requests until blocked</div>
                </div>
              </button>

              <button
                className={`${styles.testBtn} ${styles.purple}`}
                onClick={() => runTest("burst")}
                disabled={running}
              >
                <Play size={14} />
                <div>
                  <div className={styles.testBtnTitle}>Burst Test</div>
                  <div className={styles.testBtnSub}>20 requests all at once</div>
                </div>
              </button>

              <button
                className={`${styles.testBtn} ${styles.red}`}
                onClick={() => runTest("abuse")}
                disabled={running}
              >
                <Play size={14} />
                <div>
                  <div className={styles.testBtnTitle}>Abuse Detection</div>
                  <div className={styles.testBtnSub}>60 requests → triggers flag</div>
                </div>
              </button>

              <button
                className={`${styles.testBtn} ${styles.yellow}`}
                onClick={() => runTest("custom")}
                disabled={running}
              >
                <Play size={14} />
                <div>
                  <div className={styles.testBtnTitle}>Custom Test</div>
                  <div className={styles.testBtnSub}>Use settings below</div>
                </div>
              </button>
            </div>
          </Card>

          {/* Custom Settings */}
          <Card>
            <div className={styles.sectionTitle}>3. Custom Settings</div>
            <div className={styles.settingsGrid}>
              <div className={styles.field}>
                <label>Number of Requests</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={requestCount}
                  onChange={(e) => setRequestCount(+e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>Delay between requests (ms)</label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={delayMs}
                  onChange={(e) => setDelayMs(+e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Live Stats */}
          <Card>
            <div className={styles.sectionTitle}>Live Stats</div>
            <div className={styles.liveStats}>
              <div className={styles.statBox}>
                <CheckCircle size={18} className={styles.greenIcon} />
                <span className={styles.statNum}>{stats.allowed}</span>
                <span className={styles.statLbl}>Allowed</span>
              </div>
              <div className={styles.statBox}>
                <XCircle size={18} className={styles.redIcon} />
                <span className={styles.statNum}>{stats.blocked}</span>
                <span className={styles.statLbl}>Blocked</span>
              </div>
              <div className={styles.statBox}>
                <Clock size={18} className={styles.purpleIcon} />
                <span className={styles.statNum}>{stats.total}</span>
                <span className={styles.statLbl}>Total</span>
              </div>
            </div>
            {stats.total > 0 && (
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(stats.allowed / stats.total) * 100}%` }}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Log Output */}
        <Card className={styles.logCard}>
          <div className={styles.logHeader}>
            <span className={styles.sectionTitle}>Output Log</span>
            <div className={styles.logActions}>
              {running && (
                <button className={styles.stopBtn} onClick={stop}>
                  <Square size={13} /> Stop
                </button>
              )}
              <button className={styles.clearBtn} onClick={clearLogs}>
                <Trash2 size={13} /> Clear
              </button>
            </div>
          </div>
          <div className={styles.logOutput}>
            {logs.length === 0 ? (
              <span className={styles.logEmpty}>Select a key and click a test button to start...</span>
            ) : (
              logs.map((line) => (
                <div key={line.id} className={`${styles.logLine} ${styles[line.type]}`}>
                  {line.text}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}