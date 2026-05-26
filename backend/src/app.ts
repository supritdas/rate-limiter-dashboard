import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { connectRedis } from "./config/redis";
import { rateLimiterMiddleware } from "./middleware/rateLimiter.middleware";
import { errorMiddleware } from "./middleware/error.middleware";

// Routes
import authRoutes from "./modules/auth/auth.routes";
import apiKeyRoutes from "./modules/apikeys/apikey.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import requestRoutes from "./modules/requests/requests.routes";
import adminRoutes from "./modules/admin/admin.routes";

const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      env.FRONTEND_URL,
      "http://localhost:5173",
      "https://rate-limiter-dashboard-pi.vercel.app"
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
}));

app.use(express.json());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/keys", apiKeyRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

// Rate-limited test route — uses x-api-key header
app.get("/api/test", rateLimiterMiddleware, (_req, res) => {
  res.json({ message: "Request allowed!", ts: Date.now() });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function bootstrap() {
  await connectRedis();
  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
