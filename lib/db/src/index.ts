import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let dbInstance: any;
let poolInstance: any;

function createMemoryDb() {
  const tables: Record<string, any[]> = {};
  
  function getTableName(table: any): string {
    if (table && table._ && table._.name) return table._.name;
    if (table && table.tableName) return table.tableName;
    return "table_" + Math.random().toString(36).substr(2, 9);
  }
  
  function extractConditions(cond: any): Array<{ key: string; op: string; value: any }> {
    const results: Array<{ key: string; op: string; value: any }> = [];
    
    function parse(obj: any) {
      if (!obj || typeof obj !== "object") return;
      
      if (obj._ && obj._.op) {
        const col = obj._.column || obj._.columns?.[0];
        if (col && col.name) {
          results.push({
            key: col.name,
            op: obj._.op,
            value: obj._.value,
          });
        }
      }
      
      if (obj.and) {
        obj.and.forEach(parse);
      }
    }
    
    parse(cond);
    return results;
  }
  
  function matchConditions(record: any, conditions: Array<{ key: string; op: string; value: any }>): boolean {
    return conditions.every(({ key, op, value }) => {
      const recordValue = record[key];
      switch (op) {
        case "eq": return recordValue === value;
        case "ne": return recordValue !== value;
        case "gte": return recordValue >= value;
        case "lte": return recordValue <= value;
        default: return true;
      }
    });
  }
  
  return {
    select: () => ({
      from: (table: any) => {
        const tableName = getTableName(table);
        let conditions: Array<{ key: string; op: string; value: any }> = [];
        let orderByField: string | null = null;
        let orderByDesc: boolean = false;
        let limitNum: number | null = null;
        
        return {
          orderBy: (...args: any[]) => {
            try {
              const fieldFn = args[0];
              const result = fieldFn(table);
              if (result && result._ && result._.column && result._.column.name) {
                orderByField = result._.column.name;
                orderByDesc = args.length > 1 && typeof args[1] === "object" && args[1].direction === "desc";
              }
            } catch {}
            return this;
          },
          where: (cond: any) => {
            conditions = extractConditions(cond);
            return this;
          },
          limit: (n: number) => {
            limitNum = n;
            return this;
          },
          all: async () => {
            let records = tables[tableName] || [];
            records = records.filter((r) => matchConditions(r, conditions));
            
            if (orderByField) {
              records.sort((a, b) => {
                const aVal = a[orderByField!];
                const bVal = b[orderByField!];
                const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return orderByDesc ? -result : result;
              });
            }
            
            if (limitNum !== null) {
              records = records.slice(0, limitNum);
            }
            
            return records;
          },
        };
      },
    }),
    
    insert: (table: any) => ({
      values: async (values: any) => {
        const tableName = getTableName(table);
        if (!tables[tableName]) tables[tableName] = [];
        
        const now = new Date();
        const record = {
          ...values,
          id: Date.now(),
          createdAt: now,
          connectedAt: now,
          detectedAt: now,
          completedAt: null,
          resolvedAt: null,
        };
        
        tables[tableName].push(record);
        return [record];
      },
    }),
    
    update: (table: any) => ({
      set: (updates: any) => ({
        where: (cond: any) => {
          const tableName = getTableName(table);
          const conditions = extractConditions(cond);
          
          return {
            returning: async () => {
              const records = tables[tableName] || [];
              const matched = records.filter((r) => matchConditions(r, conditions));
              matched.forEach((r) => Object.assign(r, updates));
              return matched;
            },
          };
        },
      }),
    }),
    
    delete: (table: any) => ({
      where: (cond: any) => {
        const tableName = getTableName(table);
        const conditions = extractConditions(cond);
        
        return {
          returning: async () => {
            const records = tables[tableName] || [];
            const matched = records.filter((r) => matchConditions(r, conditions));
            tables[tableName] = records.filter((r) => !matched.includes(r));
            return matched;
          },
        };
      },
    }),
  };
}

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set, using in-memory storage fallback");
  dbInstance = createMemoryDb();
} else {
  poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
  dbInstance = drizzle(poolInstance, { schema });
}

export const pool = poolInstance;
export const db = dbInstance;

export * from "./schema";