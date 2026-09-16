/**
 * GIS Infrastructure and Geospatial Reference Data for the 8 North Eastern Region (NER) States.
 * Authentic coordinates for State Boundaries, Strategic Mountain Corridors (BRO/NHAI),
 * and IMD Hydro-Meteorological Observatories.
 */

export interface GisStateBoundary {
  name: string;
  code: string;
  center: [number, number]; // [lat, lon]
  zoom: number;
  bbox: [[number, number], [number, number]]; // [[south, west], [north, east]]
  polygon: [number, number][]; // rough polygon boundary for visual overlay
}

export interface GisRoadCorridor {
  id: string;
  name: string;
  highwayNumber: string;
  states: string[];
  description: string;
  significance: string;
  vulnerability: 'EXTREME' | 'HIGH' | 'MODERATE';
  coordinates: [number, number][]; // polyline waypoints [lat, lon]
}

export interface GisWeatherStation {
  id: string;
  name: string;
  code: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  stationType: 'IMD RMC / MC' | 'Automatic Weather Station (AWS)' | 'Agro-Met Observatory' | 'Doppler Radar Site';
  agency: string;
}

// 1. NER State Boundaries & Geographic Extents
export const NER_STATE_BOUNDARIES: Record<string, GisStateBoundary> = {
  'Arunachal Pradesh': {
    name: 'Arunachal Pradesh',
    code: 'AR',
    center: [27.85, 94.75],
    zoom: 8,
    bbox: [[26.65, 91.50], [29.45, 97.45]],
    polygon: [
      [27.58, 91.86], [28.02, 92.42], [28.60, 94.15], [28.75, 95.83],
      [28.07, 96.58], [27.92, 97.40], [27.13, 96.20], [26.85, 95.35],
      [27.00, 94.20], [27.15, 93.65], [27.25, 92.42], [27.58, 91.86],
    ],
  },
  'Assam': {
    name: 'Assam',
    code: 'AS',
    center: [26.20, 92.94],
    zoom: 8,
    bbox: [[24.15, 89.70], [27.95, 96.05]],
    polygon: [
      [26.02, 89.97], [26.48, 90.56], [26.60, 91.44], [26.73, 93.16],
      [27.48, 94.58], [27.80, 95.80], [27.47, 95.50], [26.80, 94.20],
      [26.30, 93.60], [25.18, 93.02], [24.68, 92.57], [24.83, 92.78],
      [25.00, 92.30], [25.90, 91.00], [26.02, 89.97],
    ],
  },
  'Manipur': {
    name: 'Manipur',
    code: 'MN',
    center: [24.66, 93.90],
    zoom: 9,
    bbox: [[23.83, 93.03], [25.68, 94.78]],
    polygon: [
      [25.68, 94.10], [25.30, 94.78], [24.60, 94.50], [23.83, 93.30],
      [24.10, 93.03], [24.82, 93.50], [25.40, 93.80], [25.68, 94.10],
    ],
  },
  'Meghalaya': {
    name: 'Meghalaya',
    code: 'ML',
    center: [25.50, 91.35],
    zoom: 9,
    bbox: [[25.02, 89.82], [26.07, 92.80]],
    polygon: [
      [25.80, 89.90], [26.05, 90.80], [25.90, 91.80], [25.70, 92.75],
      [25.20, 92.60], [25.10, 91.50], [25.05, 90.20], [25.80, 89.90],
    ],
  },
  'Mizoram': {
    name: 'Mizoram',
    code: 'MZ',
    center: [23.16, 92.83],
    zoom: 9,
    bbox: [[21.95, 92.25], [24.52, 93.44]],
    polygon: [
      [24.52, 92.70], [24.30, 93.40], [23.50, 93.30], [22.50, 93.10],
      [21.95, 92.80], [22.40, 92.40], [23.50, 92.30], [24.20, 92.50],
      [24.52, 92.70],
    ],
  },
  'Nagaland': {
    name: 'Nagaland',
    code: 'NL',
    center: [26.15, 94.56],
    zoom: 9,
    bbox: [[25.10, 93.33], [27.03, 95.25]],
    polygon: [
      [27.03, 95.10], [26.70, 95.25], [26.00, 94.90], [25.40, 94.50],
      [25.10, 93.80], [25.67, 93.70], [26.20, 94.10], [26.80, 94.60],
      [27.03, 95.10],
    ],
  },
  'Sikkim': {
    name: 'Sikkim',
    code: 'SK',
    center: [27.53, 88.51],
    zoom: 10,
    bbox: [[27.08, 88.01], [28.13, 88.92]],
    polygon: [
      [28.12, 88.55], [27.90, 88.90], [27.30, 88.75], [27.10, 88.50],
      [27.15, 88.10], [27.60, 88.05], [28.12, 88.55],
    ],
  },
  'Tripura': {
    name: 'Tripura',
    code: 'TR',
    center: [23.74, 91.74],
    zoom: 9,
    bbox: [[22.94, 91.15], [24.53, 92.34]],
    polygon: [
      [24.53, 92.15], [24.20, 92.30], [23.50, 92.20], [23.00, 91.80],
      [23.10, 91.30], [23.83, 91.28], [24.30, 91.50], [24.53, 92.15],
    ],
  },
};

// 2. Strategic Mountain Lifeline Highway Corridors (BRO / NHAI) prone to monsoonal landslides
export const STRATEGIC_MOUNTAIN_CORRIDORS: GisRoadCorridor[] = [
  {
    id: 'corridor-nh-10',
    name: 'Sevoke – Gangtok Highway',
    highwayNumber: 'NH-10',
    states: ['West Bengal', 'Sikkim'],
    description: 'Sole arterial road linking Sikkim with mainland India along the rugged Teesta gorge. Highly prone to monsoon landslides and slope subsidence.',
    significance: 'Strategic Defense Lifeline & State Supply Route',
    vulnerability: 'EXTREME',
    coordinates: [
      [26.8841, 88.4735], // Sevoke Bridge
      [27.0267, 88.4612], // Coronation Bridge section
      [27.0722, 88.4239], // Teesta Bazaar
      [27.1350, 88.4890], // Melli Checkpost
      [27.1772, 88.5320], // Rangpo (Sikkim Gateway)
      [27.2341, 88.5020], // Singtam
      [27.2910, 88.5630], // Ranipool
      [27.3389, 88.6065], // Gangtok Capital
    ],
  },
  {
    id: 'corridor-nh-29',
    name: 'Dimapur – Kohima – Mao Corridor',
    highwayNumber: 'NH-29',
    states: ['Nagaland', 'Manipur'],
    description: 'Mountain highway connecting the Brahmaputra plains with Kohima and Imphal. Passes through landslide-prone Pakala and Pagla Pahar sections.',
    significance: 'Primary Lifeline for Nagaland & Manipur',
    vulnerability: 'HIGH',
    coordinates: [
      [25.9060, 93.7270], // Dimapur
      [25.8230, 93.8540], // Medziphema
      [25.7560, 93.9850], // Piphema
      [25.7020, 94.0450], // Zubza / Pagla Pahar
      [25.6747, 94.1100], // Kohima
      [25.5920, 94.1350], // Kigwema
      [25.5080, 94.1280], // Mao Gate (Manipur Border)
    ],
  },
  {
    id: 'corridor-nh-6',
    name: 'Shillong – Jowai – Silchar Lifeline',
    highwayNumber: 'NH-6',
    states: ['Meghalaya', 'Assam'],
    description: 'Vital mountain highway connecting Meghalaya Plateau through Jaintia Hills to the Barak Valley (Silchar) and southern NER.',
    significance: 'Critical Link for Barak Valley, Mizoram & Tripura',
    vulnerability: 'EXTREME',
    coordinates: [
      [25.5788, 91.8933], // Shillong
      [25.4850, 92.0520], // Mawryngkneng
      [25.4510, 92.2030], // Jowai
      [25.3520, 92.3560], // Ladrymbai
      [25.3040, 92.4180], // Khliehriat
      [25.1250, 92.4820], // Sonapur Tunnel (frequent mudflow)
      [24.9620, 92.5850], // Malidor / Badarpur Border
      [24.8333, 92.7789], // Silchar
    ],
  },
  {
    id: 'corridor-nh-13',
    name: 'Trans-Arunachal Highway',
    highwayNumber: 'NH-13',
    states: ['Arunachal Pradesh'],
    description: 'Major strategic east-west highway winding through high Himalayan foothill ridges connecting Papum Pare, Lower Subansiri, and Siang belts.',
    significance: 'Strategic Border Defence & Inter-District Lifeline',
    vulnerability: 'EXTREME',
    coordinates: [
      [27.0844, 93.6053], // Itanagar
      [27.1500, 93.6500], // Yupia
      [27.4200, 93.7500], // Yazali
      [27.5500, 93.8333], // Ziro Valley
      [27.8000, 94.0000], // Raga
      [27.9833, 94.2167], // Daporijo
      [28.1667, 94.7500], // Aalo (Along)
      [28.0667, 95.3333], // Pasighat
    ],
  },
  {
    id: 'corridor-nh-27',
    name: 'East-West National Corridor',
    highwayNumber: 'NH-27',
    states: ['Assam'],
    description: 'Four-lane national arterial spine passing through the Brahmaputra valley and foothills connecting Lower and Central Assam.',
    significance: 'Primary National Freight and Civilian Corridor',
    vulnerability: 'MODERATE',
    coordinates: [
      [26.4789, 90.5583], // Bongaigaon
      [26.3211, 91.0065], // Barpeta Road
      [26.1764, 91.7610], // Guwahati
      [26.3450, 92.6840], // Nagaon
      [26.0250, 93.0850], // Doboka
      [25.7540, 93.1840], // Lumding Hill Section
    ],
  },
  {
    id: 'corridor-nh-54',
    name: 'Silchar – Vairengte – Aizawl Lifeline',
    highwayNumber: 'NH-54 / NH-306',
    states: ['Assam', 'Mizoram'],
    description: 'Crucial mountain corridor winding through steep bamboo-covered slopes connecting Cachar (Assam) with Aizawl.',
    significance: 'Single Primary Road Lifeline for Mizoram',
    vulnerability: 'HIGH',
    coordinates: [
      [24.8333, 92.7789], // Silchar
      [24.5020, 92.7650], // Lailapur Gate
      [24.3120, 92.7530], // Vairengte (Mizoram Entry)
      [24.0980, 92.6780], // Kolasib
      [23.8560, 92.6950], // Sairang
      [23.7271, 92.7176], // Aizawl Capital
    ],
  },
  {
    id: 'corridor-nh-102',
    name: 'Imphal – Pallel – Moreh Highway',
    highwayNumber: 'NH-102',
    states: ['Manipur'],
    description: 'Key international trade highway connecting the Imphal Valley through the Chandel hill ranges to the Myanmar border at Moreh.',
    significance: 'Asian Highway 1 & Trans-Asian Economic Corridor',
    vulnerability: 'HIGH',
    coordinates: [
      [24.8170, 93.9368], // Imphal
      [24.6320, 93.9920], // Thoubal
      [24.4850, 94.0250], // Kakching
      [24.4520, 94.0530], // Pallel Checkpost
      [24.3210, 94.1850], // Tengnoupal High Ridge
      [24.2450, 94.3050], // Moreh Border Gate
    ],
  },
];

// 3. Primary IMD / State Meteorological Observatories across the 8 NER States
export const NER_WEATHER_STATIONS: GisWeatherStation[] = [
  {
    id: 'ws-as-01',
    name: 'Guwahati Regional Meteorological Centre (RMC)',
    code: 'VEGT / GHT',
    state: 'Assam',
    district: 'Kamrup Metropolitan',
    latitude: 26.1061,
    longitude: 91.5859,
    elevationMeters: 54,
    stationType: 'IMD RMC / MC',
    agency: 'India Meteorological Department (IMD)',
  },
  {
    id: 'ws-as-02',
    name: 'Mohanbari Airport Meteorological Observatory',
    code: 'VEMN / DBR',
    state: 'Assam',
    district: 'Dibrugarh',
    latitude: 27.4839,
    longitude: 95.0178,
    elevationMeters: 110,
    stationType: 'IMD RMC / MC',
    agency: 'IMD Aviation Met Office',
  },
  {
    id: 'ws-as-03',
    name: 'Kumbhirgram Station Observatory',
    code: 'VEKU / IXS',
    state: 'Assam',
    district: 'Cachar',
    latitude: 24.9128,
    longitude: 92.9790,
    elevationMeters: 107,
    stationType: 'Automatic Weather Station (AWS)',
    agency: 'IMD / IAF Met',
  },
  {
    id: 'ws-ml-01',
    name: 'Shillong Upper Meteorological Centre',
    code: 'SHL / 42516',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    latitude: 25.5788,
    longitude: 91.8933,
    elevationMeters: 1598,
    stationType: 'IMD RMC / MC',
    agency: 'IMD Meteorological Centre Shillong',
  },
  {
    id: 'ws-ml-02',
    name: 'Cherrapunji (Sohra) Meteorological Observatory',
    code: 'CHRA / 42515',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    latitude: 25.2700,
    longitude: 91.7300,
    elevationMeters: 1313,
    stationType: 'Automatic Weather Station (AWS)',
    agency: 'IMD Hydro-Met Network',
  },
  {
    id: 'ws-sk-01',
    name: 'Gangtok Meteorological Centre Tadong',
    code: 'GTK / 42299',
    state: 'Sikkim',
    district: 'East Sikkim',
    latitude: 27.3167,
    longitude: 88.5833,
    elevationMeters: 1322,
    stationType: 'IMD RMC / MC',
    agency: 'IMD Meteorological Centre Gangtok',
  },
  {
    id: 'ws-sk-02',
    name: 'Mangan Hill AWS Station',
    code: 'MGN-AWS',
    state: 'Sikkim',
    district: 'North Sikkim',
    latitude: 27.5100,
    longitude: 88.5300,
    elevationMeters: 1310,
    stationType: 'Automatic Weather Station (AWS)',
    agency: 'Sikkim SDMA / IMD',
  },
  {
    id: 'ws-ar-01',
    name: 'Naharlagun Meteorological Office',
    code: 'ITN / 42398',
    state: 'Arunachal Pradesh',
    district: 'Papum Pare',
    latitude: 27.1064,
    longitude: 93.6934,
    elevationMeters: 290,
    stationType: 'IMD RMC / MC',
    agency: 'IMD Meteorological Centre Itanagar',
  },
  {
    id: 'ws-ar-02',
    name: 'Pasighat Agro-Met Station',
    code: 'PSG / 42492',
    state: 'Arunachal Pradesh',
    district: 'East Siang',
    latitude: 28.0667,
    longitude: 95.3333,
    elevationMeters: 155,
    stationType: 'Agro-Met Observatory',
    agency: 'IMD / AAU Pasighat',
  },
  {
    id: 'ws-mn-01',
    name: 'Tulihal Airport Meteorological Centre',
    code: 'VEIM / IMF',
    state: 'Manipur',
    district: 'Imphal West',
    latitude: 24.7600,
    longitude: 93.8967,
    elevationMeters: 774,
    stationType: 'IMD RMC / MC',
    agency: 'IMD MC Imphal',
  },
  {
    id: 'ws-mz-01',
    name: 'Lengpui Airport AWS Observatory',
    code: 'VELP / AJL',
    state: 'Mizoram',
    district: 'Mamit',
    latitude: 23.8408,
    longitude: 92.6192,
    elevationMeters: 412,
    stationType: 'Automatic Weather Station (AWS)',
    agency: 'IMD Aviation Met Office',
  },
  {
    id: 'ws-nl-01',
    name: 'Kohima Science College Meteorological Observatory',
    code: 'KHM / 42410',
    state: 'Nagaland',
    district: 'Kohima',
    latitude: 25.6700,
    longitude: 94.0800,
    elevationMeters: 1444,
    stationType: 'IMD RMC / MC',
    agency: 'Nagaland NSDMA / IMD',
  },
  {
    id: 'ws-tr-01',
    name: 'Agartala MBB Airport Meteorological Centre',
    code: 'VEAT / IXA',
    state: 'Tripura',
    district: 'West Tripura',
    latitude: 23.8869,
    longitude: 91.2406,
    elevationMeters: 15,
    stationType: 'IMD RMC / MC',
    agency: 'IMD Meteorological Centre Agartala',
  },
];
