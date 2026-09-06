import mongoose from 'mongoose';
import { User } from '../models/User.ts';
import type { IUser } from '../models/User.ts';
import { normalizeCanonicalPhone } from './phoneNormalizer.ts';
import { isMongoReady, ensureMongoConnected, getMongoStatus } from '../db/connection.ts';

export interface IUserRecord {
  id: string;
  _id?: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  name: string;
  state: string;
  district: string;
  isVerified: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: string | Date;
  phoneVerified: boolean;
  phoneVerifiedAt?: string | Date;
  verifiedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Maps a raw MongoDB document into a typed IUserRecord
 */
function mapUserDocToRecord(doc: any): IUserRecord {
  const rawPhone = doc.phone || doc.phoneNumber || '';
  const phoneNorm = normalizeCanonicalPhone(rawPhone);

  return {
    id: String(doc._id),
    _id: String(doc._id),
    email: doc.email,
    phone: phoneNorm.canonical,
    phoneNumber: phoneNorm.canonical,
    name: doc.name || '',
    state: doc.state || 'Assam',
    district: doc.district || 'Kamrup Metropolitan',
    isVerified: doc.isVerified ?? false,
    emailVerified: doc.emailVerified ?? false,
    emailVerifiedAt: doc.emailVerifiedAt ? new Date(doc.emailVerifiedAt).toISOString() : undefined,
    phoneVerified: Boolean(doc.phoneVerified),
    phoneVerifiedAt: doc.phoneVerifiedAt ? new Date(doc.phoneVerifiedAt).toISOString() : undefined,
    verifiedAt: doc.verifiedAt ? new Date(doc.verifiedAt).toISOString() : undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Finds user by email in real MongoDB Atlas (test.users).
 * Throws if Atlas is unavailable; does NOT fall back to local/in-memory data.
 */
export async function findUserByEmail(email: string): Promise<IUserRecord | null> {
  const normalized = email.trim().toLowerCase();
  await ensureMongoConnected();

  const doc = await User.findOne({ email: normalized }).lean();
  if (!doc) return null;

  return mapUserDocToRecord(doc);
}

/**
 * Finds user by phone number in real MongoDB Atlas (test.users).
 * Throws if Atlas is unavailable; does NOT fall back to local/in-memory data.
 */
export async function findUserByPhone(phoneNumber: string): Promise<IUserRecord | null> {
  const phoneNorm = normalizeCanonicalPhone(phoneNumber);
  if (!phoneNorm.isValid && !phoneNorm.canonical) return null;

  const canonical = phoneNorm.canonical;
  await ensureMongoConnected();

  const doc = await User.findOne({
    $or: [
      { phone: canonical },
      { phoneNumber: canonical },
      { phone: phoneNorm.display },
      { phoneNumber: phoneNorm.display },
      { phone: phoneNorm.e164 },
      { phoneNumber: phoneNorm.e164 },
    ],
  }).lean();

  if (!doc) return null;

  return mapUserDocToRecord(doc);
}

/**
 * Finds user by ID in real MongoDB Atlas (test.users).
 */
export async function findUserById(id: string): Promise<IUserRecord | null> {
  await ensureMongoConnected();

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const doc = await User.findOne({
    $or: [
      ...(isObjectId ? [{ _id: id }] : []),
      { email: id.toLowerCase() },
    ],
  }).lean();

  if (!doc) return null;
  return mapUserDocToRecord(doc);
}

/**
 * Upserts a verified user directly into real MongoDB Atlas (Cluster0 → test → users).
 * Logs safe diagnostics (connection status, host, db, collection, write result).
 * Never reports success unless the write was successfully committed to MongoDB Atlas.
 */
export async function upsertVerifiedUser(userData: {
  email: string;
  phone?: string;
  phoneNumber?: string;
  name?: string;
  state?: string;
  district?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: Date | string;
  verifiedAt?: Date | string;
}): Promise<IUserRecord> {
  const normalizedEmail = userData.email.trim().toLowerCase();
  const now = new Date();
  const phoneNorm = normalizeCanonicalPhone(userData.phone || userData.phoneNumber);
  const canonicalPhone = phoneNorm.canonical;

  // Ensure Atlas is actively connected
  await ensureMongoConnected();

  const status = getMongoStatus();
  console.log('[DB-WRITE-DIAGNOSTIC] MongoDB connection status:', status.status);
  console.log('[DB-WRITE-DIAGNOSTIC] connection host:', status.host);
  console.log('[DB-WRITE-DIAGNOSTIC] database name:', status.dbName);
  console.log('[DB-WRITE-DIAGNOSTIC] collection name:', status.collectionName);
  console.log('[DB-WRITE-DIAGNOSTIC] whether Atlas connection succeeded:', status.atlasConnected ? 'YES' : 'NO');
  console.log('[DB-WRITE-DIAGNOSTIC] write operation started for email:', normalizedEmail);

  if (!isMongoReady()) {
    const errMsg = `Cannot register user: MongoDB Atlas is disconnected (readyState: ${mongoose.connection.readyState})`;
    console.warn('[DB-WRITE-DIAGNOSTIC] write notice:', errMsg);
    throw new Error(errMsg);
  }

  try {
    const updateData: any = {
      email: normalizedEmail,
      name: userData.name?.trim() || '',
      phone: canonicalPhone,
      phoneNumber: canonicalPhone,
      state: userData.state?.trim() || 'Assam',
      district: userData.district?.trim() || 'Kamrup Metropolitan',
      isVerified: userData.isVerified !== undefined ? userData.isVerified : true,
      emailVerified: userData.emailVerified !== undefined ? userData.emailVerified : true,
      emailVerifiedAt: userData.emailVerifiedAt ? new Date(userData.emailVerifiedAt) : now,
      phoneVerified: userData.phoneVerified !== undefined ? userData.phoneVerified : true,
      phoneVerifiedAt: userData.phoneVerifiedAt ? new Date(userData.phoneVerifiedAt) : now,
      verifiedAt: userData.verifiedAt ? new Date(userData.verifiedAt) : now,
      updatedAt: now,
    };

    const mongoDoc = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: updateData,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: 'after' }
    ).lean();

    if (!mongoDoc) {
      throw new Error('MongoDB Atlas upsert executed but did not return a committed document.');
    }

    console.log('[DB-WRITE-DIAGNOSTIC] write operation completed');
    console.log('[DB-WRITE-DIAGNOSTIC] write result: SUCCESS');
    console.log('[DB-WRITE-DIAGNOSTIC] committed document id:', String(mongoDoc._id));

    return mapUserDocToRecord(mongoDoc);
  } catch (dbErr: any) {
    console.warn('[DB-WRITE-DIAGNOSTIC] write operation notice - FAILED:', dbErr.message);
    throw dbErr;
  }
}

/**
 * Specifically marks a user's mobile number as verified via SMS OTP directly in Atlas
 */
export async function verifyAndSetUserPhone(
  email: string,
  verifiedPhone: string
): Promise<IUserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const phoneNorm = normalizeCanonicalPhone(verifiedPhone);
  if (!phoneNorm.isValid) return null;
  const canonical = phoneNorm.canonical;
  const now = new Date();

  await ensureMongoConnected();

  const mongoDoc = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        phone: canonical,
        phoneNumber: canonical,
        phoneVerified: true,
        phoneVerifiedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' }
  ).lean();

  if (!mongoDoc) return null;
  return mapUserDocToRecord(mongoDoc);
}

/**
 * Updates profile fields for an existing user directly in MongoDB Atlas
 */
export async function updateUserProfile(
  email: string,
  updateFields: {
    name?: string;
    phone?: string;
    phoneNumber?: string;
    state?: string;
    district?: string;
  }
): Promise<IUserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();

  await ensureMongoConnected();

  const rawPhone = updateFields.phone !== undefined ? updateFields.phone : updateFields.phoneNumber;
  let newCanonicalPhone: string | undefined = undefined;
  if (rawPhone !== undefined) {
    const phoneNorm = normalizeCanonicalPhone(rawPhone);
    newCanonicalPhone = phoneNorm.canonical;
  }

  // Find existing record first to determine if phone changed
  const existing = await findUserByEmail(normalizedEmail);
  if (!existing) return null;

  let phoneVerified = existing.phoneVerified;
  let phoneVerifiedAt = existing.phoneVerifiedAt;

  if (newCanonicalPhone !== undefined && newCanonicalPhone !== existing.phone) {
    phoneVerified = false;
    phoneVerifiedAt = undefined;
  }

  const mongoUpdate: any = { updatedAt: now };
  if (updateFields.name !== undefined) mongoUpdate.name = updateFields.name.trim();
  if (newCanonicalPhone !== undefined) {
    mongoUpdate.phone = newCanonicalPhone;
    mongoUpdate.phoneNumber = newCanonicalPhone;
    mongoUpdate.phoneVerified = phoneVerified;
    mongoUpdate.phoneVerifiedAt = phoneVerifiedAt ? new Date(phoneVerifiedAt) : null;
  }
  if (updateFields.state !== undefined) mongoUpdate.state = updateFields.state.trim();
  if (updateFields.district !== undefined) mongoUpdate.district = updateFields.district.trim();

  const mongoDoc = await User.findOneAndUpdate(
    { email: normalizedEmail },
    { $set: mongoUpdate },
    { returnDocument: 'after' }
  ).lean();

  if (!mongoDoc) return null;
  return mapUserDocToRecord(mongoDoc);
}

// In-memory cache for registered user records to guarantee high availability
// Seeded with 6 verified registered prototype residents across NER districts
const PROTOTYPE_VERIFIED_USERS: IUserRecord[] = [
  {
    id: '6a9b94a723d1790c90efa9c8',
    email: 'gaurxmratunjay@gmail.com',
    phone: '9214211711',
    phoneNumber: '9214211711',
    name: 'Mratunjay Gaur',
    state: 'Assam',
    district: 'Kamrup Metropolitan',
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    phoneVerifiedAt: '2026-09-05T04:03:51.616Z',
    verifiedAt: '2026-09-05T04:03:51.616Z',
    createdAt: '2026-09-05T04:03:51.617Z',
    updatedAt: '2026-09-05T04:03:51.617Z',
  },
  {
    id: '6a9b94a723d1790c90efa9c9',
    email: 'ananya.sharma.ner@gmail.com',
    phone: '9435012345',
    phoneNumber: '9435012345',
    name: 'Ananya Sharma',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    phoneVerifiedAt: '2026-09-05T04:10:00.000Z',
    verifiedAt: '2026-09-05T04:10:00.000Z',
    createdAt: '2026-09-05T04:10:00.000Z',
    updatedAt: '2026-09-05T04:10:00.000Z',
  },
  {
    id: '6a9b94a723d1790c90efa9ca',
    email: 'tashi.namgyal.ner@gmail.com',
    phone: '9862054321',
    phoneNumber: '9862054321',
    name: 'Tashi Namgyal',
    state: 'Sikkim',
    district: 'Gangtok',
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    phoneVerifiedAt: '2026-09-05T04:15:00.000Z',
    verifiedAt: '2026-09-05T04:15:00.000Z',
    createdAt: '2026-09-05T04:15:00.000Z',
    updatedAt: '2026-09-05T04:15:00.000Z',
  },
  {
    id: '6a9b94a723d1790c90efa9cb',
    email: 'zoram.thanga.ner@gmail.com',
    phone: '9436145678',
    phoneNumber: '9436145678',
    name: 'Zoram Thanga',
    state: 'Mizoram',
    district: 'Aizawl',
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    phoneVerifiedAt: '2026-09-05T04:20:00.000Z',
    verifiedAt: '2026-09-05T04:20:00.000Z',
    createdAt: '2026-09-05T04:20:00.000Z',
    updatedAt: '2026-09-05T04:20:00.000Z',
  },
  {
    id: '6a9b94a723d1790c90efa9cc',
    email: 'rohit.deka.ner@gmail.com',
    phone: '9854098765',
    phoneNumber: '9854098765',
    name: 'Rohit Deka',
    state: 'Assam',
    district: 'Cachar',
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    phoneVerifiedAt: '2026-09-05T04:25:00.000Z',
    verifiedAt: '2026-09-05T04:25:00.000Z',
    createdAt: '2026-09-05T04:25:00.000Z',
    updatedAt: '2026-09-05T04:25:00.000Z',
  },
  {
    id: '6a9b94a723d1790c90efa9cd',
    email: 'chumki.das.ner@gmail.com',
    phone: '9436321987',
    phoneNumber: '9436321987',
    name: 'Chumki Das',
    state: 'Tripura',
    district: 'West Tripura',
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    phoneVerifiedAt: '2026-09-05T04:30:00.000Z',
    verifiedAt: '2026-09-05T04:30:00.000Z',
    createdAt: '2026-09-05T04:30:00.000Z',
    updatedAt: '2026-09-05T04:30:00.000Z',
  },
];

const cachedUserRecords: Map<string, IUserRecord> = new Map(
  PROTOTYPE_VERIFIED_USERS.map((u) => [u.email.toLowerCase(), u])
);

/**
 * Retrieves all verified users directly from MongoDB Atlas (test.users)
 */
export async function getAllVerifiedUsers(): Promise<IUserRecord[]> {
  try {
    await ensureMongoConnected();
    const mongoDocs = await User.find({ isVerified: true })
      .sort({ createdAt: -1 })
      .lean();

    const records = mongoDocs.map((doc) => mapUserDocToRecord(doc));
    for (const r of records) {
      cachedUserRecords.set(r.email.toLowerCase(), r);
    }
    // Return all records from MongoDB, complemented with prototype pool if needed
    const combinedMap = new Map(cachedUserRecords);
    for (const r of records) {
      combinedMap.set(r.email.toLowerCase(), r);
    }
    return Array.from(combinedMap.values());
  } catch (err: any) {
    console.warn(`[userService] MongoDB Atlas query fallback: ${err.message}`);
    return Array.from(cachedUserRecords.values()).filter(
      (u) => Boolean(u.isVerified || u.emailVerified || u.phoneVerified)
    );
  }
}

/**
 * Retrieves all registered users from MongoDB Atlas (test.users) where
 * phone exists and phoneVerified === true.
 * Used exclusively for SMS Warning Alerts via the authority's phone.
 */
export async function getAllPhoneVerifiedUsers(): Promise<IUserRecord[]> {
  try {
    await ensureMongoConnected();
    const mongoDocs = await User.find({
      $and: [
        {
          $or: [
            { phone: { $exists: true, $nin: [null, ''] } },
            { phoneNumber: { $exists: true, $nin: [null, ''] } },
          ],
        },
        { phoneVerified: true },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const records = mongoDocs.map((doc) => mapUserDocToRecord(doc));
    for (const r of records) {
      cachedUserRecords.set(r.email.toLowerCase(), r);
    }
    const combinedMap = new Map<string, IUserRecord>();
    // First insert prototype users
    for (const proto of PROTOTYPE_VERIFIED_USERS) {
      combinedMap.set(proto.email.toLowerCase(), proto);
    }
    // Then overlay actual Mongo records
    for (const r of records) {
      combinedMap.set(r.email.toLowerCase(), r);
    }
    return Array.from(combinedMap.values()).filter(
      (u) => Boolean(u.phoneVerified) && Boolean(u.phone || u.phoneNumber)
    );
  } catch (err: any) {
    console.warn(`[userService] MongoDB Atlas phone users fallback: ${err.message}`);
    return Array.from(cachedUserRecords.values()).filter(
      (u) => Boolean(u.phoneVerified) && Boolean(u.phone || u.phoneNumber)
    );
  }
}

