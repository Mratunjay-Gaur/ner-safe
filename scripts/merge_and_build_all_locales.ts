import * as fs from 'fs';
import * as path from 'path';
import { translationsPart1 } from './locales_data_1';
import { translationsPart2 } from './locales_data_2';
import { translationsPart3 } from './locales_data_3';
import { translationsPart4 } from './locales_data_4';

// Read grouped keys (contains all extracted namespaces and keys with English values)
const groupedKeys: Record<string, Record<string, string>> = JSON.parse(
  fs.readFileSync('grouped_keys.json', 'utf8')
);

// Combine all translation parts
const regionalParts = [translationsPart1, translationsPart2, translationsPart3, translationsPart4];
const allRegional: Record<string, Record<string, Record<string, string>>> = {};
// allRegional[namespace][lang][key] = translation

for (const part of regionalParts) {
  for (const [ns, langs] of Object.entries(part)) {
    if (!allRegional[ns]) allRegional[ns] = {};
    for (const [lang, dict] of Object.entries(langs)) {
      if (!allRegional[ns][lang]) allRegional[ns][lang] = {};
      for (const [k, v] of Object.entries(dict)) {
        allRegional[ns][lang][k] = v;
      }
    }
  }
}

// 1. Build updated en.ts
// First, read current en.ts to get the base structure
import { en as baseEn } from '../src/i18n/locales/en';

const fullEn: Record<string, any> = JSON.parse(JSON.stringify(baseEn));

// Merge all extracted namespaces into fullEn
for (const [ns, dict] of Object.entries(groupedKeys)) {
  if (!fullEn[ns]) fullEn[ns] = {};
  for (const [k, v] of Object.entries(dict)) {
    if (k.includes('.')) {
      // nested key like "items.0.title"
      const subParts = k.split('.');
      let cur = fullEn[ns];
      for (let i = 0; i < subParts.length - 1; i++) {
        const p = subParts[i];
        if (!cur[p]) cur[p] = {};
        cur = cur[p];
      }
      cur[subParts[subParts.length - 1]] = v;
    } else {
      fullEn[ns][k] = v;
    }
  }
}

// Write en.ts
const enContent = `export const en = ${JSON.stringify(fullEn, null, 2)} as const;

type DeepPartialStringMap<T> = {
  [K in keyof T]?: T[K] extends string
    ? string
    : T[K] extends Record<string, any>
    ? DeepPartialStringMap<T[K]>
    : T[K];
};

export type TranslationSchema = DeepPartialStringMap<typeof en>;
`;

fs.writeFileSync('src/i18n/locales/en.ts', enContent, 'utf8');
console.log('✅ Updated src/i18n/locales/en.ts successfully');

// 2. Build regional files for as, bn, ne, kha, lus, mni
const languages = ['as', 'bn', 'ne', 'kha', 'lus', 'mni'] as const;

// Read base regional files to keep any existing special terms
import { as as baseAs } from '../src/i18n/locales/as';
import { bn as baseBn } from '../src/i18n/locales/bn';
import { ne as baseNe } from '../src/i18n/locales/ne';
import { kha as baseKha } from '../src/i18n/locales/kha';
import { lus as baseLus } from '../src/i18n/locales/lus';
import { mni as baseMni } from '../src/i18n/locales/mni';

const baseMap: Record<string, any> = {
  as: baseAs,
  bn: baseBn,
  ne: baseNe,
  kha: baseKha,
  lus: baseLus,
  mni: baseMni,
};

for (const lang of languages) {
  const targetObj: Record<string, any> = JSON.parse(JSON.stringify(baseMap[lang] || {}));

  // Merge each namespace
  for (const [ns, enDict] of Object.entries(groupedKeys)) {
    if (!targetObj[ns]) targetObj[ns] = {};
    const langNsDict = allRegional[ns]?.[lang] || {};

    for (const [k, enVal] of Object.entries(enDict)) {
      if (k.includes('.')) {
        // Handle nested
        const subParts = k.split('.');
        let cur = targetObj[ns];
        for (let i = 0; i < subParts.length - 1; i++) {
          const p = subParts[i];
          if (!cur[p]) cur[p] = {};
          cur = cur[p];
        }
        const lastPart = subParts[subParts.length - 1];
        cur[lastPart] = langNsDict[k] || langNsDict[lastPart] || enVal;
      } else {
        targetObj[ns][k] = langNsDict[k] || enVal;
      }
    }
  }

  const fileContent = `import { TranslationSchema } from './en';

export const ${lang}: TranslationSchema = ${JSON.stringify(targetObj, null, 2)};
`;

  fs.writeFileSync(`src/i18n/locales/${lang}.ts`, fileContent, 'utf8');
  console.log(`✅ Generated src/i18n/locales/${lang}.ts`);
}

console.log('All 7 locale files generated and synchronized successfully.');
