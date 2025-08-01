// Type declarations for missing libraries
declare module 'next/server' {
  export class NextRequest extends Request {
    nextUrl: URL;
    geo: {
      city?: string;
      country?: string;
      region?: string;
    };
    ip?: string;
    cookies: Map<string, string>;
  }

  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: ResponseInit): NextResponse;
    static rewrite(destination: string | URL, init?: ResponseInit): NextResponse;
    static next(init?: ResponseInit): NextResponse;
  }
}

declare module 'sqlite3' {
  export const OPEN_READONLY: number;
  export const OPEN_READWRITE: number;
  export const OPEN_CREATE: number;
  export const OPEN_URI: number;

  export class Database {
    constructor(filename: string, mode?: number, callback?: (err: Error | null) => void);
    run(sql: string, params?: any, callback?: (this: { lastID: number, changes: number }, err: Error | null) => void): this;
    get(sql: string, params?: any, callback?: (err: Error | null, row: any) => void): this;
    all(sql: string, params?: any, callback?: (err: Error | null, rows: any[]) => void): this;
    each(sql: string, params?: any, callback?: (err: Error | null, row: any) => void, complete?: (err: Error | null, count: number) => void): this;
    exec(sql: string, callback?: (err: Error | null) => void): this;
    prepare(sql: string, params?: any, callback?: (err: Error | null) => void): Statement;
    close(callback?: (err: Error | null) => void): void;
    serialize(callback: () => void): void;
    parallelize(callback: () => void): void;
  }

  export class Statement {
    bind(params: any, callback?: (err: Error | null) => void): this;
    reset(callback?: (err: Error | null) => void): this;
    finalize(callback?: (err: Error | null) => void): this;
    run(params?: any, callback?: (err: Error | null) => void): this;
    get(params?: any, callback?: (err: Error | null, row: any) => void): this;
    all(params?: any, callback?: (err: Error | null, rows: any[]) => void): this;
    each(params?: any, callback?: (err: Error | null, row: any) => void, complete?: (err: Error | null, count: number) => void): this;
  }
}

declare module 'sqlite' {
  export interface Database {
    exec(sql: string): Promise<void>;
    all<T = any>(sql: string, params?: any): Promise<T[]>;
    get<T = any>(sql: string, params?: any): Promise<T | undefined>;
    run(sql: string, params?: any): Promise<{ lastID: number, changes: number }>;
    close(): Promise<void>;
  }

  export interface OpenOptions {
    filename: string;
    driver: any;
    mode?: number;
  }

  export function open(options: OpenOptions): Promise<Database>;
}
