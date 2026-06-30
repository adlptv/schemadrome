import { SandboxCollection, SandboxResource, ParsedSchema, SchemaEndpoint } from "../types";
import { nanoid } from "nanoid";

interface StateStore {
  collections: Map<string, SandboxCollection>;
  schemas: Map<string, ParsedSchema>;
}

class SandboxStateEngine {
  private store: StateStore;
  private idCounter = 0;

  constructor() {
    this.store = {
      collections: new Map(),
      schemas: new Map(),
    };
  }

  loadSchema(schemaId: string, schema: ParsedSchema): void {
    this.store.schemas.set(schemaId, schema);
    for (const endpoint of schema.endpoints) {
      const resourceName = this.extractResourceName(endpoint);
      if (resourceName && !this.store.collections.has(`${schemaId}:${resourceName}`)) {
        this.store.collections.set(`${schemaId}:${resourceName}`, {
          name: resourceName,
          resources: [],
          schema: this.getResourceSchema(schema, resourceName),
        });
      }
    }
  }

  private extractResourceName(endpoint: SchemaEndpoint): string {
    const parts = endpoint.path.split("/").filter(Boolean);
    // Find the first non-parameter segment that could be a resource name
    for (const part of parts) {
      if (!part.startsWith("{") && !part.startsWith(":")) {
        return part;
      }
    }
    return "default";
  }

  private getResourceSchema(schema: ParsedSchema, resourceName: string) {
    const schemaName = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
    const singular = resourceName.endsWith("s") ? resourceName.slice(0, -1) : resourceName;
    const schemaNameSingular = singular.charAt(0).toUpperCase() + singular.slice(1);
    return (
      schema.schemas[schemaName] ||
      schema.schemas[schemaNameSingular] ||
      schema.schemas[resourceName] ||
      { type: "object" }
    );
  }

  getCollection(schemaId: string, resourceName: string): SandboxCollection | undefined {
    return this.store.collections.get(`${schemaId}:${resourceName}`);
  }

  getOrCreateCollection(schemaId: string, resourceName: string, schema?: ParsedSchema): SandboxCollection {
    const key = `${schemaId}:${resourceName}`;
    if (!this.store.collections.has(key)) {
      const s = schema || this.store.schemas.get(schemaId);
      this.store.collections.set(key, {
        name: resourceName,
        resources: [],
        schema: s ? this.getResourceSchema(s, resourceName) : { type: "object" },
      });
    }
    return this.store.collections.get(key)!;
  }

  listResources(schemaId: string, resourceName: string, filters?: Record<string, string>): SandboxResource[] {
    const collection = this.getCollection(schemaId, resourceName);
    if (!collection) return [];

    if (!filters || Object.keys(filters).length === 0) {
      return collection.resources;
    }

    return collection.resources.filter((r) =>
      Object.entries(filters).every(([key, value]) => r.data[key] === value || String(r.data[key]) === value)
    );
  }

  getResource(schemaId: string, resourceName: string, id: string): SandboxResource | undefined {
    const collection = this.getCollection(schemaId, resourceName);
    if (!collection) return undefined;
    return collection.resources.find((r) => r.id === id);
  }

  createResource(schemaId: string, resourceName: string, data: Record<string, unknown>): SandboxResource {
    const collection = this.getOrCreateCollection(schemaId, resourceName);
    const now = new Date().toISOString();
    const resource: SandboxResource = {
      id: nanoid(12),
      type: resourceName,
      data: { id: nanoid(12), ...data },
      createdAt: now,
      updatedAt: now,
    };
    collection.resources.push(resource);
    return resource;
  }

  updateResource(schemaId: string, resourceName: string, id: string, data: Record<string, unknown>): SandboxResource | null {
    const collection = this.getCollection(schemaId, resourceName);
    if (!collection) return null;
    const index = collection.resources.findIndex((r) => r.id === id);
    if (index === -1) return null;
    collection.resources[index] = {
      ...collection.resources[index],
      data: { ...collection.resources[index].data, ...data, id: collection.resources[index].data.id },
      updatedAt: new Date().toISOString(),
    };
    return collection.resources[index];
  }

  deleteResource(schemaId: string, resourceName: string, id: string): boolean {
    const collection = this.getCollection(schemaId, resourceName);
    if (!collection) return false;
    const index = collection.resources.findIndex((r) => r.id === id);
    if (index === -1) return false;
    collection.resources.splice(index, 1);
    return true;
  }

  findRelatedResources(
    schemaId: string,
    parentResource: string,
    parentId: string,
    childResource: string
  ): SandboxResource[] {
    const collection = this.getCollection(schemaId, childResource);
    if (!collection) return [];

    const parentSingular = parentResource.endsWith("s") ? parentResource.slice(0, -1) : parentResource;
    const fkField = `${parentSingular}Id`;

    return collection.resources.filter((r) => {
      const data = r.data as Record<string, unknown>;
      return data[fkField] === parentId || data[`${parentSingular}_id`] === parentId;
    });
  }

  getSchema(schemaId: string): ParsedSchema | undefined {
    return this.store.schemas.get(schemaId);
  }

  getAllSchemas(): ParsedSchema[] {
    return Array.from(this.store.schemas.values());
  }

  clear(schemaId?: string): void {
    if (schemaId) {
      this.store.schemas.delete(schemaId);
      for (const key of this.store.collections.keys()) {
        if (key.startsWith(`${schemaId}:`)) {
          this.store.collections.delete(key);
        }
      }
    } else {
      this.store.collections.clear();
      this.store.schemas.clear();
    }
  }

  getStats(schemaId: string): { collections: number; totalResources: number } {
    let collections = 0;
    let totalResources = 0;
    for (const [key, collection] of this.store.collections) {
      if (key.startsWith(`${schemaId}:`)) {
        collections++;
        totalResources += collection.resources.length;
      }
    }
    return { collections, totalResources };
  }
}

export const sandboxState = new SandboxStateEngine();
