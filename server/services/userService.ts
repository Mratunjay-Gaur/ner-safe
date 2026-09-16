import mongoose from 'mongoose';
import { User } from '../models/User.ts';
import { normalizeCanonicalPhone } from './phoneNormalizer.ts';
import { isMongoReady, getMongoConnection } from '../db/connection.ts';
import {
  readLocalUsers,
  saveLocalUser,
  findLocalUserByPhone,
  findLocalUserByEmail,
  findLocalUserById,
  updateLocalUserProfile,
} from './localStoreService.ts';
import {
  getDefaultLanguageForState,
  isValidLanguageCode,
} from './languageService.ts';

export interface IUserRecord {
  id: string;
  _id?: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  name: string;
  state: string;
  district: string;
  preferredLanguage?: string;
  isVerified: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: string | Date;
  phoneVerified: boolean;
  phoneVerifiedAt?: string | Date;
  verifiedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  syncPending?: boolean;
}

/**
 * Maps a raw MongoDB document into a typed IUserRecord
 */
function mapUserDocToRecord(doc: any): IUserRecord {
  const rawPhone = doc.phone || doc.phoneNumber || doc.mobile || doc.contact || '';
  const phoneNorm = normalizeCanonicalPhone(rawPhone);

  const isVerified = Boolean(
    doc.isVerified ||
    doc.verified ||
    doc.is_verified ||
    doc.emailVerified ||
    doc.email_verified ||
    doc.phoneVerified ||
    doc.phone_verified
  );

  const state = doc.state || 'Assam';
  const rawLang = doc.preferredLanguage || doc.language;
  const preferredLanguage = (rawLang && isValidLanguageCode(rawLang))
    ? rawLang.trim().toLowerCase()
    : getDefaultLanguageForState(state);

  return {
    id: String(doc._id || doc.id || doc.email),
    _id: String(doc._id || doc.id || doc.email),
    email: doc.email || doc.email_address || '',
    phone: phoneNorm.canonical || rawPhone,
    phoneNumber: phoneNorm.canonical || rawPhone,
    name: doc.name || doc.fullName || doc.full_name || doc.username || '',
    state,
    district: doc.district || 'Kamrup Metropolitan',
    preferredLanguage,
    isVerified,
    emailVerified: Boolean(doc.emailVerified || doc.email_verified || isVerified),
    emailVerifiedAt: (doc.emailVerifiedAt || doc.email_verified_at) ? new Date(doc.emailVerifiedAt || doc.email_verified_at).toISOString() : undefined,
    phoneVerified: Boolean(doc.phoneVerified || doc.phone_verified),
    phoneVerifiedAt: (doc.phoneVerifiedAt || doc.phone_verified_at) ? new Date(doc.phoneVerifiedAt || doc.phone_verified_at).toISOString() : undefined,
    verifiedAt: (doc.verifiedAt || doc.verified_at) ? new Date(doc.verifiedAt || doc.verified_at).toISOString() : undefined,
    createdAt: (doc.createdAt || doc.created_at) ? new Date(doc.createdAt || doc.created_at).toISOString() : new Date().toISOString(),
    updatedAt: (doc.updatedAt || doc.updated_at) ? new Date(doc.updatedAt || doc.updated_at).toISOString() : new Date().toISOString(),
    syncPending: false,
  };
}

/**
 * Non-blocking attempt to connect to Mongo if not already connected.
 */
async function tryEnsureMongo(): Promise<boolean> {
  if (isMongoReady()) return true;
  try {
    const conn = await Promise.race([
      getMongoConnection(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    return Boolean(conn && (conn.readyState as number) === 1);
  } catch {
    return false;
  }
}

/**
 * Finds user by email in MongoDB with seamless fallback to resilient local storage.
 */
export async function findUserByEmail(email: string): Promise<IUserRecord | null> {
  const normalized = email.trim().toLowerCase();

  // Try MongoDB if connected
  if (await tryEnsureMongo()) {
    try {
      const doc = await User.findOne({ email: normalized }).lean();
      if (doc) {
        const mapped = mapUserDocToRecord(doc);
        saveLocalUser(mapped); // Keep local cache updated
        return mapped;
      }
    } catch (mongoErr: any) {
      console.warn('[userService] Notice querying MongoDB for email:', mongoErr.message);
    }
  }

  // Fallback to durable local storage
  return findLocalUserByEmail(normalized);
}

/**
 * Finds user by phone number in MongoDB with seamless fallback to resilient local storage.
 */
export async function findUserByPhone(phoneNumber: string): Promise<IUserRecord | null> {
  const phoneNorm = normalizeCanonicalPhone(phoneNumber);
  const canonical = phoneNorm.canonical;

  if (await tryEnsureMongo()) {
    try {
      const query: any = {
        $or: [
          { phone: phoneNumber },
          { phoneNumber: phoneNumber },
        ],
      };

      if (canonical) {
        query.$or.push(
          { phone: canonical },
          { phoneNumber: canonical },
          { phone: phoneNorm.display },
          { phoneNumber: phoneNorm.display },
          { phone: phoneNorm.e164 },
          { phoneNumber: phoneNorm.e164 },
          { phone: { $regex: `${canonical}$` } },
          { phoneNumber: { $regex: `${canonical}$` } }
        );
      }

      const doc = await User.findOne(query).lean();
      if (doc) {
        const mapped = mapUserDocToRecord(doc);
        saveLocalUser(mapped); // Keep local cache in sync
        return mapped;
      }
    } catch (mongoErr: any) {
      console.warn('[userService] Notice querying MongoDB for phone:', mongoErr.message);
    }
  }

  // Fallback to durable local storage
  return findLocalUserByPhone(phoneNumber);
}

/**
 * Finds user by ID with seamless fallback to resilient local storage.
 */
export async function findUserById(id: string): Promise<IUserRecord | null> {
  if (await tryEnsureMongo()) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const doc = await User.findOne({
        $or: [
          ...(isObjectId ? [{ _id: id }] : []),
          { email: id.toLowerCase() },
        ],
      }).lean();

      if (doc) {
        const mapped = mapUserDocToRecord(doc);
        saveLocalUser(mapped);
        return mapped;
      }
    } catch (mongoErr: any) {
      console.warn('[userService] Notice querying MongoDB for ID:', mongoErr.message);
    }
  }

  // Fallback to durable local storage
  return findLocalUserById(id);
}

/**
 * Creates a brand new verified user document.
 * Writes to local persistent store immediately and synchronizes with MongoDB Atlas.
 */
export async function createRegisteredUser(userData: {
  email: string;
  phone?: string;
  phoneNumber?: string;
  name?: string;
  state?: string;
  district?: string;
  preferredLanguage?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: Date | string;
  verifiedAt?: Date | string;
}): Promise<IUserRecord> {
  const normalizedEmail = userData.email.trim().toLowerCase();
  const phoneNorm = normalizeCanonicalPhone(userData.phone || userData.phoneNumber);
  const canonicalPhone = phoneNorm.canonical || userData.phone || userData.phoneNumber || '';
  const now = new Date();

  // Check duplicate in local storage first
  const existingLocal =
    findLocalUserByEmail(normalizedEmail) ||
    (canonicalPhone ? findLocalUserByPhone(canonicalPhone) : null);

  if (existingLocal) {
    const conflictField = existingLocal.email.toLowerCase() === normalizedEmail ? 'email' : 'phone number';
    throw new Error(`A user with this ${conflictField} already exists in database.`);
  }

  const state = userData.state?.trim() || 'Assam';
  const preferredLanguage = userData.preferredLanguage && isValidLanguageCode(userData.preferredLanguage)
    ? userData.preferredLanguage.trim().toLowerCase()
    : getDefaultLanguageForState(state);

  const generatedId = `usr_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const userRecord: IUserRecord = {
    id: generatedId,
    _id: generatedId,
    email: normalizedEmail,
    name: userData.name?.trim() || '',
    phone: canonicalPhone,
    phoneNumber: canonicalPhone,
    state,
    district: userData.district?.trim() || 'Kamrup Metropolitan',
    preferredLanguage,
    isVerified: userData.isVerified !== undefined ? userData.isVerified : true,
    emailVerified: userData.emailVerified !== undefined ? userData.emailVerified : true,
    emailVerifiedAt: userData.emailVerifiedAt ? new Date(userData.emailVerifiedAt).toISOString() : now.toISOString(),
    phoneVerified: userData.phoneVerified !== undefined ? userData.phoneVerified : true,
    phoneVerifiedAt: userData.phoneVerifiedAt ? new Date(userData.phoneVerifiedAt).toISOString() : now.toISOString(),
    verifiedAt: userData.verifiedAt ? new Date(userData.verifiedAt).toISOString() : now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    syncPending: true,
  };

  // Always save to durable local storage first
  saveLocalUser(userRecord);

  // Attempt sync to MongoDB Atlas if reachable
  if (await tryEnsureMongo()) {
    try {
      const newUser = new User({
        ...userRecord,
        createdAt: now,
        updatedAt: now,
      });
      const savedDoc = await newUser.save();
      const mapped = mapUserDocToRecord(savedDoc);
      saveLocalUser(mapped);
      return mapped;
    } catch (mongoErr: any) {
      console.warn('[userService] Notice persisting to MongoDB Atlas:', mongoErr.message);
    }
  }

  return userRecord;
}

/**
 * Upserts verified user document.
 */
export async function upsertVerifiedUser(userData: {
  email: string;
  phone?: string;
  phoneNumber?: string;
  name?: string;
  state?: string;
  district?: string;
  preferredLanguage?: string;
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
  const canonicalPhone = phoneNorm.canonical || userData.phone || userData.phoneNumber || '';
  const existing = findLocalUserByEmail(normalizedEmail);

  const state = userData.state?.trim() || existing?.state || 'Assam';
  const preferredLanguage = userData.preferredLanguage && isValidLanguageCode(userData.preferredLanguage)
    ? userData.preferredLanguage.trim().toLowerCase()
    : (existing?.preferredLanguage || getDefaultLanguageForState(state));

  const updateData: IUserRecord = {
    id: existing?.id || `usr_${Date.now()}`,
    email: normalizedEmail,
    name: userData.name?.trim() || existing?.name || '',
    phone: canonicalPhone || existing?.phone || '',
    phoneNumber: canonicalPhone || existing?.phoneNumber || '',
    state,
    district: userData.district?.trim() || existing?.district || 'Kamrup Metropolitan',
    preferredLanguage,
    isVerified: userData.isVerified !== undefined ? userData.isVerified : true,
    emailVerified: userData.emailVerified !== undefined ? userData.emailVerified : true,
    emailVerifiedAt: userData.emailVerifiedAt ? new Date(userData.emailVerifiedAt).toISOString() : now.toISOString(),
    phoneVerified: userData.phoneVerified !== undefined ? userData.phoneVerified : Boolean(existing?.phoneVerified),
    phoneVerifiedAt: userData.phoneVerifiedAt ? new Date(userData.phoneVerifiedAt).toISOString() : existing?.phoneVerifiedAt ? String(existing.phoneVerifiedAt) : now.toISOString(),
    verifiedAt: userData.verifiedAt ? new Date(userData.verifiedAt).toISOString() : now.toISOString(),
    createdAt: existing?.createdAt ? String(existing.createdAt) : now.toISOString(),
    updatedAt: now.toISOString(),
    syncPending: true,
  };

  // Save to local store
  const savedLocal = saveLocalUser(updateData);

  // Sync to MongoDB if connected
  if (await tryEnsureMongo()) {
    try {
      const mongoDoc = await User.findOneAndUpdate(
        { email: normalizedEmail },
        {
          $set: {
            ...updateData,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true, returnDocument: 'after' }
      ).lean();

      if (mongoDoc) {
        const mapped = mapUserDocToRecord(mongoDoc);
        saveLocalUser(mapped);
        return mapped;
      }
    } catch (mongoErr: any) {
      console.warn('[userService] Notice upserting to MongoDB:', mongoErr.message);
    }
  }

  return savedLocal;
}

/**
 * Specifically marks a user's mobile number as verified via SMS OTP.
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

  // Update in local store
  const updatedLocal = updateLocalUserProfile(normalizedEmail, {
    phone: canonical,
    phoneNumber: canonical,
  });

  // Update in MongoDB if connected
  if (await tryEnsureMongo()) {
    try {
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

      if (mongoDoc) {
        return mapUserDocToRecord(mongoDoc);
      }
    } catch (mongoErr: any) {
      console.warn('[userService] Notice updating phone in MongoDB:', mongoErr.message);
    }
  }

  return updatedLocal;
}

/**
 * Updates profile fields for an existing user.
 */
export async function updateUserProfile(
  email: string,
  updateFields: {
    name?: string;
    phone?: string;
    phoneNumber?: string;
    state?: string;
    district?: string;
    preferredLanguage?: string;
  }
): Promise<IUserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();

  // Update in local store first
  const updatedLocal = updateLocalUserProfile(normalizedEmail, updateFields);

  // Update in MongoDB if connected
  if (await tryEnsureMongo()) {
    try {
      const rawPhone = updateFields.phone !== undefined ? updateFields.phone : updateFields.phoneNumber;
      let newCanonicalPhone: string | undefined = undefined;
      if (rawPhone !== undefined) {
        const phoneNorm = normalizeCanonicalPhone(rawPhone);
        newCanonicalPhone = phoneNorm.canonical;
      }

      const mongoUpdate: any = { updatedAt: now };
      if (updateFields.name !== undefined) mongoUpdate.name = updateFields.name.trim();
      if (newCanonicalPhone !== undefined) {
        mongoUpdate.phone = newCanonicalPhone;
        mongoUpdate.phoneNumber = newCanonicalPhone;
      }
      if (updateFields.state !== undefined) mongoUpdate.state = updateFields.state.trim();
      if (updateFields.district !== undefined) mongoUpdate.district = updateFields.district.trim();
      if (updateFields.preferredLanguage !== undefined) {
        mongoUpdate.preferredLanguage = updateFields.preferredLanguage.trim().toLowerCase();
      }

      const mongoDoc = await User.findOneAndUpdate(
        { email: normalizedEmail },
        { $set: mongoUpdate },
        { returnDocument: 'after' }
      ).lean();

      if (mongoDoc) {
        const mapped = mapUserDocToRecord(mongoDoc);
        saveLocalUser(mapped);
        return mapped;
      }
    } catch (mongoErr: any) {
      console.warn('[userService] Notice updating MongoDB profile:', mongoErr.message);
    }
  }

  return updatedLocal;
}

/**
 * Retrieves all verified users strictly from MongoDB.
 */
export async function getAllVerifiedUsers(): Promise<IUserRecord[]> {
  if (await tryEnsureMongo()) {
    try {
      const mongoDocs = await User.find({
        $or: [
          { isVerified: true },
          { verified: true },
          { is_verified: true },
          { emailVerified: true },
          { email_verified: true },
          { phoneVerified: true },
          { phone_verified: true },
        ],
      })
        .sort({ createdAt: -1 })
        .lean();
      return (mongoDocs || []).map((doc) => mapUserDocToRecord(doc));
    } catch (mongoErr: any) {
      console.warn('[userService] Notice loading verified users from MongoDB:', mongoErr.message);
    }
  }

  // Strictly return empty list if MongoDB is not connected or returns 0 users
  return [];
}

/**
 * Retrieves all registered users where phone exists and phoneVerified === true strictly from MongoDB.
 */
export async function getAllPhoneVerifiedUsers(): Promise<IUserRecord[]> {
  if (await tryEnsureMongo()) {
    try {
      const mongoDocs = await User.find({
        $and: [
          {
            $or: [
              { phone: { $exists: true, $nin: [null, ''] } },
              { phoneNumber: { $exists: true, $nin: [null, ''] } },
              { mobile: { $exists: true, $nin: [null, ''] } },
              { contact: { $exists: true, $nin: [null, ''] } },
            ],
          },
          {
            $or: [
              { phoneVerified: true },
              { phone_verified: true },
              { isVerified: true },
            ],
          },
        ],
      })
        .sort({ createdAt: -1 })
        .lean();

      return (mongoDocs || []).map((doc) => mapUserDocToRecord(doc));
    } catch (mongoErr: any) {
      console.warn('[userService] Notice loading phone verified users from MongoDB:', mongoErr.message);
    }
  }

  // Strictly return empty list if MongoDB is not connected or returns 0 users
  return [];
}
