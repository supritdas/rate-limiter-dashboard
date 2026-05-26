import { Request, Response, NextFunction } from "express";

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  if (err.name === "ZodError") {
    return res.status(400).json({ error: "Validation error", details: err });
  }

  if (err.message === "API key not found" || err.message === "Not found") {
    return res.status(404).json({ error: err.message });
  }

  return res.status(500).json({ error: "Internal Server Error" });
}
