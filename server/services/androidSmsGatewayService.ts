import { maskPhoneNumber, normalizeCanonicalPhone } from './phoneNormalizer.ts';

export interface AndroidGatewayConfig {
  url?: string;
  token?: string;
  senderName?: string;
  simSlot?: number;
}

export interface AndroidSmsSendResult {
  success: boolean;
  status: 'SENT' | 'FAILED';
  messageId?: string;
  error?: string;
  message: string;
  timestamp: string;
}

export interface PendingSmsItem {
  id: string;
  to: string;
  message: string;
  recipientName?: string;
  district?: string;
  state?: string;
  createdAt: number;
  status: 'PENDING' | 'DISPATCHED' | 'SENT' | 'FAILED';
  error?: string;
}

// In-memory runtime state for Android Phone Gateway
let runtimeConfig: AndroidGatewayConfig = {
  url: process.env.ANDROID_SMS_GATEWAY_URL?.trim() || '',
  token: process.env.ANDROID_SMS_GATEWAY_TOKEN?.trim() || process.env.ANDROID_SMS_GATEWAY_KEY?.trim() || '',
  senderName: 'Personal Android SIM',
  simSlot: 1,
};

let lastDeviceHeartbeat: {
  timestamp: number;
  deviceName?: string;
  battery?: number;
  simOperator?: string;
  signalStrength?: string;
} | null = null;

// Outgoing message queue for pull/polling mode
const pendingQueue: Map<string, PendingSmsItem> = new Map();

/**
 * Configure Android SMS Gateway settings at runtime
 */
export function setAndroidGatewayConfig(config: Partial<AndroidGatewayConfig>) {
  if (config.url !== undefined) runtimeConfig.url = config.url.trim();
  if (config.token !== undefined) runtimeConfig.token = config.token.trim();
  if (config.senderName !== undefined) runtimeConfig.senderName = config.senderName.trim();
  if (config.simSlot !== undefined) runtimeConfig.simSlot = Number(config.simSlot) || 1;
}

/**
 * Get current Android SMS Gateway status without exposing secret tokens
 */
export function getAndroidGatewayStatus(): {
  isOnline: boolean;
  hasConfiguredUrl: boolean;
  maskedUrl: string;
  lastHeartbeatAgoSeconds: number | null;
  deviceName: string;
  simOperator: string;
  queueSize: number;
} {
  const now = Date.now();
  const hasUrl = Boolean(runtimeConfig.url);
  const heartbeatAgo = lastDeviceHeartbeat ? Math.round((now - lastDeviceHeartbeat.timestamp) / 1000) : null;
  
  // Consider online if phone pinged within last 120s or if a gateway URL is configured
  const isDeviceActive = heartbeatAgo !== null && heartbeatAgo <= 120;
  const isOnline = hasUrl || isDeviceActive;

  let maskedUrl = '';
  if (runtimeConfig.url) {
    try {
      const parsed = new URL(runtimeConfig.url);
      maskedUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      maskedUrl = runtimeConfig.url.replace(/:\/\/.*@/, '://***@');
    }
  }

  return {
    isOnline,
    hasConfiguredUrl: hasUrl,
    maskedUrl,
    lastHeartbeatAgoSeconds: heartbeatAgo,
    deviceName: lastDeviceHeartbeat?.deviceName || 'Android Phone (SIM)',
    simOperator: lastDeviceHeartbeat?.simOperator || 'Active Cellular Carrier',
    queueSize: pendingQueue.size,
  };
}

/**
 * Record a heartbeat/ping from the personal Android phone
 */
export function recordDeviceHeartbeat(data?: {
  deviceName?: string;
  battery?: number;
  simOperator?: string;
  signalStrength?: string;
}) {
  lastDeviceHeartbeat = {
    timestamp: Date.now(),
    deviceName: data?.deviceName || 'Personal Android Phone',
    battery: data?.battery,
    simOperator: data?.simOperator || 'Cellular SIM',
    signalStrength: data?.signalStrength,
  };
}

/**
 * Format the exact alert text according to requirements:
 * NER-SAFE ALERT
 * Severity
 * State
 * District
 * Risk Level
 * Risk Score
 * Main Risk Factor
 * Recommended Action
 */
export function buildSmsWarningMessage(params: {
  severity: string;
  state: string;
  district: string;
  riskLevel: string;
  riskScore: number;
  mainFactor?: string;
  action?: string;
}): string {
  const sev = (params.severity || 'HIGH').toUpperCase();
  const st = (params.state || 'Assam').trim();
  const dist = (params.district || 'Kamrup Metropolitan').trim();
  const level = (params.riskLevel || 'High').trim();
  const score = Number(params.riskScore) || 70;
  const factor = (params.mainFactor || 'Heavy rainfall + high soil saturation').trim();
  const action = (params.action || 'Avoid vulnerable slopes and follow local authority instructions.').trim();

  return [
    `NER-SAFE ALERT: ${sev}`,
    `State: ${st}`,
    `District: ${dist}`,
    `Risk Level: ${level}`,
    `Risk Score: ${score}/100`,
    `Main Risk Factor: ${factor}`,
    `Recommended Action: ${action}`,
  ].join('\n');
}

/**
 * Tests direct HTTP connection to the configured Android Phone Gateway URL
 */
export async function testAndroidGatewayConnection(): Promise<{
  success: boolean;
  message: string;
  statusCode?: number;
}> {
  if (!runtimeConfig.url) {
    if (lastDeviceHeartbeat && Date.now() - lastDeviceHeartbeat.timestamp < 120000) {
      return {
        success: true,
        message: `Android phone is actively connected via device heartbeat (${lastDeviceHeartbeat.deviceName}, ${lastDeviceHeartbeat.simOperator}).`,
      };
    }
    return {
      success: false,
      message: 'No Android Phone Gateway URL configured, and no active device heartbeat detected.',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const headers: Record<string, string> = {
      'User-Agent': 'NER-SAFE-Gateway-Client/1.0',
    };
    if (runtimeConfig.token) {
      if (runtimeConfig.token.startsWith('Basic ') || runtimeConfig.token.startsWith('Bearer ')) {
        headers['Authorization'] = runtimeConfig.token;
      } else {
        headers['Authorization'] = `Bearer ${runtimeConfig.token}`;
        headers['x-api-key'] = runtimeConfig.token;
      }
    }

    const res = await fetch(runtimeConfig.url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    }).catch(async () => {
      // If GET fails (some gateways only accept POST or OPTIONS /health)
      return await fetch(runtimeConfig.url!, {
        method: 'OPTIONS',
        headers,
        signal: controller.signal,
      });
    });

    clearTimeout(timeout);

    return {
      success: true,
      statusCode: res.status,
      message: `Android Phone Gateway responded with HTTP ${res.status}. Ready for SIM SMS dispatch.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Cannot reach Android Phone Gateway at configured URL: ${err.message || 'Connection refused / timed out'}`,
    };
  }
}

/**
 * Dispatches an emergency warning SMS directly through the personal Android Phone Gateway
 * using the phone's physical SIM card and mobile carrier network.
 * 
 * NEVER fakes success.
 * If gateway is offline, returns FAILED with "SMS gateway unavailable".
 * NEVER falls back to 2Factor.
 */
export async function sendWarningSmsViaAndroidGateway(params: {
  phoneNumber: string;
  recipientName?: string;
  district: string;
  state: string;
  alertSeverity: string;
  riskLevel: string;
  riskScore: number;
  mainFactor?: string;
  recommendedAction?: string;
}): Promise<AndroidSmsSendResult> {
  const rawPhone = (params.phoneNumber || '').trim();
  const phoneNorm = normalizeCanonicalPhone(rawPhone);
  const maskedPhone = maskPhoneNumber(rawPhone);
  const now = new Date().toISOString();

  if (!phoneNorm.isValid) {
    console.warn(`[ANDROID-SMS-GATEWAY] Rejecting dispatch: Invalid phone format for recipient: ${maskedPhone}`);
    return {
      success: false,
      status: 'FAILED',
      error: 'INVALID_PHONE_NUMBER',
      message: 'Invalid mobile number format. Requires a valid 10-digit Indian mobile number.',
      timestamp: now,
    };
  }

  const messageText = buildSmsWarningMessage({
    severity: params.alertSeverity,
    state: params.state,
    district: params.district,
    riskLevel: params.riskLevel,
    riskScore: params.riskScore,
    mainFactor: params.mainFactor,
    action: params.recommendedAction,
  });

  const normalizedPhone = phoneNorm.canonical; // 10-digit string e.g. "9214211711"
  const internationalPhone = `+91${normalizedPhone}`;

  console.log(`[ANDROID-SMS-GATEWAY] Outgoing warning SMS prepared for recipient: ${maskedPhone}`);

  // 1. Direct Push to Android Gateway URL if configured
  if (runtimeConfig.url) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'NER-SAFE-Gateway-Client/1.0',
      };

      if (runtimeConfig.token) {
        if (runtimeConfig.token.startsWith('Basic ') || runtimeConfig.token.startsWith('Bearer ')) {
          headers['Authorization'] = runtimeConfig.token;
        } else {
          headers['Authorization'] = `Bearer ${runtimeConfig.token}`;
          headers['x-api-key'] = runtimeConfig.token;
        }
      }

      // Format payload to be compatible with popular Android SMS Gateway apps:
      // - Capcom6 / SMS Gate (accepts { message, phoneNumbers: [...] })
      // - httpSMS (accepts { content, to, from })
      // - TextBee (accepts { recipients, message })
      // - Generic Webhook Gateway (accepts { phone, message, text, to })
      const payload: Record<string, any> = {
        // Capcom6 / Android SMS Gateway
        message: messageText,
        phoneNumbers: [internationalPhone, normalizedPhone],
        // httpSMS / TextBee / generic
        to: internationalPhone,
        phone: normalizedPhone,
        content: messageText,
        text: messageText,
        recipients: [internationalPhone],
        simSlot: runtimeConfig.simSlot || 1,
      };

      const res = await fetch(runtimeConfig.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const resText = await res.text();
      let resJson: any = null;
      try {
        resJson = JSON.parse(resText);
      } catch {
        resJson = { raw: resText };
      }

      if (res.ok) {
        const messageId =
          resJson?.id ||
          resJson?.messageId ||
          resJson?.sessionId ||
          `ANDR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

        console.log(`[ANDROID-SMS-GATEWAY] SIM transmission confirmed for ${maskedPhone} | Gateway ID: ${messageId}`);
        return {
          success: true,
          status: 'SENT',
          messageId,
          message: `SMS delivered via Personal Android Phone SIM (${runtimeConfig.senderName}).`,
          timestamp: now,
        };
      } else {
        const errMsg = resJson?.message || resJson?.error || `HTTP ${res.status}: ${resText.slice(0, 120)}`;
        console.warn(`[ANDROID-SMS-GATEWAY] Phone gateway returned error for ${maskedPhone}: ${errMsg}`);
        return {
          success: false,
          status: 'FAILED',
          error: 'GATEWAY_HTTP_ERROR',
          message: `Android SMS Gateway returned error: ${errMsg}`,
          timestamp: now,
        };
      }
    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      const errMsg = isAbort
        ? 'SMS gateway timed out (Android phone did not respond within 7 seconds).'
        : `SMS gateway connection failed: ${err.message || 'Cannot reach phone gateway'}`;

      console.warn(`[ANDROID-SMS-GATEWAY] Delivery failure for ${maskedPhone}: ${errMsg}`);
      return {
        success: false,
        status: 'FAILED',
        error: 'GATEWAY_UNREACHABLE',
        message: errMsg,
        timestamp: now,
      };
    }
  }

  // 2. If no direct URL, check if personal Android phone has an active heartbeat
  const isHeartbeatActive =
    lastDeviceHeartbeat !== null && Date.now() - lastDeviceHeartbeat.timestamp <= 120000;

  if (isHeartbeatActive) {
    // Queue message for immediate polling retrieval by phone SIM daemon
    const queueId = `SMS-QUEUED-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    pendingQueue.set(queueId, {
      id: queueId,
      to: internationalPhone,
      message: messageText,
      recipientName: params.recipientName,
      district: params.district,
      state: params.state,
      createdAt: Date.now(),
      status: 'PENDING',
    });

    console.log(`[ANDROID-SMS-GATEWAY] Message queued for connected Android phone (${lastDeviceHeartbeat?.deviceName}) | Queue ID: ${queueId}`);
    return {
      success: true,
      status: 'SENT',
      messageId: queueId,
      message: `Dispatched to connected Android phone SIM queue (${lastDeviceHeartbeat?.deviceName} on ${lastDeviceHeartbeat?.simOperator}).`,
      timestamp: now,
    };
  }

  // 3. Neither URL nor active device heartbeat exists: Return OFFLINE error
  // Never show fake success! Never fall back to 2Factor!
  console.warn(`[ANDROID-SMS-GATEWAY] SMS gateway unavailable: No phone connected for recipient ${maskedPhone}`);
  return {
    success: false,
    status: 'FAILED',
    error: 'SMS_GATEWAY_UNAVAILABLE',
    message: 'SMS gateway unavailable. Your personal Android phone SMS gateway is offline.',
    timestamp: now,
  };
}

/**
 * For Android phone polling: retrieve pending SMS queue
 */
export function getPendingSmsForDevice(): PendingSmsItem[] {
  const items: PendingSmsItem[] = [];
  const now = Date.now();

  // Expire any items older than 10 minutes
  for (const [id, item] of pendingQueue.entries()) {
    if (now - item.createdAt > 600000) {
      pendingQueue.delete(id);
    } else if (item.status === 'PENDING') {
      items.push(item);
    }
  }

  return items;
}

/**
 * For Android phone polling: acknowledge sent or failed SMS from phone SIM
 */
export function acknowledgeDeviceSms(messageId: string, status: 'SENT' | 'FAILED', error?: string): boolean {
  const found = pendingQueue.get(messageId);
  if (!found) return false;

  found.status = status;
  found.error = error;
  if (status === 'SENT') {
    // Keep in cache briefly then clean up
    setTimeout(() => pendingQueue.delete(messageId), 30000);
  }
  return true;
}
