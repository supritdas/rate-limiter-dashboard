import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class AdminService {
  async getSystemStats() {
    const [users, apiKeys, requests, blockedRequests, abuseFlags] =
      await Promise.all([
        prisma.user.count(),
        prisma.apiKey.count({ where: { deletedAt: null } }),
        prisma.requestLog.count(),
        prisma.requestLog.count({ where: { blocked: true } }),
        prisma.abuseFlag.count({ where: { resolved: false } }),
      ]);

    return { users, apiKeys, requests, blockedRequests, abuseFlags };
  }

  async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: { select: { apiKeys: true } },
        },
      }),
      prisma.user.count(),
    ]);
    return { users, total, page, pages: Math.ceil(total / limit) };
  }

  async setUserRole(userId: string, role: "user" | "admin") {
    return prisma.user.update({ where: { id: userId }, data: { role } });
  }

  async getAbuseFlags() {
    return prisma.abuseFlag.findMany({
      where: { resolved: false },
      include: {
        apiKey: { select: { name: true, keyPrefix: true, userId: true } },
      },
      orderBy: { flaggedAt: "desc" },
    });
  }

  async resolveAbuseFlag(id: string) {
    return prisma.abuseFlag.update({ where: { id }, data: { resolved: true } });
  }

  async getRecentLogs(limit = 100) {
    return prisma.requestLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { apiKey: { select: { name: true, keyPrefix: true } } },
    });
  }
}
