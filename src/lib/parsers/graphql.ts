import { ParsedSchema, SchemaEndpoint, SchemaType } from "../types";

interface GQLField {
  name: string;
  type: string;
  isList: boolean;
  isNonNull: boolean;
  args?: GQLArgument[];
}

interface GQLArgument {
  name: string;
  type: string;
  isNonNull: boolean;
}

interface GQLType {
  name: string;
  kind: "OBJECT" | "SCALAR" | "ENUM" | "INPUT_OBJECT" | "UNION" | "INTERFACE";
  fields?: GQLField[];
  enumValues?: string[];
  inputFields?: GQLField[];
}

interface ParsedSDL {
  types: GQLType[];
  queries: GQLField[];
  mutations: GQLField[];
}

function tokenize(sdl: string): string[] {
  const tokens: string[] = [];
  const regex = /("(?:[^"\\]|\\.)*"|#.*|[\w]+|[{}():\[\]!,=@$&|]|\s+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sdl)) !== null) {
    if (!match[1].startsWith("#") && match[1].trim()) {
      tokens.push(match[1]);
    }
  }
  return tokens;
}

function parseSDL(sdl: string): ParsedSDL {
  const tokens = tokenize(sdl);
  let i = 0;
  const types: GQLType[] = [];
  const queries: GQLField[] = [];
  const mutations: GQLField[] = [];

  function peek(): string | undefined { return tokens[i]; }
  function consume(): string { return tokens[i++] || ""; }
  function expect(expected: string): string {
    const t = consume();
    if (t !== expected) throw new Error(`Expected "${expected}" but got "${t}" at token ${i}`);
    return t;
  }

  function parseTypeRef(): { type: string; isList: boolean; isNonNull: boolean } {
    let isList = false;
    let isNonNull = false;
    if (peek() === "[") { consume(); isList = true; }
    const typeName = consume();
    if (isList) { expect("]"); }
    if (peek() === "!") { consume(); isNonNull = true; }
    return { type: typeName, isList, isNonNull };
  }

  function parseField(): GQLField {
    const name = consume();
    const args: GQLArgument[] = [];
    if (peek() === "(") {
      consume();
      while (peek() && peek() !== ")") {
        const argName = consume();
        expect(":");
        const typeRef = parseTypeRef();
        args.push({ name: argName, type: typeRef.type, isNonNull: typeRef.isNonNull });
      }
      expect(")");
    }
    expect(":");
    const typeRef = parseTypeRef();
    return { name, type: typeRef.type, isList: typeRef.isList, isNonNull: typeRef.isNonNull, args: args.length > 0 ? args : undefined };
  }

  while (i < tokens.length) {
    const t = peek();
    if (!t) break;

    if (t === "type") {
      consume();
      const name = consume();
      const fields: GQLField[] = [];
      if (peek() === "implements" || peek() === "{" ) {
        while (peek() === "implements") { consume(); consume(); }
        expect("{");
        while (peek() && peek() !== "}") {
          fields.push(parseField());
        }
        expect("}");
      }
      types.push({ name, kind: "OBJECT", fields });
    } else if (t === "input") {
      consume();
      const name = consume();
      expect("{");
      const inputFields: GQLField[] = [];
      while (peek() && peek() !== "}") {
        const fieldName = consume();
        expect(":");
        const typeRef = parseTypeRef();
        inputFields.push({ name: fieldName, type: typeRef.type, isList: typeRef.isList, isNonNull: typeRef.isNonNull });
      }
      expect("}");
      types.push({ name, kind: "INPUT_OBJECT", inputFields });
    } else if (t === "enum") {
      consume();
      const name = consume();
      expect("{");
      const enumValues: string[] = [];
      while (peek() && peek() !== "}") {
        enumValues.push(consume());
      }
      expect("}");
      types.push({ name, kind: "ENUM", enumValues });
    } else if (t === "scalar") {
      consume();
      types.push({ name: consume(), kind: "SCALAR" });
    } else if (t === "union") {
      consume();
      types.push({ name: consume(), kind: "UNION" });
    } else if (t === "interface") {
      consume();
      const name = consume();
      expect("{");
      const fields: GQLField[] = [];
      while (peek() && peek() !== "}") fields.push(parseField());
      expect("}");
      types.push({ name, kind: "INTERFACE", fields });
    } else if (t === "type" && peek() === "Query") {
      // handled above
    } else if (t === "schema") {
      consume();
      expect("{");
      while (peek() && peek() !== "}") {
        const kw = consume();
        expect(":");
        // skip for now
        consume();
      }
      expect("}");
    } else if (t === "extend" || t === "directive") {
      // skip extensions and directives
      consume();
      while (peek() && peek() !== "{" && peek() !== "on") consume();
      if (peek() === "{") { consume(); let depth = 1; while (depth > 0 && i < tokens.length) { const c = consume(); if (c === "{") depth++; if (c === "}") depth--; } }
    } else if (t === "Query" || t === "Mutation") {
      const kw = consume();
      expect("{");
      const list = kw === "Mutation" ? mutations : queries;
      while (peek() && peek() !== "}") {
        list.push(parseField());
      }
      expect("}");
    } else {
      consume(); // skip unknown
    }
  }

  return { types, queries, mutations };
}

function gqlTypeToSchema(field: GQLField, gqlTypes: GQLType[]): SchemaType {
  const gqlToSchema: Record<string, string> = {
    String: "string", Int: "integer", Float: "number", Boolean: "boolean", ID: "string",
  };

  const baseType = gqlToSchema[field.type];
  if (baseType) {
    let result: SchemaType = { type: baseType };
    if (field.isList) result = { type: "array", items: result };
    return result;
  }

  const customType = gqlTypes.find((t) => t.name === field.type);
  if (customType?.kind === "ENUM") {
    let result: SchemaType = { type: "string", enum: customType.enumValues };
    if (field.isList) result = { type: "array", items: result };
    return result;
  }

  if (customType?.kind === "INPUT_OBJECT" && customType.inputFields && customType.inputFields.length > 0) {
    const properties: Record<string, SchemaType> = {};
    const required: string[] = [];
    for (const f of customType.inputFields) {
      properties[f.name] = gqlTypeToSchema(f, gqlTypes);
      if (f.isNonNull) required.push(f.name);
    }
    let result: SchemaType = { type: "object", properties, required };
    if (field.isList) result = { type: "array", items: result };
    return result;
  }

  let result: SchemaType = { type: "object" };
  if (field.isList) result = { type: "array", items: result };
  return result;
}

export function parseGraphQL(sdl: string): ParsedSchema {
  const parsed = parseSDL(sdl);
  const schemas: Record<string, SchemaType> = {};

  for (const t of parsed.types) {
    if (t.kind === "OBJECT" && t.fields) {
      const properties: Record<string, SchemaType> = {};
      for (const f of t.fields) {
        properties[f.name] = gqlTypeToSchema(f, parsed.types);
      }
      schemas[t.name] = { type: "object", properties };
    }
    if (t.kind === "INPUT_OBJECT" && t.inputFields) {
      const properties: Record<string, SchemaType> = {};
      for (const f of t.inputFields) {
        properties[f.name] = gqlTypeToSchema(f, parsed.types);
      }
      schemas[t.name] = { type: "object", properties };
    }
    if (t.kind === "ENUM") {
      schemas[t.name] = { type: "string", enum: t.enumValues };
    }
  }

  function buildEndpoints(fields: GQLField[], prefix: string): SchemaEndpoint[] {
    return fields.map((f) => {
      const args = f.args || [];
      return {
        method: "POST" as const,
        path: `/${prefix}/${f.name}`,
        operationId: `${prefix}_${f.name}`,
        summary: `${prefix} ${f.name}`,
        parameters: [],
        requestBody: args.length > 0
          ? {
              required: args.some((a) => a.isNonNull),
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: Object.fromEntries(
                      args.map((a) => [a.name, gqlTypeToSchema({ name: a.name, type: a.type, isList: false, isNonNull: a.isNonNull }, parsed.types)])
                    ),
                    required: args.filter((a) => a.isNonNull).map((a) => a.name),
                  },
                },
              },
            }
          : undefined,
        responses: {
          "200": {
            description: `Result of ${f.name}`,
            content: { "application/json": { schema: gqlTypeToSchema(f, parsed.types) } },
          },
        },
      };
    });
  }

  const endpoints: SchemaEndpoint[] = [
    ...buildEndpoints(parsed.queries, "query"),
    ...buildEndpoints(parsed.mutations, "mutation"),
  ];

  return {
    type: "graphql",
    version: "1.0",
    title: "GraphQL Schema",
    description: "Auto-generated from GraphQL SDL",
    baseUrl: "/api/sandbox",
    endpoints,
    schemas,
  };
}
