import { BorderCountryMeta, NeighborCountryId } from '../types/crossBorder';

/**
 * STRICT REGISTRATION:
 * Only countries sharing an international border with the 8 North Eastern Region (NER) states of India.
 * 1. Bangladesh
 * 2. Bhutan
 * 3. China (Tibet Autonomous Region)
 * 4. Myanmar
 * 5. Nepal
 * 
 * No other countries are permitted.
 */
export const BORDER_COUNTRIES_DATA: Record<NeighborCountryId, BorderCountryMeta> = {
  bangladesh: {
    id: 'bangladesh',
    name: 'Bangladesh',
    officialName: "People's Republic of Bangladesh",
    flag: '🇧🇩',
    countryCode: 'BD',
    capital: 'Dhaka',
    totalNerBorderKm: 1880,
    primaryCoordinates: {
      latitude: 23.8103,
      longitude: 90.4125,
    },
    connectedNerStates: [
      {
        state: 'Assam',
        borderLengthKm: 262,
        sharedRiversBasins: ['Brahmaputra / Jamuna', 'Barak / Surma-Kushiyara'],
        terrainType: 'Riverine floodplain & wetlands',
        vulnerabilitySummary:
          'Monsoon river backflow and sediment deposition directly impact Dhubri, South Salmara, Karimganj, and Cachar districts.',
      },
      {
        state: 'Meghalaya',
        borderLengthKm: 443,
        sharedRiversBasins: ['Someshwari / Simsang', 'Jadukata', 'Umngot'],
        terrainType: 'Steep southern sandstone/limestone escarpments',
        vulnerabilitySummary:
          'Extreme precipitation draining southward from Cherrapunji and Mawsynram plateau funnels directly into Sylhet basin; upstream-downstream flood coupling.',
      },
      {
        state: 'Tripura',
        borderLengthKm: 856,
        sharedRiversBasins: ['Gumti', 'Haora', 'Feni', 'Muhuri', 'Khowai'],
        terrainType: 'Low undulating hills, floodplains, and river valleys',
        vulnerabilitySummary:
          'Tripura is bounded on three sides by Bangladesh; cyclonic depressions and heavy rainfall in eastern Bangladesh cause immediate localized inundation and slope slips.',
      },
      {
        state: 'Mizoram',
        borderLengthKm: 318,
        sharedRiversBasins: ['Karnaphuli / Khawthlangtuipui'],
        terrainType: 'Rugged parallel north-south anticline ridges',
        vulnerabilitySummary:
          'Border areas in Mamit and Lunglei experience flash floods and slope saturation during severe depressions arriving from the Bay of Bengal through Chittagong.',
      },
    ],
    stations: [
      {
        id: 'bd-sylhet',
        name: 'Sylhet',
        region: 'Sylhet Division',
        latitude: 24.8949,
        longitude: 91.8687,
        borderContext: 'Adjacent to Meghalaya southern rim & Assam Barak Valley (Karimganj)',
      },
      {
        id: 'bd-dhaka',
        name: 'Dhaka (Capital)',
        region: 'Dhaka Division',
        latitude: 23.8103,
        longitude: 90.4125,
        isCapital: true,
        borderContext: 'National Meteorological & Flood Forecasting Headquarters',
      },
      {
        id: 'bd-chattogram',
        name: 'Chattogram (Chittagong)',
        region: 'Chittagong Division',
        latitude: 22.3569,
        longitude: 91.7832,
        borderContext: 'Coastal cyclonic gateway bordering Tripura and Mizoram hill tracts',
      },
      {
        id: 'bd-rangpur',
        name: 'Rangpur / Kurigram',
        region: 'Rangpur Division',
        latitude: 25.7439,
        longitude: 89.2752,
        borderContext: 'Adjacent to Western Assam (Dhubri / Goalpara)',
      },
    ],
    crossBorderHydrologyNote:
      'Transboundary drainage: 54 common rivers flow between India and Bangladesh. Cyclonic surges from the Bay of Bengal cross Bangladesh into the southern NER states.',
  },

  bhutan: {
    id: 'bhutan',
    name: 'Bhutan',
    officialName: 'Kingdom of Bhutan',
    flag: '🇧🇹',
    countryCode: 'BT',
    capital: 'Thimphu',
    totalNerBorderKm: 659,
    primaryCoordinates: {
      latitude: 27.4728,
      longitude: 89.6393,
    },
    connectedNerStates: [
      {
        state: 'Assam',
        borderLengthKm: 267,
        sharedRiversBasins: ['Manas', 'Sankosh', 'Beki', 'Aie', 'Pagladiya'],
        terrainType: 'Himalayan foothills to Bhabar/Terai alluvial plains',
        vulnerabilitySummary:
          'High precipitation and dam releases in Bhutan mountains rapidly trigger flash floods and severe debris deposition in Kokrajhar, Chirang, Baksa, and Udalguri districts.',
      },
      {
        state: 'Arunachal Pradesh',
        borderLengthKm: 217,
        sharedRiversBasins: ['Nyukcharong Chu', 'Tawang Chu', 'Tenga / Bichom'],
        terrainType: 'High Eastern Himalayan ridges and gorges',
        vulnerabilitySummary:
          'Shared mountain watershed affecting high-altitude road corridors, mountain passes (Bum La, Sela), and hydropower catchments in Tawang and West Kameng.',
      },
      {
        state: 'Sikkim',
        borderLengthKm: 32,
        sharedRiversBasins: ['Amochu / Torsa Basin'],
        terrainType: 'Rugged alpine peaks and Chumbi-Bhutan crest',
        vulnerabilitySummary:
          'Eastern Sikkim alpine border ridges near Pangolakha Wildlife Sanctuary and transit points.',
      },
    ],
    stations: [
      {
        id: 'bt-thimphu',
        name: 'Thimphu (Capital)',
        region: 'Thimphu Dzongkhag',
        latitude: 27.4728,
        longitude: 89.6393,
        isCapital: true,
        borderContext: 'National high-altitude meteorological observatory',
      },
      {
        id: 'bt-samdrup-jongkhar',
        name: 'Samdrup Jongkhar',
        region: 'Eastern Bhutan',
        latitude: 26.8000,
        longitude: 91.5000,
        borderContext: 'Direct border checkpoint with Assam (Baksa / Udalguri)',
      },
      {
        id: 'bt-trashigang',
        name: 'Trashigang',
        region: 'Eastern Bhutan',
        latitude: 27.3331,
        longitude: 91.5542,
        borderContext: 'Bordering Arunachal Pradesh (Tawang / West Kameng)',
      },
      {
        id: 'bt-phuentsholing',
        name: 'Phuentsholing',
        region: 'Chukha Dzongkhag',
        latitude: 26.8524,
        longitude: 89.3820,
        borderContext: 'Primary commercial gateway adjacent to Western Assam & Bengal corridor',
      },
    ],
    crossBorderHydrologyNote:
      'Trans-Himalayan steep gradient rivers flow south into the Brahmaputra valley. Extreme precipitation events in southern Bhutan slopes create flash floods across Assam within 3 to 6 hours.',
  },

  china: {
    id: 'china',
    name: 'China',
    officialName: "People's Republic of China (Tibet Region)",
    flag: '🇨🇳',
    countryCode: 'CN',
    capital: 'Lhasa (Regional)',
    totalNerBorderKm: 1345,
    primaryCoordinates: {
      latitude: 29.5647,
      longitude: 94.2183,
    },
    connectedNerStates: [
      {
        state: 'Arunachal Pradesh',
        borderLengthKm: 1126,
        sharedRiversBasins: ['Yarlung Tsangpo / Siang', 'Lohit', 'Subansiri', 'Dibang'],
        terrainType: 'Hyper-steep Great Himalayan range and Tsangpo Gorge',
        vulnerabilitySummary:
          'Critical transboundary Siang River headwaters: extreme rainfall, Glacial Lake Outburst Floods (GLOFs), and natural landslide-dam bursts in Tibet cause sudden surges in Upper Siang, East Siang, and Assam plains.',
      },
      {
        state: 'Sikkim',
        borderLengthKm: 220,
        sharedRiversBasins: ['Teesta Glacier / Tso Lhamo', 'Chumbi Valley Headwaters'],
        terrainType: 'Ultra-high altitude permafrost and glacial valleys',
        vulnerabilitySummary:
          'High-altitude blizzard systems, sub-zero snowpack dynamics, and glacial lake stability along northern Sikkim passes (Nathu La, Cho La, Dongkya).',
      },
    ],
    stations: [
      {
        id: 'cn-nyingchi',
        name: 'Nyingchi / Mainling',
        region: 'Southeastern Tibet',
        latitude: 29.5647,
        longitude: 94.2183,
        borderContext: 'Upstream Siang / Brahmaputra canyon directly bordering Arunachal Pradesh',
      },
      {
        id: 'cn-lhasa',
        name: 'Lhasa (Regional Capital)',
        region: 'Tibet Autonomous Region',
        latitude: 29.6525,
        longitude: 91.1721,
        isCapital: true,
        borderContext: 'High Tibetan Plateau regional meteorological center',
      },
      {
        id: 'cn-shigatse-yadong',
        name: 'Yadong / Chumbi Valley',
        region: 'Shigatse Prefecture',
        latitude: 27.4833,
        longitude: 88.9050,
        borderContext: 'Adjacent to Sikkim Nathu La border crossing and eastern ridge',
      },
      {
        id: 'cn-cona',
        name: 'Cona / Shannan',
        region: 'Shannan Prefecture',
        latitude: 27.9860,
        longitude: 91.9540,
        borderContext: 'Adjacent to Tawang & West Kameng in western Arunachal Pradesh',
      },
    ],
    crossBorderHydrologyNote:
      'The Yarlung Tsangpo flows eastward through southern Tibet before taking a hairpin turn around Namcha Barwa into Arunachal Pradesh as the Siang. Real-time meteorological telemetry here gives early warning of massive river surges.',
  },

  myanmar: {
    id: 'myanmar',
    name: 'Myanmar',
    officialName: 'Republic of the Union of Myanmar',
    flag: '🇲🇲',
    countryCode: 'MM',
    capital: 'Naypyidaw',
    totalNerBorderKm: 1643,
    primaryCoordinates: {
      latitude: 23.9833,
      longitude: 94.3000,
    },
    connectedNerStates: [
      {
        state: 'Arunachal Pradesh',
        borderLengthKm: 520,
        sharedRiversBasins: ['Tirap', 'Namchik', 'Irrawaddy headwater tributaries'],
        terrainType: 'Patkai Bum densely forested mountain ranges',
        vulnerabilitySummary:
          'Heavy orographic rain in the Patkai hills creates landslide dams and severed road links in Changlang and Tirap districts.',
      },
      {
        state: 'Nagaland',
        borderLengthKm: 215,
        sharedRiversBasins: ['Tizu River (Chindwin basin)', 'Lanye'],
        terrainType: 'Steep folded Naga Hills & Mount Saramati massif',
        vulnerabilitySummary:
          'Shared seismic and landslide belt along Kiphire, Phek, and Noklak borders; transboundary squalls induce continuous slip activity.',
      },
      {
        state: 'Manipur',
        borderLengthKm: 398,
        sharedRiversBasins: ['Chindwin basin tributaries', 'Yu River', 'Lokchao'],
        terrainType: 'Border hills and Moreh-Tamu transit corridor',
        vulnerabilitySummary:
          'Tengnoupal, Chandel, and Ukhrul experience severe mudslides and road blockages along the Asian Highway 1 whenever monsoonal fronts intensify in Sagaing.',
      },
      {
        state: 'Mizoram',
        borderLengthKm: 510,
        sharedRiversBasins: ['Kaladan / Chhimtuipui', 'Tiau River'],
        terrainType: 'Parallel north-south ridges & Chin Hills transition',
        vulnerabilitySummary:
          'Tiau river marks the border; prolonged rainfall in Chin State leads to rapid river swelling and slope collapses along Champhai, Lawngtlai, and Siaha.',
      },
    ],
    stations: [
      {
        id: 'mm-tamu',
        name: 'Tamu / Kalay',
        region: 'Sagaing Region',
        latitude: 23.9833,
        longitude: 94.3000,
        borderContext: 'Direct border hub facing Moreh, Manipur and Nagaland hills',
      },
      {
        id: 'mm-hakha',
        name: 'Hakha (Chin Hills)',
        region: 'Chin State',
        latitude: 22.6417,
        longitude: 93.6067,
        borderContext: 'High-altitude border ridge overlooking Eastern Mizoram (Champhai)',
      },
      {
        id: 'mm-myitkyina',
        name: 'Myitkyina',
        region: 'Kachin State',
        latitude: 25.3833,
        longitude: 97.4000,
        borderContext: 'Northern Myanmar meteorological station bordering eastern Arunachal',
      },
      {
        id: 'mm-naypyidaw',
        name: 'Naypyidaw (Capital)',
        region: 'Union Territory',
        latitude: 19.7633,
        longitude: 96.0785,
        isCapital: true,
        borderContext: 'Department of Meteorology and Hydrology (DMH) Central Station',
      },
    ],
    crossBorderHydrologyNote:
      'The Indo-Myanmar Mountain Arc is geologically young and prone to extensive slope failures. South-west monsoon surges and depressions entering from the Andaman Sea and Bay of Bengal track across Western Myanmar directly into NER.',
  },

  nepal: {
    id: 'nepal',
    name: 'Nepal',
    officialName: 'Federal Democratic Republic of Nepal',
    flag: '🇳🇵',
    countryCode: 'NP',
    capital: 'Kathmandu',
    totalNerBorderKm: 99,
    primaryCoordinates: {
      latitude: 27.7172,
      longitude: 85.3240,
    },
    connectedNerStates: [
      {
        state: 'Sikkim',
        borderLengthKm: 99,
        sharedRiversBasins: ['Rangeet River tributaries', 'Kangchenjunga glacial watershed'],
        terrainType: 'Singalila Ridge and high Kangchenjunga alpine massif',
        vulnerabilitySummary:
          'Heavy orographic precipitation on the eastern flank of Nepal directly triggers flash floods and high-velocity debris flows in West Sikkim (Geyzing, Soreng) and North Sikkim (Mangan).',
      },
    ],
    stations: [
      {
        id: 'np-ilam',
        name: 'Ilam / Eastern Hills',
        region: 'Koshi Province',
        latitude: 26.9114,
        longitude: 87.9272,
        borderContext: 'Direct border area along Singalila ridge facing West & South Sikkim',
      },
      {
        id: 'np-taplejung',
        name: 'Taplejung (Kangchenjunga)',
        region: 'Koshi Province',
        latitude: 27.3516,
        longitude: 87.6714,
        borderContext: 'High-altitude mountain catchment directly west of Kangchenjunga / Sikkim',
      },
      {
        id: 'np-kathmandu',
        name: 'Kathmandu (Capital)',
        region: 'Bagmati Province',
        latitude: 27.7172,
        longitude: 85.3240,
        isCapital: true,
        borderContext: 'Department of Hydrology and Meteorology (DHM) Central Observatory',
      },
      {
        id: 'np-biratnagar',
        name: 'Biratnagar',
        region: 'Koshi Province',
        latitude: 26.4525,
        longitude: 87.2718,
        borderContext: 'Eastern Terai meteorological checkpoint',
      },
    ],
    crossBorderHydrologyNote:
      'The Singalila Ridge divides the Teesta basin of Sikkim from the Tamor-Koshi basin of Nepal. Meteorological squalls and heavy rainfall events in Koshi Province often cross the crest into Sikkim within 1-2 hours.',
  },
};

export const NEIGHBOR_COUNTRIES_LIST: BorderCountryMeta[] = [
  BORDER_COUNTRIES_DATA.bangladesh,
  BORDER_COUNTRIES_DATA.bhutan,
  BORDER_COUNTRIES_DATA.china,
  BORDER_COUNTRIES_DATA.myanmar,
  BORDER_COUNTRIES_DATA.nepal,
];
