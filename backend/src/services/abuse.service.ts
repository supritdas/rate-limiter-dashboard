import { redisClient } from "../config/redis";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ABUSE_THRESHOLDS = {
  BLOCKED_RATIO_THRESHOLD: 0.8, // 80% of requests blocked
  BURST_WINDOW_SECONDS: 10,
  BURST_LIMIT: 50,
  SUSPICIOUS_IPS_LIMIT: 20,
};

export async function detectAbuse(
  apiKeyId: string,
  ipAddress: string
): Promise<{ flagged: boolean; reason?: string }> {
  // 1. Burst detection per IP
  const burstKey = `abuse:burst:${apiKeyId}:${ipAddress}`;
  const burstCount = await redisClient.incr(burstKey);
  if (burstCount === 1) {
    await redisClient.expire(burstKey, ABUSE_THRESHOLDS.BURST_WINDOW_SECONDS);
  }

  if (burstCount > ABUSE_THRESHOLDS.BURST_LIMIT) {
    await flagApiKey(apiKeyId, `IP ${ipAddress} exceeded burst limit`);
    return { flagged: true, reason: "Burst threshold exceeded" };
  }

  // 2. Unique IPs check (too many IPs using same key = key leak/abuse)
  const ipSetKey = `abuse:ips:${apiKeyId}`;
  await redisClient.sAdd(ipSetKey, ipAddress);
  await redisClient.expire(ipSetKey, 3600);
  const uniqueIPs = await redisClient.sCard(ipSetKey);

  if (uniqueIPs > ABUSE_THRESHOLDS.SUSPICIOUS_IPS_LIMIT) {
    await flagApiKey(apiKeyId, `Key used from ${uniqueIPs} unique IPs`);
    return { flagged: true, reason: "Key used from too many IPs" };
  }

  // 3. High block ratio check (last 100 requests)
  const recent = await prisma.requestLog.findMany({
    where: { apiKeyId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { blocked: true },
  });

  if (recent.length >= 20) {
    const blockedCount = recent.filter((r) => r.blocked).length;
    const ratio = blockedCount / recent.length;
    if (ratio >= ABUSE_THRESHOLDS.BLOCKED_RATIO_THRESHOLD) {
      await flagApiKey(apiKeyId, `${Math.round(ratio * 100)}% requests blocked`);
      return { flagged: true, reason: "Excessive rate limit violations" };
    }
  }

  return { flagged: false };
}

async function flagApiKey(apiKeyId: string, reason: string) {
  const flagKey = `abuse:flagged:${apiKeyId}`;
  const alreadyFlagged = await redisClient.exists(flagKey);
  if (alreadyFlagged) return;

  await redisClient.setEx(flagKey, 86400, reason);

  await prisma.abuseFlag.upsert({
    where: { apiKeyId },
    update: { reason, flaggedAt: new Date(), resolved: false },
    create: { apiKeyId, reason },
  });
}

export async function getAbusedKeys(userId: string) {
  return prisma.abuseFlag.findMany({
    where: { resolved: false, apiKey: { userId } },
    include: { apiKey: { select: { name: true, keyPrefix: true } } },
    orderBy: { flaggedAt: "desc" },
  });
}

export async function resolveAbuseFlag(flagId: string) {
  return prisma.abuseFlag.update({
    where: { id: flagId },
    data: { resolved: true },
  });
}
