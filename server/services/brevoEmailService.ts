import nodemailer from 'nodemailer';

export interface BrevoConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

export interface WarningEmailData {
  recipientEmail: string;
  recipientName?: string;
  alertSeverity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'ADVISORY' | 'WATCH';
  state: string;
  district: string;
  riskLevel: string;
  riskScore: number;
  mainContributingFactors: string[];
  weatherConditions: {
    currentPrecipitationMm?: number;
    cumulativeRainfall72hMm?: number;
    soilSaturationPercent?: number;
    forecastPrecipitationNext24hMm?: number;
    slopeAngleDegrees?: number;
  };
  alertTimestamp: string;
  recommendedAction: string;
  officialAdvisorySource?: string;
}

/**
 * Validates and retrieves current Brevo configuration from environment
 */
export function getBrevoConfig(): BrevoConfig {
  const apiKey = process.env.BREVO_API_KEY?.trim() || '';
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || '';
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'NER-SAFE Early Warning';

  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not configured in the environment.');
  }
  if (!senderEmail) {
    throw new Error('BREVO_SENDER_EMAIL is not configured in the environment.');
  }

  return { apiKey, senderEmail, senderName };
}

/**
 * Creates a Nodemailer SMTP transporter for Brevo relay
 */
function createSmtpTransporter(config: BrevoConfig) {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // TLS via STARTTLS
    auth: {
      user: config.senderEmail,
      pass: config.apiKey,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Checks Brevo authentication status via REST API v3 or SMTP Relay
 */
export async function testBrevoAuthentication(): Promise<{
  success: boolean;
  channel: 'REST_API' | 'SMTP_RELAY' | 'NONE';
  email?: string;
  companyName?: string;
  error?: string;
}> {
  const config = getBrevoConfig();

  // Try REST API v3 first
  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': config.apiKey,
      },
    });

    if (response.ok) {
      const data = (await response.json()) as any;
      return {
        success: true,
        channel: 'REST_API',
        email: data.email,
        companyName: data.companyName,
      };
    }
  } catch {
    // Continue to SMTP check
  }

  // If REST API fails, test SMTP relay
  try {
    const transporter = createSmtpTransporter(config);
    await transporter.verify();
    return {
      success: true,
      channel: 'SMTP_RELAY',
      email: config.senderEmail,
      companyName: config.senderName,
    };
  } catch (smtpErr: any) {
    return {
      success: false,
      channel: 'NONE',
      error: `Brevo authentication failed. (REST API 401 & SMTP error: ${smtpErr.message || 'Authentication failed'}). Note: If using an SMTP key (xsmtpsib-...), ensure your BREVO_SENDER_EMAIL matches your Brevo account login. If using REST API, generate an API Key (xkeysib-...) in Brevo SMTP & API -> API Keys.`,
    };
  }
}

/**
 * Dispatches an email via Brevo using REST API v3 with SMTP Relay fallback
 */
async function sendBrevoMail(params: {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getBrevoConfig();
  const recipientEmail = params.toEmail.trim().toLowerCase();
  const recipientName = params.toName?.trim() || recipientEmail.split('@')[0];

  // Try REST API v3
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: config.senderName,
          email: config.senderEmail,
        },
        to: [
          {
            email: recipientEmail,
            name: recipientName,
          },
        ],
        subject: params.subject,
        htmlContent: params.htmlContent,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as any;
      return {
        success: true,
        messageId: data.messageId,
      };
    }
  } catch {
    // Fall back to SMTP
  }

  // Fallback: SMTP Relay
  try {
    const transporter = createSmtpTransporter(config);
    const info = await transporter.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to: `"${recipientName}" <${recipientEmail}>`,
      subject: params.subject,
      html: params.htmlContent,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (smtpError: any) {
    return {
      success: false,
      error: `Brevo dispatch failed: ${smtpError.message || 'Unable to deliver message'}`,
    };
  }
}

/**
 * Sends a transactional 6-digit OTP verification email via Brevo
 */
export async function sendOTPEmail(params: {
  email: string;
  otp: string;
  name?: string;
  expirationMinutes?: number;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { email, otp, name, expirationMinutes = 10 } = params;
  const recipientDisplayName = name?.trim() || 'NER-SAFE Resident / Responder';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NER-SAFE Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; border-bottom: 3px solid #0284c7;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
                      NER-SAFE <span style="color: #38bdf8; font-weight: 400; font-size: 14px;">| Early Warning Network</span>
                    </div>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                      North-Eastern Region Landslide & Hydro-Met Risk Intelligence
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                Email Verification Code
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hello <strong>${recipientDisplayName}</strong>,<br>
                Please use the one-time verification code below to verify your email address and activate real-time landslide & disaster advisories for your district:
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #f8fafc; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px 16px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #0284c7; margin-bottom: 6px;">
                      Your One-Time Passcode
                    </div>
                    <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0f172a; font-family: monospace;">
                      ${otp}
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
                      ⏱ Valid for the next <strong>${expirationMinutes} minutes</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                If you did not request this verification code, you can safely ignore this email. Do not share this code with anyone.
              </p>

              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-top: 24px;">
                <div style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 2px;">
                  🛡️ Security & Privacy Notice
                </div>
                <div style="font-size: 11px; color: #64748b; line-height: 1.4;">
                  NER-SAFE official alerts will only be sent for geolocated hazard warnings and emergency updates in your registered North-Eastern states.
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <div style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
                NER-SAFE Landslide Intelligence Network &bull; Integrated with ECMWF/WMO Weather Telemetry<br>
                This is an automated operational transmission from Brevo Transactional Email.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendBrevoMail({
    toEmail: email,
    toName: recipientDisplayName,
    subject: `[NER-SAFE] Your One-Time Passcode: ${otp}`,
    htmlContent,
  });
}

/**
 * Sends a structured, reusable disaster warning / landslide advisory email via Brevo
 */
export async function sendWarningEmail(
  warningData: WarningEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const {
    recipientEmail,
    recipientName = 'Resident / Local Authority',
    alertSeverity,
    state,
    district,
    riskLevel,
    riskScore,
    mainContributingFactors,
    weatherConditions,
    alertTimestamp,
    recommendedAction,
    officialAdvisorySource = 'NER-SAFE Landslide & Hydro-Meteorological Risk Intelligence Engine',
  } = warningData;

  const severityColor =
    alertSeverity === 'CRITICAL'
      ? '#dc2626'
      : alertSeverity === 'HIGH'
      ? '#ea580c'
      : alertSeverity === 'MODERATE'
      ? '#d97706'
      : '#0284c7';

  const severityBg =
    alertSeverity === 'CRITICAL'
      ? '#fef2f2'
      : alertSeverity === 'HIGH'
      ? '#fff7ed'
      : alertSeverity === 'MODERATE'
      ? '#fffbeb'
      : '#f0f9ff';

  const factorsHtml =
    mainContributingFactors && mainContributingFactors.length > 0
      ? mainContributingFactors
          .map((factor) => `<li style="margin-bottom: 6px; color: #334155;">${factor}</li>`)
          .join('')
      : '<li style="color: #64748b;">Severe precipitation and elevated geological slope saturation.</li>';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NER-SAFE Early Warning Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Alert Header Banner -->
          <tr>
            <td style="background-color: ${severityColor}; padding: 24px 32px;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #ffffff; opacity: 0.9;">
                      OFFICIAL DISASTER ADVISORY &bull; ${alertSeverity} ALERT
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: #ffffff; margin-top: 4px;">
                      ${district}, ${state}
                    </div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <div style="background-color: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 8px; padding: 8px 12px; text-align: center;">
                      <div style="font-size: 10px; color: #ffffff; text-transform: uppercase; font-weight: 700;">Risk Score</div>
                      <div style="font-size: 24px; font-weight: 900; color: #ffffff;">${riskScore}<span style="font-size: 14px; font-weight: 400;">/100</span></div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary Box -->
          <tr>
            <td style="padding: 28px 32px 16px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Dear <strong>${recipientName}</strong>,<br>
                The <strong>NER-SAFE Multi-Source Hydro-Meteorological Early Warning System</strong> has evaluated severe geological risk indicators in your registered district of <strong>${district}, ${state}</strong>.
              </p>

              <!-- Alert Details Box -->
              <div style="background-color: ${severityBg}; border-left: 4px solid ${severityColor}; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                  ⚠️ Evaluated Risk Level: ${riskLevel}
                </div>
                <div style="font-size: 12px; color: #475569; margin-bottom: 8px;">
                  Issued at: <strong>${new Date(alertTimestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</strong>
                </div>
                <div style="font-size: 13px; line-height: 1.5; color: #1e293b;">
                  <strong>Action Required:</strong> ${recommendedAction}
                </div>
              </div>

              <!-- Contributing Factors -->
              <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #0f172a;">
                Key Hazard Drivers & Telemetry
              </h3>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                ${factorsHtml}
              </ul>

              <!-- Telemetry Table -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 24px; font-size: 12px;">
                <tr>
                  <td style="padding: 6px 12px; color: #64748b;">Current Precipitation:</td>
                  <td style="padding: 6px 12px; font-weight: 700; color: #0f172a; text-align: right;">
                    ${weatherConditions.currentPrecipitationMm ?? 'N/A'} mm/h
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; color: #64748b;">72h Cumulative Rainfall:</td>
                  <td style="padding: 6px 12px; font-weight: 700; color: #0f172a; text-align: right;">
                    ${weatherConditions.cumulativeRainfall72hMm ?? 'N/A'} mm
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; color: #64748b;">Soil Moisture Saturation:</td>
                  <td style="padding: 6px 12px; font-weight: 700; color: #0f172a; text-align: right;">
                    ${weatherConditions.soilSaturationPercent ?? 'N/A'}%
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; color: #64748b;">24h Forecast Precipitation:</td>
                  <td style="padding: 6px 12px; font-weight: 700; color: #0f172a; text-align: right;">
                    ${weatherConditions.forecastPrecipitationNext24hMm ?? 'N/A'} mm
                  </td>
                </tr>
              </table>

              <!-- Safety Guidance -->
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                  🚨 Emergency Guidelines:
                </div>
                <div style="font-size: 12px; color: #475569; line-height: 1.5;">
                  &bull; Avoid steep roadside cutting slopes and landslide-prone mountain passes.<br>
                  &bull; In case of slope fissures or sudden muddy water runoff, evacuate to designated high-ground shelters.<br>
                  &bull; Keep emergency kits, essential medication, and local SDMA/NDRF contacts accessible.
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <div style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
                ${officialAdvisorySource}<br>
                For official emergency support, dial State Disaster Management Authority (1070/1077) or NDRF (112).
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendBrevoMail({
    toEmail: recipientEmail,
    toName: recipientName,
    subject: `⚠️ [${alertSeverity}] Landslide Advisory: ${district}, ${state} (Risk: ${riskScore}/100)`,
    htmlContent,
  });
}
