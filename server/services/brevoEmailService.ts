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
  recipientState?: string;
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
  regionalAdvisoryParagraph?: string;
}

/**
 * Pre-recorded Regional-Language Advisory Paragraphs for North-Eastern States
 * Selected by recipient.state:
 * Assam → Assamese
 * Arunachal Pradesh → English
 * Manipur → Meitei
 * Meghalaya → Khasi
 * Mizoram → Mizo
 * Nagaland → English
 * Sikkim → Nepali
 * Tripura → Bengali
 */
export interface RegionalAdvisoryEntry {
  state: string;
  language: string;
  nativeTitle: string;
  paragraph: string;
}

export const STATE_REGIONAL_ADVISORY_MAP: Record<string, RegionalAdvisoryEntry> = {
  'assam': {
    state: 'Assam',
    language: 'Assamese',
    nativeTitle: 'অসমীয়া Regional Advisory:',
    paragraph: 'এইটো এটা জৰুৰী দুৰ্যোগ সতৰ্কবাণী। আপোনাৰ অঞ্চলত ভূমিস্খলন, ধাৰাসাৰ বৰষুণ বা অন্যান্য প্ৰাকৃতিক বিপদৰ সম্ভাৱনা আছে। অনুগ্ৰহ কৰি বিপদজনক ঢাল, পাহাৰীয়া পথ আৰু ভূমিস্খলনপ্ৰৱণ অঞ্চল এৰাই চলক আৰু স্থানীয় কৰ্তৃপক্ষৰ নিৰ্দেশনা অনুসৰণ কৰক।',
  },
  'arunachal pradesh': {
    state: 'Arunachal Pradesh',
    language: 'English',
    nativeTitle: 'Regional Advisory:',
    paragraph: 'This is an official disaster warning. Your area may be affected by landslides, heavy rainfall, or other hazards. Please avoid vulnerable slopes and mountain roads, stay alert, and follow instructions issued by local authorities.',
  },
  'manipur': {
    state: 'Manipur',
    language: 'Meitei (Manipuri)',
    nativeTitle: 'Meitei Regional Advisory:',
    paragraph: 'মসিগী মেসেজ অসি অশেংবা দুর্যোগ সতৰ্কতা অমনি। নংগী এলাকা অসিদা ভূমিস্খলন, অমাং-অমাংগী উমাংবী নুংশিত অমসুং অতোপ্পা হায়জরোল শোয়দনা ইয়াই। খুদংচাবা লৈবা পাহাড়ী লাইন অমসুং অরোয়বা এলাকা অসি থাদোকউ অমসুং স্থানীয় কর্তৃপক্ষগী নির্দেশনা অনুসরণ তৌউ।',
  },
  'meghalaya': {
    state: 'Meghalaya',
    language: 'Khasi',
    nativeTitle: 'Khasi Regional Advisory:',
    paragraph: 'Kane ka dei ka jingmaham halor ka jingjia shawi. Ka don ka jingma jong ka jingtuid ka khyndew, u slap uba jur ne kiwei pat ki jingma ha ka shnong jong phi. Sngewbha kiar na ki jaka ba don jingma, ki surok lum bad ki jaka ba lah ban jia ka jingtuid khyndew, bad bud ia ki jingbthah jong ki bor sorkar shnong.',
  },
  'mizoram': {
    state: 'Mizoram',
    language: 'Mizo',
    nativeTitle: 'Mizo Regional Advisory:',
    paragraph: 'Hemi hi emergency disaster warning a ni. In khuah laiin, ruahsur tam tak, emaw thil hlauhawm dang thlen theih tih hmunah hian harsatna a thlen theih. Hmun hlauhawm, tlang kawng leh landslide thlen theih hmun te chu kal loh a, local authority thuchhuahte zawm rawh le.',
  },
  'nagaland': {
    state: 'Nagaland',
    language: 'English',
    nativeTitle: 'Regional Advisory:',
    paragraph: 'This is an official disaster warning. Your area may be affected by landslides, heavy rainfall, or related hazards. Please avoid dangerous slopes and vulnerable roads, remain alert, and follow instructions from local authorities.',
  },
  'sikkim': {
    state: 'Sikkim',
    language: 'Nepali',
    nativeTitle: 'नेपाली Regional Advisory:',
    paragraph: 'यो एक आधिकारिक विपद् चेतावनी हो। तपाईंको क्षेत्रमा पहिरो, भारी वर्षा वा अन्य प्राकृतिक जोखिम हुन सक्ने सम्भावना छ। कृपया जोखिमयुक्त भिरालो ठाउँ, पहाडी सडक र पहिरो सम्भावিত क्षेत्रबाट टाढा रहनुहोस् र स्थानीय प्रशासनको निर्देशन पालना गर्नुहोस्।',
  },
  'tripura': {
    state: 'Tripura',
    language: 'Bengali',
    nativeTitle: 'বাংলা Regional Advisory:',
    paragraph: 'এটি একটি সরকারি দুর্যোগ সতর্কবার্তা। আপনার এলাকায় ভূমিধস, ভারী বৃষ্টি বা অন্যান্য প্রাকৃতিক বিপদের সম্ভাবনা রয়েছে। অনুগ্রহ করে ঝুঁকিপূর্ণ পাহাড়ি এলাকা, ঢাল এবং রাস্তা এড়িয়ে চলুন এবং স্থানীয় প্রশাসনের নির্দেশনা মেনে চলুন।',
  },
};

export function getRegionalAdvisoryForState(stateName?: string): RegionalAdvisoryEntry {
  const norm = (stateName || '').toLowerCase().trim();
  if (norm.includes('assam')) return STATE_REGIONAL_ADVISORY_MAP['assam'];
  if (norm.includes('arunachal')) return STATE_REGIONAL_ADVISORY_MAP['arunachal pradesh'];
  if (norm.includes('manipur')) return STATE_REGIONAL_ADVISORY_MAP['manipur'];
  if (norm.includes('meghalaya')) return STATE_REGIONAL_ADVISORY_MAP['meghalaya'];
  if (norm.includes('mizoram')) return STATE_REGIONAL_ADVISORY_MAP['mizoram'];
  if (norm.includes('nagaland')) return STATE_REGIONAL_ADVISORY_MAP['nagaland'];
  if (norm.includes('sikkim')) return STATE_REGIONAL_ADVISORY_MAP['sikkim'];
  if (norm.includes('tripura')) return STATE_REGIONAL_ADVISORY_MAP['tripura'];

  // Default fallback to English
  return STATE_REGIONAL_ADVISORY_MAP['arunachal pradesh'];
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
  textContent?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getBrevoConfig();
  const recipientEmail = params.toEmail.trim().toLowerCase();
  const recipientName = params.toName?.trim() || recipientEmail.split('@')[0];

  // Try REST API v3
  try {
    const payload: Record<string, any> = {
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
    };
    if (params.textContent) {
      payload.textContent = params.textContent;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify(payload),
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
      text: params.textContent,
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
    regionalAdvisoryParagraph,
  } = warningData;

  // Select corresponding pre-recorded regional-language advisory paragraph by recipient.state
  const targetStateForAdvisory = warningData.recipientState || state || 'Assam';
  const regionalAdvisory = getRegionalAdvisoryForState(targetStateForAdvisory);
  const advisoryTitle = regionalAdvisory.nativeTitle || `${regionalAdvisory.language} Regional Advisory:`;
  const selectedParagraph = regionalAdvisory.paragraph;

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

  const factorsList =
    mainContributingFactors && mainContributingFactors.length > 0
      ? mainContributingFactors
      : ['Severe precipitation and elevated geological slope saturation.'];

  const factorsHtml = factorsList
    .map((factor) => `<li style="margin-bottom: 6px; color: #334155;">${factor}</li>`)
    .join('');

  const subject = `⚠️ [${alertSeverity}] Landslide Advisory: ${district}, ${state} (Risk: ${riskScore}/100)`;

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
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #ffffff; opacity: 0.95;">
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

              <!-- Regional Advisory Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 8px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <div style="font-size: 13px; font-weight: 800; color: #1e40af; margin-bottom: 6px;">
                      ${advisoryTitle}
                    </div>
                    <div style="font-size: 14px; line-height: 1.6; color: #1e293b; font-weight: 500;">
                      ${selectedParagraph}
                    </div>
                  </td>
                </tr>
              </table>

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
                    ${weatherConditions?.currentPrecipitationMm ?? 'N/A'} mm/h
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; color: #64748b;">72h Cumulative Rainfall:</td>
                  <td style="padding: 6px 12px; font-weight: 700; color: #0f172a; text-align: right;">
                    ${weatherConditions?.cumulativeRainfall72hMm ?? 'N/A'} mm
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; color: #64748b;">Soil Moisture Saturation:</td>
                  <td style="padding: 6px 12px; font-weight: 700; color: #0f172a; text-align: right;">
                    ${weatherConditions?.soilSaturationPercent ?? 'N/A'}%
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; color: #64748b;">24h Forecast Precipitation:</td>
                  <td style="padding: 6px 12px; font-weight: 700; color: #0f172a; text-align: right;">
                    ${weatherConditions?.forecastPrecipitationNext24hMm ?? 'N/A'} mm
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

  const textContent = `
[OFFICIAL DISASTER ADVISORY - ${alertSeverity} ALERT]
Target Area: ${district}, ${state}
Risk Score: ${riskScore}/100 | Evaluated Risk Level: ${riskLevel}
Issued at: ${new Date(alertTimestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

${advisoryTitle}
${selectedParagraph}

ACTION REQUIRED:
${recommendedAction}

KEY HAZARD DRIVERS:
${factorsList.map((f) => `• ${f}`).join('\n')}

TELEMETRY:
• Current Precipitation: ${weatherConditions?.currentPrecipitationMm ?? 'N/A'} mm/h
• 72h Cumulative Rainfall: ${weatherConditions?.cumulativeRainfall72hMm ?? 'N/A'} mm
• Soil Saturation: ${weatherConditions?.soilSaturationPercent ?? 'N/A'}%
• 24h Forecast Precipitation: ${weatherConditions?.forecastPrecipitationNext24hMm ?? 'N/A'} mm

EMERGENCY GUIDELINES:
• Avoid steep roadside cutting slopes and landslide-prone mountain passes.
• In case of slope fissures or sudden muddy water runoff, evacuate to designated high-ground shelters.
• Keep emergency kits, essential medication, and local SDMA/NDRF contacts accessible.

${officialAdvisorySource}
State Disaster Management Authority (1070/1077) | NDRF (112)
`.trim();

  console.log('[ALERT EMAIL DISPATCH TRACE]');
  console.log('recipientEmail:', recipientEmail);
  console.log('recipientState:', targetStateForAdvisory);
  console.log('advisoryTitle:', advisoryTitle);
  console.log('selectedParagraph:', selectedParagraph);
  console.log('recommendedAction:', recommendedAction);
  console.log('htmlContent.includes(selectedParagraph):', htmlContent.includes(selectedParagraph));

  return sendBrevoMail({
    toEmail: recipientEmail,
    toName: recipientName,
    subject,
    htmlContent,
    textContent,
  });
}
