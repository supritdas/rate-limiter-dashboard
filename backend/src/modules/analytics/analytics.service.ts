import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class AnalyticsService {
  async getOverview(userId: string) {
    const [totalKeys, totalRequests, blockedRequests, activeKeys] =
      await Promise.all([
        prisma.apiKey.count({ where: { userId, deletedAt: null } }),
        prisma.requestLog.count({ where: { userId } }),
        prisma.requestLog.count({ where: { userId, blocked: true } }),
        prisma.apiKey.count({ where: { userId, isActive: true, deletedAt: null } }),
      ]);

    return {
      totalKeys,
      activeKeys,
      totalRequests,
      blockedRequests,
      allowedRequests: totalRequests - blockedRequests,
      blockRate: totalRequests > 0
        ? Math.round((blockedRequests / totalRequests) * 10000) / 100
        : 0,
    };
  }

  async getRequestsTimeSeries(
    userId: string,
    apiKeyId?: string,
    hours = 24
  ) {
    const from = new Date(Date.now() - hours * 3600 * 1000);

    const logs = await prisma.requestLog.findMany({
      where: {
        userId,
        ...(apiKeyId ? { apiKeyId } : {}),
        createdAt: { gte: from },
      },
      select: { createdAt: true, blocked: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by hour
    const buckets: Record<string, { allowed: number; blocked: number }> = {};

    for (let i = 0; i < hours; i++) {
      const bucketTime = new Date(from.getTime() + i * 3600 * 1000);
      const key = bucketTime.toISOString().slice(0, 13);
      buckets[key] = { allowed: 0, blocked: 0 };
    }

    for (const log of logs) {
      const key = log.createdAt.toISOString().slice(0, 13);
      if (buckets[key]) {
        if (log.blocked) buckets[key].blocked++;
        else buckets[key].allowed++;
      }
    }

    return Object.entries(buckets).map(([hour, counts]) => ({
      hour,
      ...counts,
      total: counts.allowed + counts.blocked,
    }));
  }

  async getTopApiKeys(userId: string, limit = 5) {
    const results = await prisma.requestLog.groupBy({
      by: ["apiKeyId"],
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 86400000) },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    const keyIds = results.map((r) => r.apiKeyId);
    const keys = await prisma.apiKey.findMany({
      where: { id: { in: keyIds } },
      select: { id: true, name: true, keyPrefix: true },
    });

    const keyMap = Object.fromEntries(keys.map((k) => [k.id, k]));

    return results.map((r) => ({
      ...keyMap[r.apiKeyId],
      requests: r._count.id,
    }));
  }

  async getTopIPs(userId: string, limit = 10) {
    return prisma.requestLog.groupBy({
      by: ["ipAddress"],
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 86400000) },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });
  }

  async getLatency(userId: string, apiKeyId?: string) {
    const logs = await prisma.requestLog.findMany({
      where: {
        userId,
        ...(apiKeyId ? { apiKeyId } : {}),
        createdAt: { gte: new Date(Date.now() - 3600000) },
      },
      select: { responseTimeMs: true },
    });

    if (!logs.length) return { avg: 0, p50: 0, p95: 0, p99: 0 };

    const sorted = logs.map((l) => l.responseTimeMs).sort((a, b) => a - b);
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { avg: Math.round(avg), p50, p95, p99 };
  }
}
