export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  script: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'Bengali-Assamese' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', script: 'Devanagari' },
  { code: 'en', name: 'English', nativeName: 'English', script: 'Latin' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'Devanagari' },
  { code: 'kha', name: 'Khasi', nativeName: 'Ka Ktien Khasi', script: 'Latin' },
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng', script: 'Latin' },
  { code: 'mni', name: 'Manipuri (Meitei)', nativeName: 'মৈতৈলোন্ / Meiteilon', script: 'Bengali / Meetei Mayek' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', script: 'Devanagari' },
  { code: 'trp', name: 'Kokborok', nativeName: 'Kokborok', script: 'Latin / Bengali' },
];

export const STATE_TO_DEFAULT_LANGUAGE: Record<string, string> = {
  'Arunachal Pradesh': 'en',
  'Assam': 'as',
  'Manipur': 'mni',
  'Meghalaya': 'kha',
  'Mizoram': 'lus',
  'Nagaland': 'en',
  'Sikkim': 'ne',
  'Tripura': 'bn',
};

export function getDefaultLanguageCodeForState(stateName: string): string {
  if (!stateName) return 'as';
  const clean = stateName.trim();
  for (const [st, lang] of Object.entries(STATE_TO_DEFAULT_LANGUAGE)) {
    if (st.toLowerCase() === clean.toLowerCase()) {
      return lang;
    }
  }
  return 'en';
}

export function getLanguageOptionByCode(code?: string): LanguageOption {
  if (!code) return SUPPORTED_LANGUAGES.find((l) => l.code === 'en')!;
  const found = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
  return found || SUPPORTED_LANGUAGES.find((l) => l.code === 'en')!;
}

export interface RegionalAdvisoryParagraph {
  state: string;
  language: string;
  paragraph: string;
}

export const STATE_REGIONAL_ADVISORY_MAP: Record<string, RegionalAdvisoryParagraph> = {
  'assam': {
    state: 'Assam',
    language: 'Assamese',
    paragraph: 'এইটো এটা জৰুৰী দুৰ্যোগ সতৰ্কবাণী। আপোনাৰ অঞ্চলত ভূমিস্খলন, ধাৰাসাৰ বৰষুণ বা অন্যান্য প্ৰাকৃতিক বিপদৰ সম্ভাৱনা আছে। অনুগ্ৰহ কৰি বিপদজনক ঢাল, পাহাৰীয়া পথ আৰু ভূমিস্খলনপ্ৰৱণ অঞ্চল এৰাই চলক আৰু স্থানীয় কৰ্তৃপক্ষৰ নিৰ্দেশনা অনুসৰণ কৰক।',
  },
  'arunachal pradesh': {
    state: 'Arunachal Pradesh',
    language: 'English',
    paragraph: 'This is an official disaster warning. Your area may be affected by landslides, heavy rainfall, or other hazards. Please avoid vulnerable slopes and mountain roads, stay alert, and follow instructions issued by local authorities.',
  },
  'manipur': {
    state: 'Manipur',
    language: 'Meitei (Manipuri)',
    paragraph: 'মসিগী মেসেজ অসি অশেংবা দুর্যোগ সতৰ্কতা অমনি। নংগী এলাকা অসিদা ভূমিস্খলন, অমাং-অমাংগী উমাংবী নুংশিত অমসুং অতোপ্পা হায়জরোল শোয়দনা ইয়াই। খুদংচাবা লৈবা পাহাড়ী লাইন অমসুং অরোয়বা এলাকা অসি থাদোকউ অমসুং স্থানীয় কর্তৃপক্ষগী নির্দেশনা অনুসরণ তৌউ।',
  },
  'meghalaya': {
    state: 'Meghalaya',
    language: 'Khasi',
    paragraph: 'Kane ka dei ka jingmaham halor ka jingjia shawi. Ka don ka jingma jong ka jingtuid ka khyndew, u slap uba jur ne kiwei pat ki jingma ha ka shnong jong phi. Sngewbha kiar na ki jaka ba don jingma, ki surok lum bad ki jaka ba lah ban jia ka jingtuid khyndew, bad bud ia ki jingbthah jong ki bor sorkar shnong.',
  },
  'mizoram': {
    state: 'Mizoram',
    language: 'Mizo',
    paragraph: 'Hemi hi emergency disaster warning a ni. In khuah laiin, ruahsur tam tak, emaw thil hlauhawm dang thlen theih tih hmunah hian harsatna a thlen theih. Hmun hlauhawm, tlang kawng leh landslide thlen theih hmun te chu kal loh a, local authority thuchhuahte zawm rawh le.',
  },
  'nagaland': {
    state: 'Nagaland',
    language: 'English',
    paragraph: 'This is an official disaster warning. Your area may be affected by landslides, heavy rainfall, or related hazards. Please avoid dangerous slopes and vulnerable roads, remain alert, and follow instructions from local authorities.',
  },
  'sikkim': {
    state: 'Sikkim',
    language: 'Nepali',
    paragraph: 'यो एक आधिकारिक विपद् चेतावनी हो। तपाईंको क्षेत्रमा पहिरो, भारी वर्षा वा अन्य प्राकृतिक जोखिम हुन सक्ने सम्भावना छ। कृपया जोखिमयुक्त भिरालो ठाउँ, पहाडी सडक र पहिरो सम्भावित क्षेत्रबाट टाढा रहनुहोस् र स्थानीय प्रशासनको निर्देशन पालना गर्नुहोस्।',
  },
  'tripura': {
    state: 'Tripura',
    language: 'Bengali',
    paragraph: 'এটি একটি সরকারি দুর্যোগ সতর্কবার্তা। আপনার এলাকায় ভূমিধস, ভারী বৃষ্টি বা অন্যান্য প্রাকৃতিক বিপদের সম্ভাবনা রয়েছে। অনুগ্রহ করে ঝুঁকিপূর্ণ পাহাড়ি এলাকা, ঢাল এবং রাস্তা এড়িয়ে চলুন এবং স্থানীয় প্রশাসনের নির্দেশনা মেনে চলুন।',
  },
};

export function getRegionalAdvisoryForState(stateName?: string): RegionalAdvisoryParagraph {
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
