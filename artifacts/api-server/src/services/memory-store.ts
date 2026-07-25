const store: Record<string, any[]> = {};

export function getTable(tableName: string): any[] {
  if (!store[tableName]) {
    store[tableName] = [];
  }
  return store[tableName];
}

export function insert(tableName: string, data: any): any {
  const table = getTable(tableName);
  const now = new Date();
  const record = {
    ...data,
    id: Date.now() + Math.random(),
    createdAt: now,
    connectedAt: now,
    detectedAt: now,
    completedAt: null,
    resolvedAt: null,
  };
  table.push(record);
  return record;
}

export function findOne(tableName: string, conditions: Record<string, any>): any | undefined {
  const table = getTable(tableName);
  return table.find((record) => {
    return Object.entries(conditions).every(([key, value]) => record[key] === value);
  });
}

export function findAll(tableName: string, conditions?: Record<string, any>): any[] {
  let table = getTable(tableName);
  if (conditions) {
    table = table.filter((record) => {
      return Object.entries(conditions).every(([key, value]) => record[key] === value);
    });
  }
  return [...table].sort((a, b) => (b.detectedAt || b.createdAt) - (a.detectedAt || a.createdAt));
}

export function update(tableName: string, conditions: Record<string, any>, updates: any): any[] {
  const table = getTable(tableName);
  const matched = table.filter((record) => {
    return Object.entries(conditions).every(([key, value]) => record[key] === value);
  });
  matched.forEach((record) => {
    Object.assign(record, updates);
  });
  return matched;
}

export function remove(tableName: string, conditions: Record<string, any>): any[] {
  const table = getTable(tableName);
  const matched = table.filter((record) => {
    return Object.entries(conditions).every(([key, value]) => record[key] === value);
  });
  store[tableName] = table.filter((record) => !matched.includes(record));
  return matched;
}

export function count(tableName: string, conditions?: Record<string, any>): number {
  return findAll(tableName, conditions).length;
}