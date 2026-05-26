import { Request, Response, NextFunction } from "express";
import { ApiKeyService } from "../modules/apikeys/apikey.service";
import { checkRateLimit } from "../services/rateLimiter.service";
import { logRequest } from "../services/logger.service";
import { detectAbuse } from "../services/abuse.service";

const apiKeyService = new ApiKeyService();

export async function rateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const rawKey =
    req.headers["x-api-key"] as string ||
    req.query.api_key as string;

  if (!rawKey) {
    return res.status(401).json({ error: "API key required" });
  }

  const apiKey = await apiKeyService.validateAndGetApiKey(rawKey);
  if (!apiKey) {
    return res.status(401).json({ error: "Invalid or expired API key" });
  }

  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const startTime = Date.now();

  // Check rate limit
  const result = await checkRateLimit(
    apiKey.id,
    apiKey.algorithm as "fixed" | "sliding",
    apiKey.rateLimit,
    apiKey.windowSeconds
  );

  // Set standard rate limit headers
  res.setHeader("X-RateLimit-Limit", result.limit);
  res.setHeader("X-RateLimit-Remaining", result.remaining);
  res.setHeader("X-RateLimit-Reset", result.resetAt);
  res.setHeader("X-RateLimit-Algorithm", apiKey.algorithm);

  if (!result.allowed) {
    res.setHeader("Retry-After", result.retryAfter ?? 60);

    await logRequest({
      apiKeyId: apiKey.id,
      userId: apiKey.userId,
      ipAddress,
      method: req.method,
      path: req.path,
      statusCode: 429,
      responseTimeMs: Date.now() - startTime,
      blocked: true,
      blockReason: "Rate limit exceeded",
      userAgent: req.headers["user-agent"],
    });

    // Abuse detection (async, don't await)
    detectAbuse(apiKey.id, ipAddress).catch(console.error);

    return res.status(429).json({
      error: "Too Many Requests",
      limit: result.limit,
      remaining: 0,
      resetAt: result.resetAt,
      retryAfter: result.retryAfter,
    });
  }

  // Attach to request for downstream use
  req.apiKey = apiKey;
  req.rateLimitResult = result;

  // Log after response
  res.on("finish", () => {
    logRequest({
      apiKeyId: apiKey.id,
      userId: apiKey.userId,
      ipAddress,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - startTime,
      blocked: false,
      userAgent: req.headers["user-agent"],
    }).catch(console.error);
  });

  next();
}
