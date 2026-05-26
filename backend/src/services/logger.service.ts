import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface LogRequestData {
  apiKeyId: string;
  userId: string;
  ipAddress: string;
  method: string;
  path: string;
  statusCode: number;
  responseTimeMs: number;
  blocked: boolean;
  blockReason?: string;
  userAgent?: string;
}

export async function logRequest(data: LogRequestData): Promise<void> {
  try {
    await prisma.requestLog.create({ data });
  } catch (err) {
    // Never let logging crash the request
    console.error("Failed to log request:", err);
  }
}

export async function getRequestLogs(
  userId: string,
  apiKeyId?: string,
  options: {
    page?: number;
    limit?: number;
    blocked?: boolean;
    from?: Date;
    to?: Date;
  } = {}
) {
  const { page = 1, limit = 50, blocked, from, to } = options;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };
  if (apiKeyId) where.apiKeyId = apiKeyId;
  if (blocked !== undefined) where.blocked = blocked;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = from;
    if (to) (where.createdAt as Record<string, unknown>).lte = to;
  }

  const [logs, total] = await Promise.all([
    prisma.requestLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { apiKey: { select: { name: true, keyPrefix: true } } },
    }),
    prisma.requestLog.count({ where }),
  ]);

  return { logs, total, page, pages: Math.ceil(total / limit) };
}
