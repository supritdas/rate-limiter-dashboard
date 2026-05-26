import { JwtPayload } from "../middleware/auth.middleware";
import { RateLimitResult } from "../services/rateLimiter.service";
import { ApiKey } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      apiKey?: ApiKey;
      rateLimitResult?: RateLimitResult;
    }
  }
}
