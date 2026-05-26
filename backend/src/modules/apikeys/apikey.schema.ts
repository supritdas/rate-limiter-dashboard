import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  rateLimit: z.number().int().min(1).max(100000).default(100),
  windowSeconds: z.number().int().min(1).max(86400).default(60),
  algorithm: z.enum(["fixed", "sliding"]).default("fixed"),
  expiresAt: z.coerce.date().optional(),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rateLimit: z.number().int().min(1).max(100000).optional(),
  windowSeconds: z.number().int().min(1).max(86400).optional(),
  algorithm: z.enum(["fixed", "sliding"]).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});
