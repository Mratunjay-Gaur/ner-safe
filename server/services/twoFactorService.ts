export interface TwoFactorConfig {
  apiKey: string;
}

export interface SmsSendResult {
  success: boolean;
  sessionId?: string;
  message?: string;
  error?: string;
  details?: string;
}

export interface SmsVerifyResult {
  success: boolean;
  message: string;
  error?: string;
}

import { normalizeCanonicalPhone, maskPhoneNumber } from './phoneNormalizer';

export { maskPhoneNumber };

/**
 * Normalizes Indian phone numbers to canonical 10 digits
 */
export function normalizePhoneNumber(phone: string): {
  isValid: boolean;
  normalized: string;
  display: string;
} {
  const result = normalizeCanonicalPhone(phone);
  return {
    isValid: result.isValid,
    normalized: result.canonical,
    display: result.display,
  };
}

/**
 * Retrieves TWOFACTOR_API_KEY from environment safely
 */
export function getTwoFactorApiKey(): string {
  const key = process.env.TWOFACTOR_API_KEY?.trim() || '';
  if (!key) {
    throw new Error('TWOFACTOR_API_KEY is not configured in the environment.');
  }
  return key;
}

/**
 * Test authentication with 2Factor API
 */
export async function testTwoFactorAuthentication(): Promise<{
  success: boolean;
  status: string;
  balance?: string;
  error?: string;
}> {
  try {
    const apiKey = getTwoFactorApiKey();
    // 2Factor check balance / status endpoint
    const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/BAL/SMS`;
    const res = await fetch(url, { method: 'GET' });
    const data = (await res.json()) as any;

    if (res.ok && data?.Status === 'Success') {
      return {
        success: true,
        status: 'SUCCESS',
        balance: data.Details,
      };
    } else {
      return {
        success: false,
        status: 'FAILED',
        error: data?.Details || 'Authentication failed against 2Factor API.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      status: 'FAILED',
      error: err.message || 'Unable to connect to 2Factor API endpoint.',
    };
  }
}

/**
 * Sends a real 6-digit OTP SMS using 2Factor AUTOGEN flow
 */
export async function sendTwoFactorOtpSms(phoneNumber: string): Promise<SmsSendResult> {
  const maskedPhone = maskPhoneNumber(phoneNumber);
  console.log(`[SMS-DIAGNOSTIC] Phone Verification OTP request initiated for: ${maskedPhone}`);

  const { isValid, normalized } = normalizePhoneNumber(phoneNumber);

  if (!isValid) {
    console.log(`[SMS-DIAGNOSTIC] Phone Verification OTP failed: Invalid Indian mobile format for ${maskedPhone}`);
    return {
      success: false,
      error: 'INVALID_PHONE_NUMBER',
      message: 'Please provide a valid 10-digit Indian mobile number.',
    };
  }

  try {
    const apiKey = getTwoFactorApiKey();
    const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(normalized)}/AUTOGEN`;

    const res = await fetch(url, { method: 'GET' });
    const data = (await res.json()) as any;

    console.log(`[SMS-DIAGNOSTIC] OTP Provider HTTP status: ${res.status}`);
    console.log(`[SMS-DIAGNOSTIC] OTP Provider response status: ${data?.Status || 'UNKNOWN'} | message: ${data?.Details || 'none'}`);

    if (res.ok && data?.Status === 'Success') {
      console.log(`[SMS-DIAGNOSTIC] Final OTP SMS result: SENT to ${maskedPhone}`);
      return {
        success: true,
        sessionId: data.Details,
        message: `OTP sent successfully to mobile number.`,
      };
    } else {
      console.log(`[SMS-DIAGNOSTIC] Final OTP SMS result: FAILED for ${maskedPhone} - ${data?.Details}`);
      return {
        success: false,
        error: 'SMS_DISPATCH_FAILED',
        message: data?.Details || 'Failed to dispatch SMS via 2Factor.',
      };
    }
  } catch (err: any) {
    console.log(`[SMS-DIAGNOSTIC] Final OTP SMS result: FAILED for ${maskedPhone} - ${err.message}`);
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: err.message || 'Network failure connecting to 2Factor gateway.',
    };
  }
}

/**
 * Verifies the 6-digit OTP entered by the user via 2Factor verify flow
 */
export async function verifyTwoFactorOtpSms(
  sessionId: string,
  otpCode: string
): Promise<SmsVerifyResult> {
  if (!sessionId || typeof sessionId !== 'string') {
    return {
      success: false,
      message: 'Missing or invalid SMS verification session ID.',
      error: 'INVALID_SESSION_ID',
    };
  }

  const cleanOtp = otpCode.trim();
  if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    return {
      success: false,
      message: 'Please enter a valid 6-digit numeric SMS passcode.',
      error: 'INVALID_OTP_FORMAT',
    };
  }

  try {
    const apiKey = getTwoFactorApiKey();
    const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`;

    const res = await fetch(url, { method: 'GET' });
    const data = (await res.json()) as any;

    if (res.ok && data?.Status === 'Success' && data?.Details === 'OTP Matched') {
      return {
        success: true,
        message: 'Mobile number verified successfully via 2Factor.',
      };
    } else {
      return {
        success: false,
        message: data?.Details || 'Invalid or expired SMS OTP passcode.',
        error: 'OTP_MISMATCH',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to verify SMS code with 2Factor.',
      error: 'VERIFICATION_ERROR',
    };
  }
}

/**
 * Dispatches an emergency/test warning SMS via 2Factor TSMS (Transactional SMS) gateway
 * strictly adhering to provider verification and DLT requirements.
 * NEVER fakes success if the provider rejects the message or lacks DLT template registration.
 */
export async function sendTwoFactorWarningSms(params: {
  phoneNumber: string;
  recipientName?: string;
  district: string;
  state: string;
  alertSeverity: string;
  riskLevel: string;
  riskScore: number;
}): Promise<SmsSendResult> {
  const maskedPhone = maskPhoneNumber(params.phoneNumber);
  console.log(`[SMS-DIAGNOSTIC] SMS warning request initiated | Recipient: ${maskedPhone} | Severity: ${params.alertSeverity} | Location: ${params.district}, ${params.state}`);

  const { isValid, normalized } = normalizePhoneNumber(params.phoneNumber);

  if (!isValid) {
    console.log(`[SMS-DIAGNOSTIC] SMS warning rejected: Invalid Indian phone format for ${maskedPhone}`);
    return {
      success: false,
      error: 'INVALID_PHONE_NUMBER',
      message: 'Invalid mobile number for SMS dispatch. Please provide a valid 10-digit Indian mobile number.',
    };
  }

  let apiKey: string;
  try {
    apiKey = getTwoFactorApiKey();
  } catch (err: any) {
    console.log(`[SMS-DIAGNOSTIC] Final SMS result: FAILED | Provider: TWOFACTOR_API_KEY missing`);
    return {
      success: false,
      error: 'API_KEY_MISSING',
      message: 'TWOFACTOR_API_KEY is not configured in the environment.',
    };
  }

  const senderId = process.env.TWOFACTOR_SENDER_ID?.trim() || 'NERSAF';
  const templateName = process.env.TWOFACTOR_TEMPLATE_NAME?.trim() || 'EmergencyAlert';
  const messageText = `[NER-SAFE ${params.alertSeverity} ALERT] ${params.district}, ${params.state}: Risk Level ${params.riskLevel} (${params.riskScore}/100). Take precautions. Prototype test.`;

  console.log(`[SMS-DIAGNOSTIC] Target Endpoint: https://2factor.in/API/V1/[REDACTED]/ADDON_SERVICES/SEND/TSMS | SenderId: ${senderId} | TemplateName: ${templateName}`);

  try {
    const tsmsUrl = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/ADDON_SERVICES/SEND/TSMS`;
    const payload = {
      From: senderId,
      To: normalized,
      Msg: messageText,
      TemplateName: templateName,
      VAR1: params.alertSeverity,
      VAR2: `${params.district}, ${params.state}`,
      VAR3: `${params.riskLevel} (${params.riskScore}/100)`,
    };

    const res = await fetch(tsmsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const httpStatus = res.status;
    console.log(`[SMS-DIAGNOSTIC] Provider HTTP status: ${httpStatus}`);

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { Status: 'Error', Details: text };
    }

    const providerStatus = data?.Status || (res.ok ? 'Success' : 'Error');
    const providerDetails = data?.Details || data?.message || text || 'No response details';
    console.log(`[SMS-DIAGNOSTIC] Provider response status: ${providerStatus} | message: ${providerDetails}`);

    if (res.ok && data?.Status === 'Success') {
      const sessionId = data.Details || 'confirmed';
      console.log(`[SMS-DIAGNOSTIC] Final SMS result: SENT | SessionId: ${sessionId}`);
      return {
        success: true,
        sessionId,
        message: 'Warning SMS delivered successfully via 2Factor TSMS.',
      };
    }

    // Provider error handling (DLT template issues, unregistered sender ID, insufficient balance, etc.)
    const isTemplateOrSenderError =
      providerDetails.toLowerCase().includes('template') ||
      providerDetails.toLowerCase().includes('sender id') ||
      providerDetails.toLowerCase().includes('not recognized');

    const formattedErrorMessage = isTemplateOrSenderError
      ? `2Factor TSMS rejected: ${providerDetails} (Indian TRAI DLT registration required for Sender ID '${senderId}' & Template '${templateName}' on 2Factor.in dashboard)`
      : `2Factor SMS delivery failed: ${providerDetails}`;

    console.log(`[SMS-DIAGNOSTIC] Final SMS result: FAILED | Reason: ${formattedErrorMessage}`);

    return {
      success: false,
      error: isTemplateOrSenderError ? 'TEMPLATE_OR_PROVIDER_CONFIG_ERROR' : 'SMS_DISPATCH_FAILED',
      message: formattedErrorMessage,
      details: providerDetails,
    };
  } catch (err: any) {
    const networkErrorMsg = `Network failure connecting to 2Factor gateway: ${err.message}`;
    console.log(`[SMS-DIAGNOSTIC] Final SMS result: FAILED | Exception: ${networkErrorMsg}`);
    return {
      success: false,
      error: 'GATEWAY_ERROR',
      message: networkErrorMsg,
    };
  }
}
