import { DatabaseSync } from 'node:sqlite';

export interface D1RunResultLike {
  meta?: { changes?: number };
}

class SQLiteD1Statement {
  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): SQLiteD1Statement {
    return new SQLiteD1Statement(this.database, this.sql, values);
  }

  async run(): Promise<D1RunResultLike> {
    const result = this.database.prepare(this.sql).run(...this.values as never[]);
    return { meta: { changes: Number(result.changes) } };
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const row = this.database.prepare(this.sql).get(...this.values as never[]);
    return row === undefined ? null : row as T;
  }
}

export class SQLiteD1Database {
  private readonly database: DatabaseSync;

  constructor(filename = ':memory:') {
    this.database = new DatabaseSync(filename);
  }

  prepare(sql: string): SQLiteD1Statement {
    return new SQLiteD1Statement(this.database, sql);
  }

  exec(sql: string): void {
    this.database.exec(sql);
  }

  close(): void {
    this.database.close();
  }
}
