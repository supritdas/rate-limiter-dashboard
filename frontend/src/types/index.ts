export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  rateLimit: number;
  windowSeconds: number;
  algorithm: "fixed" | "sliding";
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  _count?: { requestLogs: number };
}

export interface RequestLog {
  id: string;
  apiKeyId: string;
  userId: string;
  ipAddress: string;
  method: string;
  path: string;
  statusCode: number;
  responseTimeMs: number;
  blocked: boolean;
  blockReason: string | null;
  userAgent: string | null;
  createdAt: string;
  apiKey?: { name: string; keyPrefix: string };
}

export interface OverviewStats {
  totalKeys: number;
  activeKeys: number;
  totalRequests: number;
  blockedRequests: number;
  allowedRequests: number;
  blockRate: number;
}

export interface TimeSeriesPoint {
  hour: string;
  allowed: number;
  blocked: number;
  total: number;
}

export interface AbuseFlag {
  id: string;
  apiKeyId: string;
  reason: string;
  flaggedAt: string;
  resolved: boolean;
  apiKey: { name: string; keyPrefix: string };
}
