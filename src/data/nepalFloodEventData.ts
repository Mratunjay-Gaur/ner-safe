export interface NepalFloodDistrict {
  id: string;
  district: string;
  country: 'Nepal';
  severity: 'PRIMARY / EXTREME' | 'HIGH' | 'MODERATE/HIGH';
  severityLevel: 'extreme' | 'high' | 'moderate';
  event: string;
  riverBasin: string;
  eventDate: string;
  dataStatus: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  downstreamSequence: number; // 1 = Rasuwa (origin), 2 = Nuwakot, 3 = Dhading, 4 = Chitwan, 0 = tributary feeder
  summary: string;
  crossBorderHydrologyImpact: string;
}

export const NEPAL_FLOOD_DISTRICTS: NepalFloodDistrict[] = [
  {
    id: 'nepal-flood-rasuwa',
    district: 'Rasuwa',
    country: 'Nepal',
    severity: 'PRIMARY / EXTREME',
    severityLevel: 'extreme',
    event: 'Flash Flood / Debris Torrent & Glacial Runoff Surge',
    riverBasin: 'Bhote Koshi / Upper Trishuli River Gorge',
    eventDate: 'Late September 2024 / Monsoonal Cloudburst',
    dataStatus: 'Confirmed Hazard Epicenter • Prototype event data',
    coordinates: {
      lat: 28.134,
      lon: 85.295,
    },
    downstreamSequence: 1,
    summary:
      'Primary epicenter of the recent severe disaster event. Extreme orographic cloudburst and high-altitude debris-flow surged down the steep Bhote Koshi canyon into the Upper Trishuli.',
    crossBorderHydrologyImpact:
      'Genesis of downstream surge wave: Sudden water volume and heavy boulder/silt slurry mobilized down the Trishuli gorge, initiating downstream cascading flood risks toward the lower plains.',
  },
  {
    id: 'nepal-flood-nuwakot',
    district: 'Nuwakot',
    country: 'Nepal',
    severity: 'HIGH',
    severityLevel: 'high',
    event: 'Flash Flood Propagation & Riverbank Scouring',
    riverBasin: 'Trishuli River (Direct Downstream from Rasuwa)',
    eventDate: 'Late September 2024 / Monsoonal Surge',
    dataStatus: 'High Inundation Zone • Prototype event data',
    coordinates: {
      lat: 27.913,
      lon: 85.1667,
    },
    downstreamSequence: 2,
    summary:
      'Direct recipient of Rasuwa debris-laden surge. Severe riverbank erosion, inundation of riverine terraces, and structural danger along Trishuli highway transit corridor.',
    crossBorderHydrologyImpact:
      'Downstream hazard conduit: Flood pulse accelerates through narrow valley narrows with high hydraulic velocity toward Dhading.',
  },
  {
    id: 'nepal-flood-dhading',
    district: 'Dhading',
    country: 'Nepal',
    severity: 'HIGH',
    severityLevel: 'high',
    event: 'Riverine Gorge Inundation & Highway Debris Obstruction',
    riverBasin: 'Trishuli River & Mahesh Khola Confluence',
    eventDate: 'Late September 2024 / Monsoonal Surge',
    dataStatus: 'High Vulnerability Zone • Prototype event data',
    coordinates: {
      lat: 27.81,
      lon: 84.88,
    },
    downstreamSequence: 3,
    summary:
      'Trishuli River gorge constriction at Malekhu/Galchi. Swollen river stages inundated settlements along the riverbed and triggered secondary slope slips along the Prithvi Highway.',
    crossBorderHydrologyImpact:
      'Channelized high discharge: Funnels combined discharges from Rasuwa and Nuwakot into the lower Narayani basin.',
  },
  {
    id: 'nepal-flood-gorkha',
    district: 'Gorkha',
    country: 'Nepal',
    severity: 'MODERATE/HIGH',
    severityLevel: 'moderate',
    event: 'Tributary Surcharge & Mountain Slope Destabilization',
    riverBasin: 'Budhi Gandaki & Trishuli Lateral Tributaries',
    eventDate: 'Late September 2024 / Monsoonal Surge',
    dataStatus: 'Elevated Alert Status • Prototype event data',
    coordinates: {
      lat: 28.005,
      lon: 84.63,
    },
    downstreamSequence: 0,
    summary:
      'Intense localized precipitation triggered tributary flash floods and landslips feeding sediment-heavy torrents into the Trishuli-Gandaki trunk line.',
    crossBorderHydrologyImpact:
      'Lateral inflow multiplier: Augments volume of the main downstream Trishuli-Narayani flood crest.',
  },
  {
    id: 'nepal-flood-tanahun',
    district: 'Tanahun',
    country: 'Nepal',
    severity: 'MODERATE/HIGH',
    severityLevel: 'moderate',
    event: 'Tributary Overflow & Lowland Waterlogging',
    riverBasin: 'Marsyangdi & Madi / Seti River System',
    eventDate: 'Late September 2024 / Monsoonal Surge',
    dataStatus: 'Elevated Alert Status • Prototype event data',
    coordinates: {
      lat: 27.9733,
      lon: 84.2833,
    },
    downstreamSequence: 0,
    summary:
      'High seasonal rainfall caused rapid swelling of the Seti and Marsyangdi rivers, joining the Gandaki corridor above Devghat.',
    crossBorderHydrologyImpact:
      'Western catchment contribution: Coinciding peak discharges compounded water volume reaching Chitwan.',
  },
  {
    id: 'nepal-flood-chitwan',
    district: 'Chitwan',
    country: 'Nepal',
    severity: 'MODERATE/HIGH',
    severityLevel: 'moderate',
    event: 'Downstream Floodplain Inundation & Silt Deposition',
    riverBasin: 'Narayani River (Trishuli + Kali Gandaki Confluence at Devghat)',
    eventDate: 'Late September 2024 / Monsoonal Surge',
    dataStatus: 'Downstream Inundation Zone • Prototype event data',
    coordinates: {
      lat: 27.6833,
      lon: 84.4333,
    },
    downstreamSequence: 4,
    summary:
      'Major downstream receiving basin at Bharatpur/Devghat. Water levels surpassed danger marks across river islands and low-lying agricultural plains.',
    crossBorderHydrologyImpact:
      'Cross-border gateway: The Narayani River flows southward directly into the Indo-Gangetic basin (Gandak River entering India at Valmiki Nagar/Bihar), illustrating downstream cross-border risk propagation.',
  },
];

/**
 * Approximate Bhote Koshi → Trishuli River Downstream Hazard Corridor coordinates:
 * Rasuwa (Langtang/Bhote Koshi) -> Nuwakot -> Dhading -> Chitwan (Devghat/Narayani) -> Downstream Border direction
 */
export const NEPAL_TRISHULI_HAZARD_CORRIDOR_COORDINATES: [number, number][] = [
  [28.18, 85.32], // Upper Bhote Koshi Gorge
  [28.134, 85.295], // Rasuwa (Epicenter)
  [28.01, 85.22], // Betrawati confluence
  [27.913, 85.1667], // Nuwakot (Bidur)
  [27.84, 85.02], // Galchi
  [27.81, 84.88], // Dhading (Malekhu)
  [27.78, 84.72], // Benighat / Mugling gorge
  [27.71, 84.48], // Devghat confluence (Trishuli + Kali Gandaki -> Narayani)
  [27.6833, 84.4333], // Chitwan (Bharatpur floodplain)
  [27.52, 84.25], // Lower Narayani (Chitwan National Park)
  [27.42, 84.05], // Tribeni / Indo-Nepal border threshold (Gandak Barrage)
];

/**
 * Tributary flow feeder lines into the main corridor
 */
export const NEPAL_TRIBUTARY_FEEDER_LINES: Array<{
  name: string;
  points: [number, number][];
}> = [
  {
    name: 'Budhi Gandaki Feeder (Gorkha)',
    points: [
      [28.005, 84.63], // Gorkha
      [27.82, 84.73], // Confluence with Trishuli near Benighat
    ],
  },
  {
    name: 'Marsyangdi / Seti Feeder (Tanahun)',
    points: [
      [27.9733, 84.2833], // Tanahun (Damauli)
      [27.76, 84.45], // Confluence with Trishuli near Mugling/Devghat
    ],
  },
];
