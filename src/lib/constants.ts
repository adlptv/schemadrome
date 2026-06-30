export const API_VERSION = "v1";

export const DEFAULT_RATE_LIMIT = {
  max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
};

export const SANDBOX_LIMITS = {
  maxResources: parseInt(process.env.SANDBOX_MAX_RESOURCES || "10000", 10),
  maxCollections: 100,
  maxSchemaSize: 5 * 1024 * 1024, // 5MB
  maxScenarioSteps: 50,
};

export const CORS_CONFIG = {
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Total-Count", "X-Response-Time"],
  credentials: true,
  maxAge: 86400,
};

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
