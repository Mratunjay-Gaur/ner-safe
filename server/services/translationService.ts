/**
 * Emergency Alert Translation Engine using Gemini API (@google/genai)
 * NER-SAFE Multilingual Notification System (SIH26001)
 *
 * Implements:
 * - High-speed emergency translation using active Gemini models (gemini-3.1-flash-lite, gemini-3.8-flash)
 * - Authentic native disaster emergency templates as immediate fallbacks so alerts are NEVER in English
 * - In-memory cache keyed by hash(alertContent) + languageCode to prevent redundant LLM calls
 * - 6.5-second timeout with immediate native template guarantee
 */

import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import {
  SUPPORTED_LANGUAGES,
  getLanguageMetadata,
  isValidLanguageCode,
} from './languageService.ts';

export interface AlertTranslationInput {
  alertSeverity: string; // 'CRITICAL' | 'HIGH' | 'MODERATE' | 'ADVISORY' | 'WATCH'
  state: string;
  district: string;
  riskLevel: string;
  riskScore: number;
  alertMessage: string;
  recommendedAction: string;
  mainFactors?: string[];
  helplineNumbers?: string[];
}

export interface TranslatedAlertContent {
  languageCode: string;
  languageName: string;
  nativeLanguageName: string;
  translatedSubject: string;
  translatedSeverityLabel: string;
  translatedTitle: string;
  translatedGreeting: string;
  translatedIntro: string;
  translatedAlertMessage: string;
  translatedRecommendedAction: string;
  translatedFactors: string[];
  translatedGuidelinesTitle?: string;
  translatedGuidelines?: string[];
  translatedHelplineNotice?: string;
  smsMessageText: string;
  isFallbackEnglish: boolean;
  translationLatencyMs: number;
  fromCache?: boolean;
}

// In-memory cache for translated alert content to deduplicate identical alerts
interface CacheEntry {
  data: TranslatedAlertContent;
  expiresAt: number;
}
const translationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * High-fidelity native disaster emergency templates for all supported North Eastern languages.
 * Guarantees that alerts are 100% in the recipient's native tongue even during offline/timeout conditions.
 */
const NATIVE_EMERGENCY_TEMPLATES: Record<string, {
  severityLabel: (sev: string) => string;
  subjectTitle: (sev: string, dist: string, st: string, score: number) => string;
  heading: (sevLabel: string, dist: string, st: string) => string;
  greeting: string;
  intro: (dist: string, st: string) => string;
  alertMessage: (msg: string) => string;
  recommendedAction: (act: string) => string;
  factors: (dist: string, st: string) => string[];
  guidelinesTitle: string;
  guidelines: string[];
  helplineNotice: string;
  smsText: (sevLabel: string, dist: string, st: string, score: number, lvl: string) => string;
}> = {
  as: {
    severityLabel: (s) => s === 'CRITICAL' ? 'চৰম বিপদ সতৰ্কবাণী' : s === 'HIGH' ? 'উচ্চ সতৰ্কবাণী' : 'মধ্যম সতৰ্কতা',
    subjectTitle: (s, dist, st, score) => `[অসমীয়া] ⚠️ [${s === 'CRITICAL' ? 'চৰম বিপদ' : 'উচ্চ সতৰ্কবাণী'}] ভূমিস্খলনৰ সতৰ্কবাণী: ${dist}, ${st} (বিপদৰ মাত্ৰা: ${score}/100)`,
    heading: (sev, dist, st) => `⚠️ [${sev}] ভূমিস্খলনৰ সতৰ্কবাণী: ${dist}, ${st}`,
    greeting: 'প্ৰিয় নাগৰিক',
    intro: (dist, st) => `NER-SAFE আগতীয়া সতৰ্কবাণী প্ৰণালীৰ দ্বাৰা আপোনাৰ পঞ্জীভুক্ত জিলা ${dist}, ${st}-ত প্ৰবল ভূমিস্খলনৰ বিপদ সংকেত চিনাক্ত কৰা হৈছে।`,
    alertMessage: (m) => `প্ৰবল বৃষ্টিপাত আৰু মাটিৰ অত্যাধিক আৰ্দ্ৰতাৰ ফলত পাহাৰৰ ঢালসমূহত স্খলনৰ প্ৰবল সম্ভাৱনা সৃষ্টি হৈছে: ${m}`,
    recommendedAction: (a) => `বিপদজনক পাহাৰীয়া ঢাল আৰু স্খলনপ্ৰৱণ এলেকাৰ পৰা অবিলম্বে সুৰক্ষিত আশ্ৰয়স্থললৈ যাওক। স্থানীয় প্ৰশাসনৰ নিৰ্দেশনা মানি চলক। (${a})`,
    factors: (dist, st) => [
      `৭২ ঘণ্টাত হোৱা প্ৰবল সংচিত বৃষ্টিপাতৰ ফলত পাহাৰীয়া ঢালৰ মাটিৰ স্থিৰতা দুৰ্বল হৈ পৰিছে।`,
      `${dist} জিলাৰ পাহাৰীয়া পথ আৰু উপত্যকা অঞ্চলত বোকা-মাটি স্খলনৰ আশংকা অত্যন্ত বেছি।`,
      `স্থানীয় জলস্তৰ আৰু ভূ-পৃষ্ঠৰ চাপ সতৰ্কতাৰ সীমা অতিক্ৰম কৰিছে।`,
    ],
    guidelinesTitle: '🚨 জৰুৰী সুৰক্ষা নিৰ্দেশনা (Assamese Safety Guidelines):',
    guidelines: [
      'পাহাৰৰ থিয় কাষ আৰু স্খলনপ্ৰৱণ পথসমূহত অপ্ৰয়োজনীয় যাতায়াত পৰিহাৰ কৰক।',
      'পাহাৰত ফাট বা হঠাতে ঘোলা বোকাপানী ওলোৱা দেখিলে তৎক্ষণাৎ ওখ সুৰক্ষিত স্থানলৈ যাওক।',
      'জৰুৰীকালীন সাহায্য কিট, প্ৰয়োজনীয় ঔষধ আৰু টৰ্চ সদায় সাজু ৰাখক।',
    ],
    helplineNotice: 'জৰুৰীকালীন সাহায্যৰ বাবে যোগাযোগ কৰক: ৰাজ্যিক দুৰ্যোগ ব্যৱস্থাপনা কৰ্তৃপক্ষ (১০৭০ / ১০৭৭) অথবা NDRF (১১২)',
    smsText: (sev, dist, st, score, lvl) => `NER-SAFE সতৰ্কবাণী: ${sev}\nজিলা: ${dist}, ${st}\nবিপদৰ মাত্ৰা: ${lvl} (${score}/100)\nআশংকা: প্ৰবল বৰষুণ আৰু ভূমিস্খলনৰ সম্ভাৱনা।\nপদক্ষেপ: বিপজ্জনক পাহাৰীয়া এলেকা ত্যাগ কৰি সুৰক্ষিত আশ্ৰয়স্থললৈ যাওক।\nসহায়তা: 1070 / 112`,
  },
  bn: {
    severityLabel: (s) => s === 'CRITICAL' ? 'চরম বিপদ সতর্কতা' : s === 'HIGH' ? 'উচ্চ সতর্কতা' : 'মাঝারি সতর্কতা',
    subjectTitle: (s, dist, st, score) => `[বাংলা] ⚠️ [${s === 'CRITICAL' ? 'চরম বিপদ' : 'উচ্চ সতর্কতা'}] ভূমিধস সতর্কতা: ${dist}, ${st} (ঝুঁকির মাত্রা: ${score}/100)`,
    heading: (sev, dist, st) => `⚠️ [${sev}] ভূমিধসের জরুরী সতর্কতা: ${dist}, ${st}`,
    greeting: 'প্রিয় নাগরিক',
    intro: (dist, st) => `NER-SAFE আর্লি ওয়ার্নিং সিস্টেম আপনার নিবন্ধিত জেলা ${dist}, ${st}-এ মারাত্মক ভূমিধস ঝুঁকি শনাক্ত করেছে।`,
    alertMessage: (m) => `টানা ভারী বৃষ্টিপাত ও মাটির তীব্র আর্দ্রতার কারণে পাহাড়ি ঢালে ভূমিধসের প্রবল আশঙ্কা দেখা দিয়েছে: ${m}`,
    recommendedAction: (a) => `ঝুঁকিপূর্ণ ঢালু এলাকা অবিলম্বে ত্যাগ করুন এবং নিরাপদ আশ্রয়ে যান। স্থানীয় প্রশাসনের নির্দেশ মেনে চলুন। (${a})`,
    factors: (dist, st) => [
      `টানা ভারী বর্ষণে পাহাড়ি ঢালের মাটির ধারণক্ষমতা মারাত্মকভাবে হ্রাস পেয়েছে।`,
      `${dist} জেলার পাহাড়ি ঝুঁকিপূর্ণ রাস্তা ও সংবেদনশীল এলাকায় ধসের প্রবল সম্ভাবনা।`,
      `জলবায়ু সেন্সরে চরম ভূ-প্রাকৃতিক অস্থিরতার ইঙ্গিত পাওয়া গেছে।`,
    ],
    guidelinesTitle: '🚨 জরুরী সুরক্ষা নির্দেশাবলী (Bengali Safety Guidelines):',
    guidelines: [
      'খাড়া পাহাড়ি রাস্তা এবং ধসপ্রবণ এলাকা দিয়ে চলাচল সম্পূর্ণ এড়িয়ে চলুন।',
      'মাটিতে ফাটল বা কাদামাটির স্রোত দেখা দিলে সঙ্গে সঙ্গে নিরাপদ স্থানে সরে যান।',
      'জরুরি কিট, প্রয়োজনীয় ঔষধ এবং টর্চলাইট হাতের কাছে প্রস্তুত রাখুন।',
    ],
    helplineNotice: 'জরুরী হেল্পলাইন: রাজ্য দুর্যোগ ব্যবস্থাপনা (১০৭০ / ১০৭৭) অথবা NDRF (১১২)',
    smsText: (sev, dist, st, score, lvl) => `NER-SAFE সতর্কতা: ${sev}\nজেলা: ${dist}, ${st}\nঝুঁকির মাত্রা: ${lvl} (${score}/100)\nবিপদ: ভারী বৃষ্টি ও মারাত্মক ভূমিধসের ঝুঁকি।\nপদক্ষেপ: অবিলম্বে নিরাপদ আশ্রয়ে যান।\nহেল্পলাইন: 1070 / 112`,
  },
  hi: {
    severityLabel: (s) => s === 'CRITICAL' ? 'अति गंभीर चेतावनी' : s === 'HIGH' ? 'उच्च चेतावनी' : 'मध्यम चेतावनी',
    subjectTitle: (s, dist, st, score) => `[हिन्दी] ⚠️ [${s === 'CRITICAL' ? 'अति गंभीर' : 'उच्च चेतावनी'}] आधिकारिक भूस्खलन चेतावनी: ${dist}, ${st} (जोखिम: ${score}/100)`,
    heading: (sev, dist, st) => `⚠️ [${sev}] भूस्खलन चेतावनी: ${dist}, ${st}`,
    greeting: 'प्रिय नागरिक',
    intro: (dist, st) => `NER-SAFE पूर्व चेतावनी प्रणाली ने आपके पंजीकृत जिले ${dist}, ${st} में गंभीर भूस्खलन जोखिम का आकलन किया है।`,
    alertMessage: (m) => `निरंतर भारी वर्षा और मिट्टी की उच्च संतृप्ति के कारण ढलानों पर भूस्खलन का गंभीर खतरा है: ${m}`,
    recommendedAction: (a) => `संवेदनशील ढलानों से तुरंत दूर हटें और सुरक्षित राहत शिविरों की ओर जाएं। स्थानीय प्रशासन के निर्देशों का पालन करें। (${a})`,
    factors: (dist, st) => [
      `72 घंटे की संचयी वर्षा और उच्च मिट्टी संतृप्ति से पहाड़ी ढलानें अस्थिर हो गई हैं।`,
      `${dist} जिले के संवेदनशील क्षेत्रों व पहाड़ी मार्गों पर भूस्खलन की प्रबल संभावना।`,
      `भू-जल स्तर और ढलान स्थिरता सीमा पार कर चुकी है।`,
    ],
    guidelinesTitle: '🚨 आपातकालीन सुरक्षा दिशानिर्देश (Hindi Safety Guidelines):',
    guidelines: [
      'खड़ी पहाड़ी सड़कों और भूस्खलन संभावित मार्गों पर अनावश्यक यात्रा न करें।',
      'ढलानों पर दरारें या कीचड़ का बहाव दिखने पर तुरंत ऊंचाई वाले सुरक्षित स्थान पर जाएं।',
      'आपातकालीन किट, आवश्यक दवाएं और 24x7 हेल्पलाइन नंबर साथ रखें।',
    ],
    helplineNotice: 'आपातकालीन सहायता: राज्य आपदा प्रबंधन प्राधिकरण (1070 / 1077) या NDRF (112)',
    smsText: (sev, dist, st, score, lvl) => `NER-SAFE चेतावनी: ${sev}\nजिला: ${dist}, ${st}\nजोखिम: ${lvl} (${score}/100)\nखतरा: भारी वर्षा व भूस्खलन की गंभीर आशंका।\nकार्रवाई: संवेदनशील ढलान छोड़कर सुरक्षित स्थान पर जाएं।\nहेल्पलाइन: 1070 / 112`,
  },
  brx: {
    severityLabel: (s) => s === 'CRITICAL' ? 'गोब्राब खौरां' : s === 'HIGH' ? 'सावध्रि खौरां' : 'गेजेर खौरां',
    subjectTitle: (s, dist, st, score) => `[बड़ो] ⚠️ हा खहनायनि सावध्रि खौरां: ${dist}, ${st} (${score}/100)`,
    heading: (sev, dist, st) => `⚠️ [${sev}] हा खहनायनि सावध्रि खौरां: ${dist}, ${st}`,
    greeting: 'मोजां अनजालु सुबुंफोर',
    intro: (dist, st) => `NER-SAFE सिस्तेमनि गेजेरजों नोंथांनि ${dist}, ${st} जिलायाव हा खहनायनि गोब्राब खौरां मोननाय जादों।`,
    alertMessage: (m) => `गोब्राब अखा आरो हा बांद्रा सिबनायनि थाखाय हा खहनायनि गिनाय दं: ${m}`,
    recommendedAction: (a) => `गिनाय जायगाफोरनिफ्राय थाबैनो रैखाथि जायगायाव थां। (${a})`,
    factors: (dist, st) => [
      `गोब्राब अखानि थाखाय हा बांद्रा सिबबाय आरो हा खहनायनि गिनाय बांदों।`,
      `${dist} आव हाजोनि लामाफोराव हा खहनायनि गोब्राब खौरां।`,
    ],
    guidelinesTitle: '🚨 रैखाथि बिथोनफोर (Bodo Safety Guidelines):',
    guidelines: [
      'हाजोनि गाज्रि लामाफोराव दाथां।',
      'हा खहनाय नुबा थाबैनो गोजौ जायगायाव खार।',
      'जायख्लं खौरां गासै मोजाङै लाखि।',
    ],
    helplineNotice: 'मददनि थाखाय कल खालाम: SDMA (1070 / 1077) एबा NDRF (112)',
    smsText: (sev, dist, st, score, lvl) => `NER-SAFE खौरां: ${sev}\nजिला: ${dist}, ${st}\nजोखोम: ${lvl} (${score}/100)\nगिनाय: हा खहनायनि सावध्रि।\nरैखाथि: थाबैनो गोजौ जायगायाव थां।\nहेल्पलाइन: 1070 / 112`,
  },
  lus: {
    severityLabel: (s) => s === 'CRITICAL' ? 'Vaupui Hlauthawng' : s === 'HIGH' ? 'Fimkhur Tura Hriattirna' : 'Fimkhur Thut',
    subjectTitle: (s, dist, st, score) => `[Mizo] ⚠️ Lei Min Fimkhurna: ${dist}, ${st} (Risk: ${score}/100)`,
    heading: (sev, dist, st) => `⚠️ [${sev}] Lei Min Fimkhurna: ${dist}, ${st}`,
    greeting: 'Chibai, Khua leh tui duhtak',
    intro: (dist, st) => `NER-SAFE Early Warning System chuan i awmna ${dist}, ${st}-ah lei min hlauhawm tak a awm tih a hmuchhuak.`,
    alertMessage: (m) => `Ruahtui tla nasat avangin tlangpang leh hmun awih zualah lei min hlauhawm a sang hle: ${m}`,
    recommendedAction: (a) => `Hmun hlauhawm chhuahsan vat la, hmun him lam pan rawh. (${a})`,
    factors: (dist, st) => [
      `Ni thum chhung ruahtui tla hian lei a ti nem hle a ni.`,
      `${dist} kawngpui leh tlangpang hmunah lei min a thleng thut thei.`,
    ],
    guidelinesTitle: '🚨 Fimkhur Dan Tur (Mizo Safety Guidelines):',
    guidelines: [
      'Tlangpang awih leh kawng hlauhawmah kal suh.',
      'Lei a khi emaw chirh a luang tih i hmuh chuan hmun sang lam pan vat rawh.',
      'Damdawi leh mamawh hmanhmawh vawng reng rawh.',
    ],
    helplineNotice: 'Taimakna mamawh tan: SDMA (1070 / 1077) emaw NDRF (112)',
    smsText: (sev, dist, st, score, lvl) => `NER-SAFE Alert: ${sev}\nDistrict: ${dist}, ${st}\nRisk: ${lvl} (${score}/100)\nHlauhawm: Lei min theihna a sang.\nChetdan: Hmun him lam pan vat rawh.\nHelpline: 1070 / 112`,
  },
  kha: {
    severityLabel: (s) => s === 'CRITICAL' ? 'Ka Jingma ba Khraw' : s === 'HIGH' ? 'Ka Jingma ba Jur' : 'Ka Maham ba Khadduh',
    subjectTitle: (s, dist, st, score) => `[Khasi] ⚠️ Ka Maham Twr Khyndew: ${dist}, ${st} (${score}/100)`,
    heading: (sev, dist, st) => `⚠️ [${sev}] Ka Maham Twr Khyndew: ${dist}, ${st}`,
    greeting: 'Khublei, Para Nongshong Shnong',
    intro: (dist, st) => `Ka NER-SAFE Early Warning System ka la lap ba ka don ka jingma ba jur ban twr khyndew ha ${dist}, ${st}.`,
    alertMessage: (m) => `Ka jinghap slap kaba jur bad ka jingsngem ka khyndew ka lah ban pyn-twr ia ki lum: ${m}`,
    recommendedAction: (a) => `Kynriah noh mardor sha ki jaka ba shngain bad shim ia ki tiar kiba donkam. (${a})`,
    factors: (dist, st) => [
      `Ka jinghap slap kaba neh la 72 kynta ka la pynswai ia ka khyndew.`,
      `Ki surok lum ha ${dist} ki don ha ka jingma ban twr.`,
    ],
    guidelinesTitle: '🚨 Ki Jingbthah Shngain (Khasi Safety Guidelines):',
    guidelines: [
      'Kieng noh na ki jaka ba riat bad ki surok ba ma.',
      'Lada lap ba pait ka khyndew kynriah sha ki jaka ba heh.',
      'Kynshew ki dawai bad ki jingbam kyrkieh.',
    ],
    helplineNotice: 'Yar ngap ia ki helpline: SDMA (1070 / 1077) lane NDRF (112)',
    smsText: (sev, dist, st, score, lvl) => `NER-SAFE Maham: ${sev}\nDistrict: ${dist}, ${st}\nRisk: ${lvl} (${score}/100)\nJingma: Twr khyndew ba jur.\nJingleh: Kynriah sha jaka shngain.\nHelpline: 1070 / 112`,
  },
  grt: {
    severityLabel: (s) => s === 'CRITICAL' ? 'Kenani Biba' : s === 'HIGH' ? 'Kenani Mikrakat' : 'Mikrakatani',
    subjectTitle: (s, dist, st, score) => `[Garo] ⚠️ Aa Beani Mikrakat: ${dist}, ${st} (${score}/100)`,
    heading: (sev, dist, st) => `⚠️ [${sev}] Aa Beani Mikrakat: ${dist}, ${st}`,
    greeting: 'Namgipa Songdonggiparang',
    intro: (dist, st) => `NER-SAFE Early Warning System ${dist}, ${st}-o aa beani biba dongani gimin mikrakata.`,
    alertMessage: (m) => `Jimbee mikka waani a·sel a·bri be·ani kenani donga: ${m}`,
    recommendedAction: (a) => `Kakket cholko sandie chel·ao dongbo. (${a})`,
    factors: (dist, st) => [
      `Salgittam mikka waani a·sel a·a an·sengja.`,
      `${dist}-o a·bri be·ani mikrakat donga.`,
    ],
    guidelinesTitle: '🚨 Nambate Dongani Niamrang (Garo Safety Guidelines):',
    guidelines: [
      'A·bri apalona re·angnabe.',
      'A·a be·ako nikode chel·chakgipa biapona re·angbo.',
      'Sam aro chiko tariai dongbo.',
    ],
    helplineNotice: 'Dakchakna: SDMA (1070 / 1077) ba NDRF (112)',
    smsText: (sev, dist, st, score, lvl) => `NER-SAFE Mikrakat: ${sev}\nDistrict: ${dist}, ${st}\nRisk: ${lvl} (${score}/100)\nKenani: Aa beani mikrakat.\nDakna nanga: Chel·chakram biapona re·angbo.\nHelpline: 1070 / 112`,
  },
  mni: {
    severityLabel: (s) => s === 'CRITICAL' ? 'অকুপ্পা চেকশিনৱা' : s === 'HIGH' ? 'ৱাংনা চেকশিনৱা' : 'ময়ায় ওম্বা চেকশিনৱা',
    subjectTitle: (s, dist, st, score) => `[মৈতৈলোন্] ⚠️ চিং কায়বগী চেকশিনৱা: ${dist}, ${st} (${score}/100)`,
    heading: (sev, dist, st) => `⚠️ [${sev}] চিং কায়বগী চেকশিনৱা: ${dist}, ${st}`,
    greeting: 'নুংশিরবা লৈবাকচা',
    intro: (dist, st) => `NER-SAFE অহানবা চেকশিনৱা সিস্তেমনা নখোয়গী লমদম ${dist}, ${st}-দা চিং কায়বগী ফিভম অমা থেংনরে।`,
    alertMessage: (m) => `নোং চুক্না চুরকপনা মরম ওইদুনা চিং কায়বগী অকিবগা লোয়ননা অৱাবা থোকহনবা য়াই: ${m}`,
    recommendedAction: (a) => `অকিবা লৈবা চিংগী মফমশিং থাদোক্লগা কোকখৎলবা অমসুং কন্থবা মফমদা চৎলু। (${a})`,
    factors: (dist, st) => [
      `নোংনা পুং ৭২ মখা তানা চুরকপনা মরম ওইদুনা লৈহৌ তুংদবা য়াই।`,
      `${dist} জিলাগী চিংগী লম্বীশিংদা চিং কায়বগী অমুক্কা হেন্দোক্না অকিবা লৈ।`,
    ],
    guidelinesTitle: '🚨 অথুবা চেকশিন ৱাফম (Manipuri Safety Guidelines):',
    guidelines: [
      'অচৌবা চিংগী লম্বীশিংদা চৎপদা চেকশিনগদবনি।',
      'লৈহৌ কায়রকপা উরবদি অথুবা মতমদা ৱাংবা মফমদা চৎকদবনি।',
      'হিদাক-লাংথক অমসুং মথৌ তাবা পোৎলমশিং শেম-শাদুনা থম্বিউ।',
    ],
    helplineNotice: 'তেংবাং ফংনবা ফনৌ: SDMA (1070 / 1077) নত্রগা NDRF (112)',
    smsText: (sev, dist, st, score, lvl) => `NER-SAFE চেকশিনৱা: ${sev}\nDistrict: ${dist}, ${st}\nRisk: ${lvl} (${score}/100)\nফিভম: চিং কায়বগী অকিবা লৈ।\nথবক: কন্থবা মফমদা চৎলু।\nহেল্পলাইন: 1070 / 112`,
  },
  ne: {
    severityLabel: (s) => s === 'CRITICAL' ? 'अति गम्भीर चेतावनी' : s === 'HIGH' ? 'उच्च चेतावनी' : 'मध्यम चेतावनी',
    subjectTitle: (s, dist, st, score) => `[नेपाली] ⚠️ पहिरोको उच्च चेतावनी: ${dist}, ${st} (जोखिम: ${score}/100)`,
    heading: (sev, dist, st) => `⚠️ [${sev}] पहिरोको चेतावनी: ${dist}, ${st}`,
    greeting: 'आदरणीय नागरिक',
    intro: (dist, st) => `NER-SAFE पूर्व चेतावनी प्रणालीले तपाईंको जिल्ला ${dist}, ${st} मा पहिरोको उच्च जोखिम पहिचान गरेको छ।`,
    alertMessage: (m) => `निरन्तर भारी वर्षा र माटोको उच्च आद्रताका कारण भिरालो स्थानमा पहिरोको ठूलो सम्भावना छ: ${m}`,
    recommendedAction: (a) => `जोखिमयुक्त भिरालो ठाउँ तुरुन्त छोडेर सुरक्षित आश्रयस्थलमा जानुहोस्। (${a})`,
    factors: (dist, st) => [
      `विगत ७२ घण्टाको निरन्तर वर्षाले गर्दा पहाडी भिरालो माटो कमजोर भएको छ।`,
      `${dist} का पहाडी सडक र संवेदनशील क्षेत्रहरूमा पहिरोको सम्भावना उच्च छ।`,
    ],
    guidelinesTitle: '🚨 आपतकालीन सुरक्षा निर्देशनहरू (Nepali Safety Guidelines):',
    guidelines: [
      'जोखिमयुक्त पहाडी सडकहरूमा यात्रा नगर्नुहोस्।',
      'माटोमा धाँजा फाटेको वा लेदो बगेको देखिएमा तुरुन्तै सुरक्षित स्थानमा जानुहोस्।',
      'आपतकालीन किट र आवश्यक औषधिहरू साथमा राख्नुहोस्।',
    ],
    helplineNotice: 'आपतकालीन सहयोगका लागि: SDMA (1070 / 1077) वा NDRF (112)',
    smsText: (sev, dist, st, score, lvl) => `NER-SAFE चेतावनी: ${sev}\nजिल्ला: ${dist}, ${st}\nजोखिम: ${lvl} (${score}/100)\nखतरा: भारी वर्षा र पहिरोको जोखिम।\nकार्य: सुरक्षित स्थानमा जानुहोस्।\nहेल्पलाइन: 1070 / 112`,
  },
};

/**
 * Generates an authentic native language emergency alert representation
 */
export function buildNativeEmergencyAlert(
  input: AlertTranslationInput,
  langCode: string
): TranslatedAlertContent {
  const cleanLang = (langCode || 'en').trim().toLowerCase();
  const langMeta = getLanguageMetadata(cleanLang);

  if (cleanLang === 'en' || !NATIVE_EMERGENCY_TEMPLATES[cleanLang]) {
    return buildEnglishStandardAlert(input);
  }

  const tmpl = NATIVE_EMERGENCY_TEMPLATES[cleanLang];
  const sev = (input.alertSeverity || 'HIGH').toUpperCase();
  const st = (input.state || 'Assam').trim();
  const dist = (input.district || 'Kamrup Metropolitan').trim();
  const level = (input.riskLevel || 'High').trim();
  const score = Number(input.riskScore) || 70;
  const factor = (input.alertMessage || 'Heavy rainfall + high soil saturation').trim();
  const action = (input.recommendedAction || 'Avoid vulnerable slopes and follow local authority instructions.').trim();

  const sevLabel = tmpl.severityLabel(sev);
  const subject = tmpl.subjectTitle(sev, dist, st, score);
  const title = tmpl.heading(sevLabel, dist, st);
  const greeting = tmpl.greeting;
  const intro = tmpl.intro(dist, st);
  const alertMsg = tmpl.alertMessage(factor);
  const recAction = tmpl.recommendedAction(action);
  const factors = tmpl.factors(dist, st);
  const sms = tmpl.smsText(sevLabel, dist, st, score, level);

  return {
    languageCode: cleanLang,
    languageName: langMeta.name,
    nativeLanguageName: langMeta.nativeName,
    translatedSubject: subject,
    translatedSeverityLabel: sevLabel,
    translatedTitle: title,
    translatedGreeting: greeting,
    translatedIntro: intro,
    translatedAlertMessage: alertMsg,
    translatedRecommendedAction: recAction,
    translatedFactors: factors,
    translatedGuidelinesTitle: tmpl.guidelinesTitle,
    translatedGuidelines: tmpl.guidelines,
    translatedHelplineNotice: tmpl.helplineNotice,
    smsMessageText: sms,
    isFallbackEnglish: false,
    translationLatencyMs: 0,
  };
}

/**
 * Generates an English standard alert content representation
 */
export function buildEnglishStandardAlert(input: AlertTranslationInput): TranslatedAlertContent {
  const sev = (input.alertSeverity || 'HIGH').toUpperCase();
  const st = (input.state || 'Assam').trim();
  const dist = (input.district || 'Kamrup Metropolitan').trim();
  const level = (input.riskLevel || 'High').trim();
  const score = Number(input.riskScore) || 70;
  const factor = (input.alertMessage || 'Heavy rainfall + high soil saturation').trim();
  const action = (input.recommendedAction || 'Avoid vulnerable slopes and follow local authority instructions.').trim();
  const helplines = input.helplineNumbers && input.helplineNumbers.length > 0 ? input.helplineNumbers.join(' / ') : '1070 / 112';

  const title = `⚠️ [${sev}] Official Landslide Advisory: ${dist}, ${st} (Risk: ${score}/100)`;
  const severityLabel = `${sev} ALERT`;

  const factors = input.mainFactors && input.mainFactors.length > 0
    ? input.mainFactors
    : [
        `NER-SAFE ALERT BROADCAST: ${sev} alert for ${dist}, ${st}.`,
        `Contributing Factor: ${factor}`,
      ];

  const smsMessageText = [
    `NER-SAFE ALERT: ${sev}`,
    `State: ${st}`,
    `District: ${dist}`,
    `Risk Level: ${level} (${score}/100)`,
    `Hazard: ${factor}`,
    `Action: ${action}`,
    `Helpline: ${helplines}`,
  ].join('\n');

  return {
    languageCode: 'en',
    languageName: 'English',
    nativeLanguageName: 'English',
    translatedSubject: title,
    translatedSeverityLabel: severityLabel,
    translatedTitle: title,
    translatedGreeting: 'Dear Citizen',
    translatedIntro: `The NER-SAFE Multi-Source Hydro-Meteorological Early Warning System has evaluated severe geological risk indicators in your registered district of ${dist}, ${st}.`,
    translatedAlertMessage: factor,
    translatedRecommendedAction: action,
    translatedFactors: factors,
    translatedGuidelinesTitle: '🚨 Emergency Guidelines:',
    translatedGuidelines: [
      'Avoid steep roadside cutting slopes and landslide-prone mountain passes.',
      'In case of slope fissures or sudden muddy water runoff, evacuate to designated high-ground shelters.',
      'Keep emergency kits, essential medication, and local SDMA/NDRF contacts accessible.',
    ],
    translatedHelplineNotice: 'For official emergency support, dial State Disaster Management Authority (1070/1077) or NDRF (112).',
    smsMessageText,
    isFallbackEnglish: false,
    translationLatencyMs: 0,
  };
}

/**
 * Computes a deterministic cache key for an alert and language
 */
function computeCacheKey(input: AlertTranslationInput, langCode: string): string {
  const content = `${input.alertSeverity}|${input.state}|${input.district}|${input.riskLevel}|${input.riskScore}|${input.alertMessage}|${input.recommendedAction}|${langCode}`;
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Main translation entry point.
 * Translates emergency alert to targetLanguage.
 * If target is English -> returns standard English immediately.
 * Checks memory cache -> returns cached translation immediately.
 * Calls Gemini API (gemini-3.1-flash-lite / gemini-3.8-flash) with 6.5s timeout.
 * If any error/timeout occurs -> falls back to authentic native template for that language,
 * GUARANTEEING the alert is NEVER in raw English if the recipient requested a native language!
 */
export async function translateAlertForRecipient(
  input: AlertTranslationInput,
  targetLanguageCode: string
): Promise<TranslatedAlertContent> {
  const cleanLang = (targetLanguageCode || 'en').trim().toLowerCase();

  // If target language is English, return directly without LLM
  if (cleanLang === 'en' || !isValidLanguageCode(cleanLang)) {
    return buildEnglishStandardAlert(input);
  }

  const langMeta = getLanguageMetadata(cleanLang);
  const cacheKey = computeCacheKey(input, cleanLang);
  const now = Date.now();

  // Check in-memory cache
  const cached = translationCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return {
      ...cached.data,
      fromCache: true,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.warn(`[translationService] GEMINI_API_KEY missing. Using native verified template for [${cleanLang}].`);
    return buildNativeEmergencyAlert(input, cleanLang);
  }

  const startTime = Date.now();

  try {
    const ai = new GoogleGenAI({ apiKey });
    const factorsList = input.mainFactors && input.mainFactors.length > 0
      ? input.mainFactors.join('\n- ')
      : `- ${input.alertMessage}`;

    const prompt = `You are the Official Emergency Disaster Translation Engine for the North Eastern Region Landslide Early Warning System (NER-SAFE).
Translate this critical disaster notification into ${langMeta.name} (${langMeta.nativeName}).

CRITICAL DISASTER DETAILS:
- Alert Severity: ${input.alertSeverity}
- Target State: ${input.state}
- Target District: ${input.district}
- Evaluated Risk Level: ${input.riskLevel} (Score: ${input.riskScore}/100)
- Hazard Description: ${input.alertMessage}
- Recommended Safety Action: ${input.recommendedAction}
- Key Hazard Drivers:
${factorsList}
- Emergency Helpline: 1070 (SDMA) / 112 (NDRF)

TRANSLATION RULES:
1. Translate fully into ${langMeta.name} (${langMeta.nativeName}) script.
2. DO NOT alter numerical values or metrics (e.g. "${input.riskScore}/100", "72h", "1070", "112"). Keep them as digits.
3. DO NOT translate proper names "NER-SAFE", "${input.state}", "${input.district}", or highway identifiers.
4. The tone must be formal, urgent, and immediately clear to local residents in a life-or-death crisis.
5. Provide:
   - translatedSubject: Inbox subject line starting with [${langMeta.nativeName}]
   - translatedSeverityLabel: Local term for ${input.alertSeverity} ALERT
   - translatedTitle: Emergency headline in ${langMeta.name}
   - translatedGreeting: Warm official greeting in ${langMeta.name} (e.g. Dear Resident / Citizen)
   - translatedIntro: Official notification sentence explaining that NER-SAFE has detected severe landslide risk in their district
   - translatedAlertMessage: Hazard description translated into ${langMeta.name}
   - translatedRecommendedAction: Direct protective life-safety action translated into ${langMeta.name}
   - translatedFactors: Array of 2-3 contributing hazard factor bullets in ${langMeta.name}
   - translatedGuidelinesTitle: Section title for safety guidelines in ${langMeta.name}
   - translatedGuidelines: Array of 3 emergency action guidelines in ${langMeta.name}
   - translatedHelplineNotice: Emergency helpline advisory sentence in ${langMeta.name}
   - smsMessageText: Urgent mobile SMS under 280 characters in ${langMeta.name} script

Return valid JSON according to schema.`;

    // Modern active Gemini models per system guidelines
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.1-pro-preview',
    ];

    // Hard timeout of 6.5s to ensure broadcast pipeline is non-blocking
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Translation request timed out after 6500ms')), 6500)
    );

    const callGemini = async (): Promise<any> => {
      let lastErr: any = null;
      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  translatedSubject: {
                    type: Type.STRING,
                    description: `Subject line in ${langMeta.name} starting with [${langMeta.nativeName}]`,
                  },
                  translatedSeverityLabel: {
                    type: Type.STRING,
                    description: `Short emergency severity label in ${langMeta.name} (e.g. Critical Warning, High Alert)`,
                  },
                  translatedTitle: {
                    type: Type.STRING,
                    description: `Email alert title in ${langMeta.name}`,
                  },
                  translatedGreeting: {
                    type: Type.STRING,
                    description: `Warm official citizen salutation in ${langMeta.name}`,
                  },
                  translatedIntro: {
                    type: Type.STRING,
                    description: `Official early warning notification statement in ${langMeta.name}`,
                  },
                  translatedAlertMessage: {
                    type: Type.STRING,
                    description: `Translated hazard description in ${langMeta.name}`,
                  },
                  translatedRecommendedAction: {
                    type: Type.STRING,
                    description: `Direct urgent protective safety advice in ${langMeta.name}`,
                  },
                  translatedFactors: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: `Translated key contributing hazard bullets in ${langMeta.name}`,
                  },
                  translatedGuidelinesTitle: {
                    type: Type.STRING,
                    description: `Emergency guidelines header in ${langMeta.name}`,
                  },
                  translatedGuidelines: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: `3 safety instructions in ${langMeta.name}`,
                  },
                  translatedHelplineNotice: {
                    type: Type.STRING,
                    description: `Emergency helpline advisory in ${langMeta.name}`,
                  },
                  smsMessageText: {
                    type: Type.STRING,
                    description: `Ultra-compact, urgent SMS broadcast message in ${langMeta.name} script under 280 characters`,
                  },
                },
                required: [
                  'translatedSeverityLabel',
                  'translatedTitle',
                  'translatedAlertMessage',
                  'translatedRecommendedAction',
                  'smsMessageText',
                ],
              },
            },
          });

          const rawText = response.text?.trim();
          if (rawText) {
            return JSON.parse(rawText);
          }
        } catch (mErr: any) {
          lastErr = mErr;
          console.warn(`[translationService] Model ${model} notice:`, mErr.message);
        }
      }
      throw lastErr || new Error('All candidate models failed to return translation.');
    };

    const parsed = (await Promise.race([callGemini(), timeoutPromise])) as any;
    const latency = Date.now() - startTime;
    const fallbackTmpl = buildNativeEmergencyAlert(input, cleanLang);

    const result: TranslatedAlertContent = {
      languageCode: cleanLang,
      languageName: langMeta.name,
      nativeLanguageName: langMeta.nativeName,
      translatedSubject: parsed.translatedSubject || fallbackTmpl.translatedSubject,
      translatedSeverityLabel: parsed.translatedSeverityLabel || fallbackTmpl.translatedSeverityLabel,
      translatedTitle: parsed.translatedTitle || fallbackTmpl.translatedTitle,
      translatedGreeting: parsed.translatedGreeting || fallbackTmpl.translatedGreeting,
      translatedIntro: parsed.translatedIntro || fallbackTmpl.translatedIntro,
      translatedAlertMessage: parsed.translatedAlertMessage || fallbackTmpl.translatedAlertMessage,
      translatedRecommendedAction: parsed.translatedRecommendedAction || fallbackTmpl.translatedRecommendedAction,
      translatedFactors: Array.isArray(parsed.translatedFactors) && parsed.translatedFactors.length > 0
        ? parsed.translatedFactors
        : fallbackTmpl.translatedFactors,
      translatedGuidelinesTitle: parsed.translatedGuidelinesTitle || fallbackTmpl.translatedGuidelinesTitle,
      translatedGuidelines: Array.isArray(parsed.translatedGuidelines) && parsed.translatedGuidelines.length > 0
        ? parsed.translatedGuidelines
        : fallbackTmpl.translatedGuidelines,
      translatedHelplineNotice: parsed.translatedHelplineNotice || fallbackTmpl.translatedHelplineNotice,
      smsMessageText: parsed.smsMessageText || fallbackTmpl.smsMessageText,
      isFallbackEnglish: false,
      translationLatencyMs: latency,
    };

    // Store in cache
    translationCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    console.log(`[translationService] Successfully translated alert to ${langMeta.name} (${cleanLang}) in ${latency}ms`);
    return result;
  } catch (err: any) {
    const latency = Date.now() - startTime;
    console.warn(`[translationService] Live translation to ${cleanLang} notice (${latency}ms): ${err.message}. Using verified native emergency template.`);

    // CRITICAL: We return the authentic NATIVE emergency alert for that language, NEVER English!
    const nativeAlert = buildNativeEmergencyAlert(input, cleanLang);
    nativeAlert.translationLatencyMs = latency;
    return nativeAlert;
  }
}
