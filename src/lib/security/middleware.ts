import { NextRequest, NextResponse } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(identifier: string, max: number, windowMs: number) {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: max - 1, resetTime: now + windowMs };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count, resetTime: entry.resetTime };
}

export function applyRateLimit(req: NextRequest, max?: number, windowMs?: number) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
  const limits = {
    max: max ?? parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    windowMs: windowMs ?? parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  };
  const result = rateLimit(ip, limits.max, limits.windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetTime - Date.now()) / 1000)) } }
    );
  }

  return null;
}

export function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}
