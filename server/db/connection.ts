import mongoose from 'mongoose';

let connectPromise: Promise<mongoose.Connection | null> | null = null;
let lastMongoError: string | null = null;
let lastAttemptTime = 0;
const RETRY_COOLDOWN_MS = 15000;

export function getLastMongoError(): string | null {
  return lastMongoError;
}

/**
 * Checks if MongoDB Atlas connection is ready (readyState === 1)
 */
export function isMongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Extracts the Atlas cluster hostname without credentials for safe diagnostics
 */
export function getCleanAtlasHost(): string {
  try {
    const raw = process.env.MONGODB_URI;
    if (!raw) return 'unconfigured';
    // If it is an SRV URI: mongodb+srv://<user>:<pass>@cluster0.k3h9twe.mongodb.net/...
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
 * Returns safe MongoDB diagnostics without leaking credentials
 */
export function getMongoStatus(): {
  readyState: number;
  status: 'connected' | 'connecting' | 'disconnected';
  host: string;
  dbName: string;
  collectionName: string;
  atlasConnected: boolean;
  lastError: string | null;
} {
  const ready = mongoose.connection.readyState;
  let status: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  if (ready === 1) status = 'connected';
  else if (ready === 2) status = 'connecting';
  else if (ready === 0) status = 'disconnected';

  const cleanHost = (ready === 1 && mongoose.connection.host) ? mongoose.connection.host : getCleanAtlasHost();

  return {
    readyState: ready,
    status,
    host: cleanHost,
    dbName: mongoose.connection.name || 'test',
    collectionName: 'users',
    atlasConnected: ready === 1,
    lastError: lastMongoError,
  };
}

/**
 * Connects exclusively to the real MongoDB Atlas database from MONGODB_URI.
 * NO in-memory or local MongoDB fallback is used.
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

  // If we recently failed within cooldown window, throw the cached error without re-blocking
  const now = Date.now();
  if (lastMongoError && now - lastAttemptTime < RETRY_COOLDOWN_MS) {
    throw new Error(`MongoDB Atlas connection failure (${getCleanAtlasHost()}): ${lastMongoError}`);
  }

  connectPromise = (async () => {
    lastAttemptTime = Date.now();
    const mongoUri = process.env.MONGODB_URI;
    const cleanHost = getCleanAtlasHost();

    if (!mongoUri) {
      lastMongoError = 'MONGODB_URI environment variable is not set.';
      console.warn(`[MongoDB-Atlas] ${lastMongoError}`);
      throw new Error(lastMongoError);
    }

    console.log(`[MongoDB-Atlas] Connecting to MongoDB Atlas cluster (${cleanHost}), database: test...`);

    try {
      await mongoose.connect(mongoUri, {
        dbName: 'test',
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 4000,
      });

      lastMongoError = null;
      console.log(`[MongoDB-Atlas] Connected successfully to Atlas! Host: ${mongoose.connection.host}, DB: ${mongoose.connection.name}`);
      return mongoose.connection;
    } catch (err: any) {
      lastMongoError = err.message || 'Failed to establish connection to Atlas';
      console.warn(`[MongoDB-Atlas] Connection notice for ${cleanHost}: ${lastMongoError}`);
      throw new Error(`MongoDB Atlas connection failure (${cleanHost}): ${lastMongoError}`);
    }
  })();

  try {
    const result = await connectPromise;
    return result;
  } finally {
    connectPromise = null;
  }
}

/**
 * Non-throwing check to see if Atlas connection can be obtained
 */
export async function tryMongoConnect(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) {
    return true;
  }
  try {
    const conn = await getMongoConnection();
    return (conn.readyState as number) === 1;
  } catch {
    return false;
  }
}

/**
 * Ensures real MongoDB Atlas is connected before executing any database operation.
 * Throws an explicit error if Atlas is unavailable.
 */
export async function ensureMongoConnected(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    await getMongoConnection();
  }
}
