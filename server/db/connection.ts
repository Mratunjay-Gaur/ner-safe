import 'dotenv/config';
import mongoose from 'mongoose';

let connectPromise: Promise<mongoose.Connection | null> | null = null;
let lastMongoError: string | null = null;
let currentPublicIp = '34.34.254.159';

// Dynamically retrieve container egress IP for precise diagnostic instructions
(async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data?.ip) {
        currentPublicIp = data.ip;
      }
    }
  } catch {
    // Retain default container IP
  }
})();

/**
 * Checks if MongoDB connection is ready (readyState === 1)
 */
export function isMongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getLastMongoError(): string | null {
  return lastMongoError;
}

export function getPublicEgressIp(): string {
  return currentPublicIp;
}

/**
 * Extracts the Atlas cluster hostname without credentials for safe logging and diagnostics
 */
export function getCleanAtlasHost(): string {
  try {
    const raw = process.env.MONGODB_URI;
    if (!raw) return 'unconfigured';
    const match = raw.match(/@([^/?#]+)/);
    if (match && match[1]) {
      return match[1];
    }
    const parsed = new URL(raw.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
    return parsed.host || 'cluster0.k3h9twe.mongodb.net';
  } catch {
    return 'cluster0.k3h9twe.mongodb.net';
  }
}

/**
 * Resolves and strictly sanitizes the target database name to 'NER-SAFE'.
 * Handles cases where the runtime environment has MONGODB_DB_NAME populated with the full URI.
 */
export function getTargetDbName(): string {
  let db = (process.env.MONGODB_DB_NAME || '').trim();

  // If MONGODB_DB_NAME was mistakenly populated with the full URI string
  if (db.startsWith('mongodb://') || db.startsWith('mongodb+srv://')) {
    try {
      const parsed = new URL(db.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
      db = parsed.pathname.replace(/^\//, '').split('?')[0];
    } catch {
      db = '';
    }
  }

  // If still empty or not a simple name, inspect MONGODB_URI
  if (!db && process.env.MONGODB_URI) {
    try {
      const parsed = new URL(process.env.MONGODB_URI.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
      db = parsed.pathname.replace(/^\//, '').split('?')[0];
    } catch {
      db = '';
    }
  }

  const resolved = db && !db.includes('://') ? db : 'NER-SAFE';
  // Mutate process.env.MONGODB_DB_NAME so downstream modules see the exact sanitized db name
  process.env.MONGODB_DB_NAME = resolved;
  return resolved;
}

/**
 * Returns safe MongoDB diagnostics without leaking credentials
 */
export function getMongoStatus(): {
  readyState: number;
  status: 'connected' | 'connecting' | 'disconnected';
  host: string;
  dbName: string;
  collectionName: string;
  atlasConnected: boolean;
  publicIp: string;
  lastError: string | null;
} {
  const ready = mongoose.connection.readyState;
  let status: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  if (ready === 1) status = 'connected';
  else if (ready === 2) status = 'connecting';
  else if (ready === 0) status = 'disconnected';

  const cleanHost = getCleanAtlasHost();
  const dbName = mongoose.connection.name || getTargetDbName();

  return {
    readyState: ready,
    status,
    host: cleanHost,
    dbName,
    collectionName: 'incidents',
    atlasConnected: ready === 1,
    publicIp: currentPublicIp,
    lastError: lastMongoError,
  };
}

/**
 * Establishes direct connection to MongoDB Atlas database 'NER-SAFE'.
 * Strictly connects to MongoDB Atlas without local storage or mock fallbacks.
 */
export async function getMongoConnection(): Promise<mongoose.Connection> {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    const conn = await connectPromise;
    if (conn && (conn.readyState as number) === 1) {
      return conn;
    }
  }

  connectPromise = (async () => {
    const mongoUri = process.env.MONGODB_URI;
    const cleanHost = getCleanAtlasHost();
    const targetDb = getTargetDbName();

    if (!mongoUri) {
      const err = 'MONGODB_URI environment variable is not defined.';
      lastMongoError = err;
      throw new Error(err);
    }

    console.log(`[MongoDB-Atlas] Connecting directly to MongoDB Atlas host="${cleanHost}", db="${targetDb}"...`);

    try {
      await mongoose.connect(mongoUri, {
        dbName: targetDb,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      lastMongoError = null;
      console.log(`[MongoDB-Atlas] Connected successfully to MongoDB Atlas! host="${cleanHost}", db="${mongoose.connection.name}"`);
      return mongoose.connection;
    } catch (atlasErr: any) {
      const isWhitelistError =
        atlasErr.message?.includes('SSL alert number 80') ||
        atlasErr.message?.includes('tlsv1 alert internal error') ||
        atlasErr.message?.includes('Could not connect to any servers');

      let detailedMsg = `MongoDB Atlas notice for host="${cleanHost}", db="${targetDb}": ${atlasErr.message}`;
      if (isWhitelistError) {
        detailedMsg += ` (Cluster pending IP access: Add 0.0.0.0/0 or IP ${currentPublicIp} to Atlas Network Access)`;
      }
      lastMongoError = detailedMsg;
      console.warn(`[MongoDB-Atlas] ${detailedMsg}`);
      startAtlasAutoRetry();
      throw new Error(detailedMsg);
    }
  })();

  try {
    const result = await connectPromise;
    return result!;
  } finally {
    connectPromise = null;
  }
}

let retryIntervalStarted = false;
function startAtlasAutoRetry() {
  if (retryIntervalStarted) return;
  retryIntervalStarted = true;

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) return;

  const targetDb = getTargetDbName();

  // Poll quietly every 10 seconds so the cluster connects immediately once IP access is updated
  const timer = setInterval(async () => {
    if (mongoose.connection.readyState === 1) {
      clearInterval(timer);
      retryIntervalStarted = false;
      return;
    }

    try {
      await mongoose.connect(mongoUri, {
        dbName: targetDb,
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      });
      lastMongoError = null;
      console.log(`[MongoDB-Atlas] Successfully connected to MongoDB Atlas on retry! db="${targetDb}"`);
      clearInterval(timer);
      retryIntervalStarted = false;
    } catch (err: any) {
      // Atlas still awaiting network access update
    }
  }, 10000);
}

/**
 * Non-blocking check to see if MongoDB Atlas connection is active or can be quickly obtained.
 * Never blocks the calling HTTP request for multiple seconds.
 */
export async function tryMongoConnect(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) {
    return true;
  }
  if (connectPromise) {
    try {
      const winner = await Promise.race([
        connectPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 150)),
      ]);
      if (winner && (winner.readyState as number) === 1) {
        return true;
      }
    } catch {
      return false;
    }
  } else {
    // Initiate connection asynchronously in the background
    getMongoConnection().catch(() => {});
  }
  return (mongoose.connection.readyState as number) === 1;
}

export class DatabaseUnavailableError extends Error {
  statusCode: number;
  constructor(message?: string) {
    super(message || 'Database is currently unavailable. Please verify MongoDB connection.');
    this.name = 'DatabaseUnavailableError';
    this.statusCode = 503;
  }
}

/**
 * Ensures MongoDB Atlas is connected before executing any database operation.
 * Throws DatabaseUnavailableError (503) if Atlas is not reachable.
 */
export async function ensureMongoConnected(): Promise<mongoose.Connection> {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If currently in connecting state (readyState 2), wait briefly for it to settle
  if (mongoose.connection.readyState === 2) {
    await new Promise<void>((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (mongoose.connection.readyState !== 2 || Date.now() - start > 3500) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
    if ((mongoose.connection.readyState as number) === 1) {
      return mongoose.connection;
    }
  }

  try {
    const conn = await getMongoConnection();
    if (!conn || (conn.readyState as number) !== 1) {
      throw new Error(
        lastMongoError || 'MongoDB connection did not reach ready state (readyState != 1).'
      );
    }
    return conn;
  } catch (err: any) {
    throw new DatabaseUnavailableError(
      `Database is currently unavailable. Could not connect to MongoDB: ${err.message}`
    );
  }
}
