import { ParsedSchema, SchemaEndpoint, SchemaType, SchemaParameter } from "../types";

interface OpenAPIDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  paths?: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
}

function resolveRef(ref: string, doc: OpenAPIDocument): SchemaType {
  const parts = ref.replace(/^#\//, "").split("/");
  let current: unknown = doc;
  for (const part of parts) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    }
  }
  if (!current || typeof current !== "object") {
    return { type: "object" };
  }
  const resolved = { ...(current as Record<string, unknown>) } as SchemaType & { $ref?: string };
  if (resolved.$ref) {
    const nestedRef = resolved.$ref;
    delete resolved.$ref;
    return { ...resolveRef(nestedRef, doc), ...resolved };
  }
  if (resolved.properties) {
    for (const [key, prop] of Object.entries(resolved.properties)) {
      if ((prop as SchemaType).$ref) {
        resolved.properties[key] = resolveRef((prop as SchemaType).$ref!, doc);
      }
    }
  }
  if (resolved.items && resolved.items.$ref) {
    resolved.items = resolveRef(resolved.items.$ref, doc);
  }
  return resolved as SchemaType;
}

function parseSchemaType(raw: unknown, doc: OpenAPIDocument): SchemaType {
  if (!raw || typeof raw !== "object") return { type: "string" };
  const s = raw as Record<string, unknown>;
  if (s.$ref) return resolveRef(s.$ref as string, doc);

  const result: SchemaType = {
    type: (s.type as string) || "object",
    format: s.format as string | undefined,
    description: s.description as string | undefined,
    nullable: s.nullable as boolean | undefined,
    default: s.default,
    example: s.example,
    enum: s.enum as unknown[] | undefined,
    minimum: s.minimum as number | undefined,
    maximum: s.maximum as number | undefined,
    minLength: s.minLength as number | undefined,
    maxLength: s.maxLength as number | undefined,
    pattern: s.pattern as string | undefined,
    uniqueItems: s.uniqueItems as boolean | undefined,
  };

  if (s.items) result.items = parseSchemaType(s.items, doc);
  if (s.properties) {
    result.properties = {};
    for (const [k, v] of Object.entries(s.properties as Record<string, unknown>)) {
      result.properties[k] = parseSchemaType(v, doc);
    }
    result.required = s.required as string[] | undefined;
  }
  if (s.oneOf) result.oneOf = (s.oneOf as unknown[]).map((i) => parseSchemaType(i, doc));
  if (s.allOf) result.allOf = (s.allOf as unknown[]).map((i) => parseSchemaType(i, doc));
  if (s.anyOf) result.anyOf = (s.anyOf as unknown[]).map((i) => parseSchemaType(i, doc));
  if (s.additionalProperties !== undefined) {
    result.additionalProperties =
      typeof s.additionalProperties === "object" ? parseSchemaType(s.additionalProperties, doc) : (s.additionalProperties as boolean);
  }

  return result;
}

function parseParameters(raw: unknown[], doc: OpenAPIDocument): SchemaParameter[] {
  return (raw || []).map((p) => {
    const param = p as Record<string, unknown>;
    return {
      name: param.name as string,
      in: param.in as SchemaParameter["in"],
      required: (param.required as boolean) || false,
      schema: parseSchemaType(param.schema, doc),
      description: param.description as string | undefined,
    };
  });
}

function extractPathParams(path: string): string[] {
  const matches = path.match(/\{(\w+)\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1));
}

export function parseOpenAPI(raw: string): ParsedSchema {
  let doc: OpenAPIDocument;
  try {
    doc = JSON.parse(raw);
  } catch {
    throw new Error("Invalid OpenAPI JSON document");
  }

  if (!doc.openapi && !doc.swagger) {
    throw new Error("Not a valid OpenAPI document: missing openapi/swagger version");
  }

  const baseUrl = doc.servers?.[0]?.url || "http://localhost:3000/api/sandbox";
  const schemas: Record<string, SchemaType> = {};
  if (doc.components?.schemas) {
    for (const [name, schema] of Object.entries(doc.components.schemas)) {
      schemas[name] = parseSchemaType(schema, doc);
    }
  }

  const endpoints: SchemaEndpoint[] = [];
  if (doc.paths) {
    for (const [path, methods] of Object.entries(doc.paths)) {
      if (!methods) continue;
      for (const [method, operation] of Object.entries(methods as Record<string, unknown>)) {
        const op = operation as Record<string, unknown>;
        if (!op) continue;

        const pathParams = extractPathParams(path);

        endpoints.push({
          method: method.toUpperCase() as SchemaEndpoint["method"],
          path,
          operationId: op.operationId as string | undefined,
          summary: op.summary as string | undefined,
          description: op.description as string | undefined,
          tags: op.tags as string[] | undefined,
          parameters: [
            ...parseParameters((op.parameters as unknown[]) || [], doc),
            ...pathParams.map((name): SchemaParameter => ({
              name,
              in: "path",
              required: true,
              schema: { type: "string" },
            })),
          ],
          requestBody: op.requestBody
            ? {
                required: ((op.requestBody as Record<string, unknown>).required as boolean) || false,
                content: Object.fromEntries(
                  Object.entries(
                    ((op.requestBody as Record<string, unknown>).content as Record<string, unknown>) || {}
                  ).map(([ct, c]) => [
                    ct,
                    { schema: parseSchemaType((c as Record<string, unknown>).schema, doc) },
                  ])
                ),
              }
            : undefined,
          responses: Object.fromEntries(
            Object.entries((op.responses as Record<string, unknown>) || {}).map(([code, r]) => {
              const resp = r as Record<string, unknown>;
              const content = resp.content as Record<string, unknown> | undefined;
              return [
                code,
                {
                  description: (resp.description as string) || "",
                  content: content
                    ? Object.fromEntries(
                        Object.entries(content).map(([ct, c]) => [
                          ct,
                          { schema: parseSchemaType((c as Record<string, unknown>).schema, doc) },
                        ])
                      )
                    : undefined,
                },
              ];
            })
          ),
          security: op.security as Array<Record<string, string[]>> | undefined,
          deprecated: op.deprecated as boolean | undefined,
        });
      }
    }
  }

  const securitySchemes = doc.components?.securitySchemes as Record<string, {
    type: string;
    description?: string;
    scheme?: string;
    bearerFormat?: string;
  }> | undefined;

  return {
    type: "openapi",
    version: doc.openapi || doc.swagger || "3.0.0",
    title: doc.info.title,
    description: doc.info.description,
    baseUrl,
    endpoints,
    schemas,
    securitySchemes,
  };
}
