import { createClient } from "redis";
import { env } from "./env";

export const redisClient = createClient({ url: env.REDIS_URL });

redisClient.on("error", (err) => console.error("Redis error:", err));

export async function connectRedis() {
  await redisClient.connect();
  console.log("✅ Redis connected");
}
