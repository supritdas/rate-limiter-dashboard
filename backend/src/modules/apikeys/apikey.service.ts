import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "crypto";
import { redisClient } from "../../config/redis";

const prisma = new PrismaClient();

export class ApiKeyService {
  private generateKey(): { raw: string; hashed: string; prefix: string } {
    const raw = `rl_${randomBytes(32).toString("hex")}`;
    const hashed = createHash("sha256").update(raw).digest("hex");
    const prefix = raw.substring(0, 12);
    return { raw, hashed, prefix };
  }

  async createApiKey(
    userId: string,
    data: {
      name: string;
      rateLimit: number;
      windowSeconds: number;
      algorithm: "fixed" | "sliding";
      expiresAt?: Date;
    }
  ) {
    const { raw, hashed, prefix } = this.generateKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name: data.name,
        keyHash: hashed,
        keyPrefix: prefix,
        rateLimit: data.rateLimit,
        windowSeconds: data.windowSeconds,
        algorithm: data.algorithm,
        expiresAt: data.expiresAt ?? null,
      },
    });

    return { ...apiKey, rawKey: raw };
  }

  async listApiKeys(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        rateLimit: true,
        windowSeconds: true,
        algorithm: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        _count: { select: { requestLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getApiKeyById(id: string, userId: string) {
    return prisma.apiKey.findFirst({
      where: { id, userId, deletedAt: null },
      include: { _count: { select: { requestLogs: true } } },
    });
  }

  async updateApiKey(
    id: string,
    userId: string,
    data: Partial<{
      name: string;
      rateLimit: number;
      windowSeconds: number;
      algorithm: "fixed" | "sliding";
      isActive: boolean;
      expiresAt: Date | null;
    }>
  ) {
    const key = await prisma.apiKey.findFirst({ where: { id, userId, deletedAt: null } });
    if (!key) throw new Error("API key not found");

    const updated = await prisma.apiKey.update({ where: { id }, data });

    // Invalidate Redis cache for this key
    await redisClient.del(`apikey:${key.keyHash}`);

    return updated;
  }

  async revokeApiKey(id: string, userId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, userId, deletedAt: null } });
    if (!key) throw new Error("API key not found");

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    await redisClient.del(`apikey:${key.keyHash}`);
    return { message: "API key revoked" };
  }

  async validateAndGetApiKey(rawKey: string) {
    const hashed = createHash("sha256").update(rawKey).digest("hex");
    const cacheKey = `apikey:${hashed}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        keyHash: hashed,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    await redisClient.setEx(cacheKey, 300, JSON.stringify(apiKey));
    return apiKey;
  }

  async getKeyStats(id: string, userId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, userId, deletedAt: null } });
    if (!key) throw new Error("API key not found");

    const [total, blocked, last24h] = await Promise.all([
      prisma.requestLog.count({ where: { apiKeyId: id } }),
      prisma.requestLog.count({ where: { apiKeyId: id, blocked: true } }),
      prisma.requestLog.count({
        where: {
          apiKeyId: id,
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
      }),
    ]);

    return { total, blocked, allowed: total - blocked, last24h };
  }
}
