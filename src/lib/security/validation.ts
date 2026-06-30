import { z } from "zod";

export const importSchema = z.object({
  content: z.string().min(1, "Schema content is required").max(5 * 1024 * 1024, "Schema too large (max 5MB)"),
  format: z.enum(["openapi-json", "openapi-yaml", "graphql-sdl"]),
  name: z.string().min(1).max(100).optional(),
});

export const createScenarioSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  schemaId: z.string().min(1),
  steps: z.array(
    z.object({
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
      path: z.string().min(1),
      headers: z.record(z.string()).default({}),
      body: z.any().optional(),
      expectedStatus: z.number().int().min(100).max(599).default(200),
      description: z.string().max(500).optional(),
      extractVariables: z.record(z.string()).optional(),
    })
  ).min(1, "At least one step is required").max(50, "Maximum 50 steps allowed"),
});

export const exportQuerySchema = z.object({
  format: z.enum(["postman", "playwright", "curl"]),
});

export const mockRequestSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().min(1),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  query: z.record(z.string()).optional(),
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown):
  { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMsg = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
  return { success: false, error: errorMsg };
}
