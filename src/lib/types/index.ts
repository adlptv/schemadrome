import { z } from "zod";

export const HttpMethod = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
export type HttpMethod = z.infer<typeof HttpMethod>;

export const ParameterLocation = z.enum(["path", "query", "header", "cookie"]);
export type ParameterLocation = z.infer<typeof ParameterLocation>;

export interface SchemaParameter {
  name: string;
  in: ParameterLocation;
  required: boolean;
  schema: SchemaType;
  description?: string;
}

export interface SchemaType {
  type: string;
  format?: string;
  items?: SchemaType;
  properties?: Record<string, SchemaType>;
  required?: string[];
  enum?: unknown[];
  $ref?: string;
  oneOf?: SchemaType[];
  allOf?: SchemaType[];
  anyOf?: SchemaType[];
  nullable?: boolean;
  default?: unknown;
  example?: unknown;
  description?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  uniqueItems?: boolean;
  additionalProperties?: boolean | SchemaType;
}

export interface SchemaEndpoint {
  method: HttpMethod;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters: SchemaParameter[];
  requestBody?: {
    required: boolean;
    content: Record<string, { schema: SchemaType }>;
  };
  responses: Record<string, {
    description: string;
    content?: Record<string, { schema: SchemaType }>;
  }>;
  security?: Array<Record<string, string[]>>;
  deprecated?: boolean;
}

export interface ParsedSchema {
  type: "openapi" | "graphql";
  version: string;
  title: string;
  description?: string;
  baseUrl: string;
  endpoints: SchemaEndpoint[];
  schemas: Record<string, SchemaType>;
  securitySchemes?: Record<string, {
    type: string;
    description?: string;
    scheme?: string;
    bearerFormat?: string;
  }>;
}

export interface SandboxResource {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  relationships?: Record<string, string | string[]>;
}

export interface SandboxCollection {
  name: string;
  resources: SandboxResource[];
  schema: SchemaType;
}

export interface ScenarioStep {
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  expectedStatus: number;
  description?: string;
  extractVariables?: Record<string, string>;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  schemaId: string;
  steps: ScenarioStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  timing: number;
  size: number;
}

export interface ConstraintRule {
  field: string;
  type: "unique" | "range" | "pattern" | "reference" | "enum" | "email" | "url" | "date";
  value?: unknown;
  params?: Record<string, unknown>;
}

export type SchemaImportFormat = "openapi-yaml" | "openapi-json" | "graphql-sdl";
