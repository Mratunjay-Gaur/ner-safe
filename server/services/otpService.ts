import crypto from 'crypto';
import { sendOTPEmail } from './brevoEmailService';

interface OtpRecord {
  email: string;
  code: string; // 6-digit string
  name?: string;
  district?: string;
  state?: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
}

interface RateLimitRecord {
  lastRequestedAt: number;
  requestCount: number;
  windowStart: number;
}

// In-memory store for active OTPs and rate limiting
const otpStore = new Map<string, OtpRecord>();
const rateLimitStore = new Map<string, RateLimitRecord>();
const verifiedEmails = new Set<string>();
const verifiedPhones = new Set<string>();
const smsRateLimitStore = new Map<string, RateLimitRecord>();

const OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_MS = 60 * 1000; // 60 seconds between resends
const MAX_REQUESTS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_VERIFICATION_ATTEMPTS = 3;

/**
 * Checks and updates rate limits for SMS OTP requests
 */
export function checkSmsRateLimit(normalizedPhone: string): {
  allowed: boolean;
  message?: string;
  cooldownSeconds?: number;
  error?: string;
} {
  const now = Date.now();
  const rateLimit = smsRateLimitStore.get(normalizedPhone) || {
    lastRequestedAt: 0,
    requestCount: 0,
    windowStart: now,
  };

  if (now - rateLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimit.requestCount = 0;
    rateLimit.windowStart = now;
  }

  const elapsedSinceLast = now - rateLimit.lastRequestedAt;
  if (elapsedSinceLast < COOLDOWN_MS) {
    const remainingCooldown = Math.ceil((COOLDOWN_MS - elapsedSinceLast) / 1000);
    return {
      allowed: false,
      message: `Please wait ${remainingCooldown}s before requesting a new SMS verification code.`,
      cooldownSeconds: remainingCooldown,
      error: 'COOLDOWN_ACTIVE',
    };
  }

  if (rateLimit.requestCount >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      message: 'Too many SMS verification requests for this mobile number. Please try again in 1 hour.',
      error: 'RATE_LIMIT_EXCEEDED',
    };
  }

  return { allowed: true };
}

/**
 * Records an SMS OTP dispatch to update rate limits
 */
export function recordSmsSent(normalizedPhone: string): void {
  const now = Date.now();
  const rateLimit = smsRateLimitStore.get(normalizedPhone) || {
    lastRequestedAt: 0,
    requestCount: 0,
    windowStart: now,
  };

  rateLimit.lastRequestedAt = now;
  rateLimit.requestCount += 1;
  smsRateLimitStore.set(normalizedPhone, rateLimit);
}

/**
 * Marks phone number as verified in-memory
 */
export function recordVerifiedPhone(normalizedPhone: string): void {
  verifiedPhones.add(normalizedPhone);
}

/**
 * Checks if a phone number is verified in-memory
 */
export function isPhoneVerified(normalizedPhone: string): boolean {
  return verifiedPhones.has(normalizedPhone);
}

/**
 * Clears in-memory verified state once MongoDB user is finalized
 */
export function clearVerifiedState(email?: string, phone?: string): void {
  if (email) verifiedEmails.delete(email.trim().toLowerCase());
  if (phone) verifiedPhones.delete(phone.trim());
}

/**
 * Validates email structure
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

/**
 * Generates a cryptographically random 6-digit numeric OTP code
 */
export function generateSecureOtpCode(): string {
  // Uses crypto.randomInt for uniform distribution without modulo bias
  const otpNumber = crypto.randomInt(100000, 1000000);
  return otpNumber.toString();
}

/**
 * Requests and dispatches an OTP verification email to the user
 */
export async function createAndSendOtp(params: {
  email: string;
  name?: string;
  district?: string;
  state?: string;
}): Promise<{
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  error?: string;
}> {
  const normalizedEmail = params.email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      message: 'Invalid email address provided.',
      error: 'INVALID_EMAIL',
    };
  }

  const now = Date.now();

  // Check rate limiting
  const rateLimit = rateLimitStore.get(normalizedEmail) || {
    lastRequestedAt: 0,
    requestCount: 0,
    windowStart: now,
  };

  // Reset window if expired
  if (now - rateLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimit.requestCount = 0;
    rateLimit.windowStart = now;
  }

  // Cooldown check (60s)
  const elapsedSinceLast = now - rateLimit.lastRequestedAt;
  if (elapsedSinceLast < COOLDOWN_MS) {
    const remainingCooldown = Math.ceil((COOLDOWN_MS - elapsedSinceLast) / 1000);
    return {
      success: false,
      message: `Please wait ${remainingCooldown}s before requesting a new verification code.`,
      cooldownSeconds: remainingCooldown,
      error: 'COOLDOWN_ACTIVE',
    };
  }

  // Max requests check
  if (rateLimit.requestCount >= MAX_REQUESTS_PER_WINDOW) {
    return {
      success: false,
      message: 'Too many verification code requests for this email. Please try again in 1 hour.',
      error: 'RATE_LIMIT_EXCEEDED',
    };
  }

  // Generate secure OTP
  const otpCode = generateSecureOtpCode();

  // Store in memory
  otpStore.set(normalizedEmail, {
    email: normalizedEmail,
    code: otpCode,
    name: params.name,
    district: params.district,
    state: params.state,
    createdAt: now,
    expiresAt: now + OTP_EXPIRATION_MS,
    attempts: 0,
  });

  // Update rate limiter
  rateLimit.lastRequestedAt = now;
  rateLimit.requestCount += 1;
  rateLimitStore.set(normalizedEmail, rateLimit);

  // Send through Brevo
  const sendResult = await sendOTPEmail({
    email: normalizedEmail,
    otp: otpCode,
    name: params.name,
    expirationMinutes: 10,
  });

  if (!sendResult.success) {
    // Delete OTP record if dispatch failed
    otpStore.delete(normalizedEmail);
    return {
      success: false,
      message: sendResult.error || 'Failed to dispatch email via Brevo.',
      error: 'BREVO_DISPATCH_ERROR',
    };
  }

  return {
    success: true,
    message: `Verification code sent to ${normalizedEmail}. Code expires in 10 minutes.`,
    cooldownSeconds: 60,
  };
}

/**
 * Verifies the user-submitted OTP code
 */
export function verifyOtpCode(params: {
  email: string;
  otp: string;
}): {
  success: boolean;
  message: string;
  verifiedEmail?: string;
  district?: string;
  state?: string;
  name?: string;
  error?: string;
} {
  const normalizedEmail = params.email.trim().toLowerCase();
  const submittedOtp = params.otp.trim();

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      message: 'Invalid email address provided.',
      error: 'INVALID_EMAIL',
    };
  }

  if (!submittedOtp || submittedOtp.length !== 6 || !/^\d{6}$/.test(submittedOtp)) {
    return {
      success: false,
      message: 'Please provide a valid 6-digit numeric verification code.',
      error: 'INVALID_OTP_FORMAT',
    };
  }

  const record = otpStore.get(normalizedEmail);

  if (!record) {
    return {
      success: false,
      message: 'No active verification code found for this email. Please request a new code.',
      error: 'OTP_NOT_FOUND',
    };
  }

  const now = Date.now();

  // Check expiration
  if (now > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return {
      success: false,
      message: 'Verification code has expired. Please request a new code.',
      error: 'OTP_EXPIRED',
    };
  }

  // Check max attempts
  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    otpStore.delete(normalizedEmail);
    return {
      success: false,
      message: 'Too many incorrect attempts. This code has been invalidated for security. Please request a new code.',
      error: 'MAX_ATTEMPTS_EXCEEDED',
    };
  }

  // Constant-time comparison to prevent timing attacks
  const recordBuf = Buffer.from(record.code, 'utf-8');
  const userBuf = Buffer.from(submittedOtp, 'utf-8');

  const isMatch = recordBuf.length === userBuf.length && crypto.timingSafeEqual(recordBuf, userBuf);

  if (!isMatch) {
    record.attempts += 1;
    otpStore.set(normalizedEmail, record);
    const attemptsLeft = MAX_VERIFICATION_ATTEMPTS - record.attempts;
    return {
      success: false,
      message: `Incorrect verification code. ${attemptsLeft} attempt(s) remaining.`,
      error: 'INVALID_OTP',
    };
  }

  // SUCCESS: Prevent reuse by deleting OTP record immediately
  const district = record.district;
  const state = record.state;
  const name = record.name;
  otpStore.delete(normalizedEmail);
  verifiedEmails.add(normalizedEmail);

  return {
    success: true,
    message: 'Email successfully verified.',
    verifiedEmail: normalizedEmail,
    district,
    state,
    name,
  };
}

/**
 * Checks if an email is already verified in this session
 */
export function isEmailVerified(email: string): boolean {
  return verifiedEmails.has(email.trim().toLowerCase());
}
