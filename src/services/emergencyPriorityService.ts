import { IncidentReportItem } from '../types/incident';
import { DistrictHeatmapPoint } from '../types/risk';
import { VERIFIED_NER_HISTORICAL_LANDSLIDES } from '../data/historicalLandslides';
import { EmergencyPriorityItem, EmergencyPriorityLevel, EmergencyPrioritySummary } from '../types/emergencyPriority';
import { ALL_NER_DISTRICTS } from './nerRiskHeatmapService';

// Real known lifeline infrastructure and highway corridors in NER associated with districts
const NER_LIFELINE_INFRASTRUCTURE: Record<string, { roads: string[]; infrastructure: string }> = {
  'dima hasao': {
    roads: ['Lumding-Badarpur Hill Section NH-27', 'State Highway 20'],
    infrastructure: 'New Haflong Railway Junction & Jatinga Valley settlements',
  },
  'east sikkim': {
    roads: ['NH-10 (Sikkim Lifeline Highway)', 'Gangtok-Nathula Highway'],
    infrastructure: 'Gangtok municipal corridor & transit bridges',
  },
  'kohima': {
    roads: ['NH-29 (Dimapur-Kohima-Imphal Highway)', 'NH-2'],
    infrastructure: 'Kohima Bypass Infrastructure & Inter-state Freight Corridor',
  },
  'east khasi hills': {
    roads: ['NH-6 (Guwahati-Shillong-Silchar)', 'Shillong Peak Road'],
    infrastructure: 'Shillong Urban Infrastructure & Upper Shillong settlements',
  },
  'kamrup metropolitan': {
    roads: ['NH-27', 'GS Road corridor'],
    infrastructure: 'Kahilipara Hill Slope Communities & Guwahati city periphery',
  },
  'papum pare': {
    roads: ['NH-415 (Itanagar-Naharlagun)', 'NH-13'],
    infrastructure: 'Capital Complex Administrative Zone & hillside transit routes',
  },
  'chhimtuipui': {
    roads: ['NH-54 (Aizawl-Lunglei-Tuipang)'],
    infrastructure: 'South Mizoram ridge transit routes & local civil infrastructure',
  },
  'aizawl': {
    roads: ['NH-54 / NH-306', 'Aizawl-World Bank Road'],
    infrastructure: 'Aizawl Urban Ridge settlements & water supply conduits',
  },
  'imphal west': {
    roads: ['NH-37 (Imphal-Jiribam)', 'NH-102 (Imphal-Moreh)'],
    infrastructure: 'Imphal urban perimeter & hillside feeder roads',
  },
  'west kameng': {
    roads: ['Balipara-Charduar-Tawang (BCT) Road / NH-13'],
    infrastructure: 'Bomdila transit station & border connectivity corridors',
  },
  'tawang': {
    roads: ['NH-13 (Trans-Arunachal Highway)', 'Sela Pass Corridor'],
    infrastructure: 'High altitude border transit posts & civil infrastructure',
  },
  'dibrugarh': {
    roads: ['NH-15', 'Bogibeel Bridge Approach Corridor'],
    infrastructure: 'Brahmaputra Riverfront Embankment & industrial zone',
  },
};

/**
 * Extracts affected roads from text or district mapping
 */
function extractRoads(text: string, districtName: string): string[] {
  const lower = (text || '').toLowerCase();
  const roads: string[] = [];

  const roadPatterns = [
    /nh[-\s]?\d+/gi,
    /state highway\s?\d+/gi,
    /sh[-\s]?\d+/gi,
    /bypass/gi,
    /highway/gi,
  ];

  for (const pat of roadPatterns) {
    const matches = text.match(pat);
    if (matches) {
      matches.forEach((m) => {
        const clean = m.toUpperCase().trim();
        if (!roads.includes(clean)) roads.push(clean);
      });
    }
  }

  const districtKey = districtName.toLowerCase().trim();
  if (roads.length === 0 && NER_LIFELINE_INFRASTRUCTURE[districtKey]) {
    roads.push(...NER_LIFELINE_INFRASTRUCTURE[districtKey].roads);
  }

  if (roads.length === 0) {
    if (lower.includes('road') || lower.includes('corridor') || lower.includes('route')) {
      roads.push('Local Hill Transit Road');
    } else {
      roads.push('District Arterial Road');
    }
  }

  return roads;
}

/**
 * Extracts nearby village / infrastructure from text or district mapping
 */
function extractInfrastructure(text: string, districtName: string): string | undefined {
  const districtKey = districtName.toLowerCase().trim();
  if (NER_LIFELINE_INFRASTRUCTURE[districtKey]) {
    return NER_LIFELINE_INFRASTRUCTURE[districtKey].infrastructure;
  }
  return undefined;
}

/**
 * Calculates priority score and rationale for an incident report
 */
function calculateIncidentPriority(
  inc: IncidentReportItem,
  districtRiskMap: Map<string, DistrictHeatmapPoint>
): {
  priorityLevel: EmergencyPriorityLevel;
  priorityScore: number;
  riskScore: number;
  mainReason: string;
  affectedRoads: string[];
  nearbyInfrastructure?: string;
  telemetry: any;
} {
  // 1. Identify district
  const locName = inc.locationName || '';
  let matchedDistrict = ALL_NER_DISTRICTS.find(
    (d) =>
      locName.toLowerCase().includes(d.name.toLowerCase()) ||
      d.name.toLowerCase().includes(locName.toLowerCase())
  );

  if (!matchedDistrict) {
    // Search by coordinates proximity
    let minDistance = Infinity;
    for (const d of ALL_NER_DISTRICTS) {
      const dist = Math.hypot(d.latitude - inc.latitude, d.longitude - inc.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        matchedDistrict = d;
      }
    }
  }

  const districtPoint = matchedDistrict ? districtRiskMap.get(matchedDistrict.id) : null;
  const envRiskScore = districtPoint?.riskScore ?? 45;
  const slope = districtPoint?.slopeDegrees ?? 24;
  const soilSat = districtPoint?.soilSaturationPercent ?? 65;
  const precip = districtPoint?.currentPrecipitationMm ?? 0;

  // 2. Incident Status Weight
  const statusStr = (inc.status || '').toUpperCase().replace(/_/g, ' ');
  let statusWeight = 15;
  if (statusStr === 'VERIFIED') statusWeight = 38;
  else if (statusStr === 'UNDER REVIEW') statusWeight = 24;
  else if (statusStr === 'RESOLVED') statusWeight = 5;

  // 3. Incident Type Hazard Severity
  const typeStr = (inc.incidentType || '').toLowerCase();
  let typeWeight = 10;
  if (typeStr.includes('landslide') || typeStr.includes('debris') || typeStr.includes('mudslide')) {
    typeWeight = 20;
  } else if (typeStr.includes('blocked') || typeStr.includes('road')) {
    typeWeight = 22;
  } else if (typeStr.includes('crack') || typeStr.includes('subsidence')) {
    typeWeight = 16;
  } else if (typeStr.includes('rockfall')) {
    typeWeight = 18;
  } else if (typeStr.includes('flood') || typeStr.includes('erosion')) {
    typeWeight = 15;
  }

  // 4. Evidence Bonus
  const hasPhotos = inc.photoUrls && inc.photoUrls.length > 0;
  const hasVideo = Boolean(inc.videoUrl);
  let evidenceWeight = 0;
  if (hasPhotos) evidenceWeight += 5;
  if (hasVideo) evidenceWeight += 8;

  // 5. Environmental Base (scaled 0-35)
  const envBaseWeight = (envRiskScore / 100) * 35;

  // Composite Priority Score (0-100)
  let rawPriority = envBaseWeight + statusWeight + typeWeight + evidenceWeight;
  if (statusStr === 'RESOLVED') rawPriority = Math.min(rawPriority, 30);
  const priorityScore = Math.min(100, Math.max(10, Math.round(rawPriority)));

  // Determine Level
  let priorityLevel: EmergencyPriorityLevel = 'LOW';
  if (priorityScore >= 75 || (statusStr === 'VERIFIED' && (typeStr.includes('landslide') || typeStr.includes('blocked')))) {
    priorityLevel = 'CRITICAL';
  } else if (priorityScore >= 55) {
    priorityLevel = 'HIGH';
  } else if (priorityScore >= 35) {
    priorityLevel = 'MEDIUM';
  }

  // Roads & Infrastructure
  const districtName = matchedDistrict?.name || 'Local District';
  const affectedRoads = extractRoads(`${inc.locationName} ${inc.description}`, districtName);
  const nearbyInfrastructure = extractInfrastructure(`${inc.locationName} ${inc.description}`, districtName);

  // Main Reason Synthesis based on real factors
  let mainReason = '';
  if (statusStr === 'VERIFIED') {
    mainReason = `Verified ${inc.incidentType || 'disaster'} impacting ${affectedRoads[0] || 'arterial road'}${
      nearbyInfrastructure ? ` near ${nearbyInfrastructure}` : ''
    }. Soil saturation at ${soilSat}% on ${slope}° slope.`;
  } else if (statusStr === 'UNDER REVIEW') {
    mainReason = `Ground report of ${inc.incidentType || 'hazard'} under active verification along ${
      affectedRoads[0] || 'transit route'
    } with environmental risk score ${envRiskScore}/100.`;
  } else if (statusStr === 'RESOLVED') {
    mainReason = `Remediation completed. Site in post-incident stabilization monitoring.`;
  } else {
    mainReason = `Submitted citizen report of ${inc.incidentType || 'incident'} near ${affectedRoads[0] || 'arterial corridor'} during elevated rainfall condition.`;
  }

  return {
    priorityLevel,
    priorityScore,
    riskScore: envRiskScore,
    mainReason,
    affectedRoads,
    nearbyInfrastructure,
    telemetry: {
      currentPrecipitationMm: precip,
      soilSaturationPercent: soilSat,
      slopeDegrees: slope,
    },
  };
}

/**
 * Builds the prioritized emergency response list
 */
export function buildEmergencyPriorityList(
  incidents: IncidentReportItem[],
  districtRiskPoints: DistrictHeatmapPoint[]
): EmergencyPrioritySummary {
  const districtRiskMap = new Map<string, DistrictHeatmapPoint>();
  districtRiskPoints.forEach((p) => districtRiskMap.set(p.districtId, p));

  const items: EmergencyPriorityItem[] = [];

  // 1. Process all real incident reports
  incidents.forEach((inc) => {
    const calc = calculateIncidentPriority(inc, districtRiskMap);

    // Extract district and state
    let districtName = 'NER District';
    let stateName = 'NER';
    const locLower = (inc.locationName || '').toLowerCase();
    const matched = ALL_NER_DISTRICTS.find((d) => locLower.includes(d.name.toLowerCase()));
    if (matched) {
      districtName = matched.name;
      stateName = matched.state;
    }

    items.push({
      id: `PRIO-INC-${inc.reportId}`,
      sourceType: 'INCIDENT_REPORT',
      priorityLevel: calc.priorityLevel,
      priorityScore: calc.priorityScore,
      riskScore: calc.riskScore,
      riskLevel: calc.riskScore >= 80 ? 'CRITICAL' : calc.riskScore >= 60 ? 'HIGH' : calc.riskScore >= 30 ? 'MODERATE' : 'LOW',
      locationName: inc.locationName || `${districtName}, ${stateName}`,
      district: districtName,
      state: stateName,
      latitude: inc.latitude,
      longitude: inc.longitude,
      incidentType: inc.incidentType,
      affectedRoads: calc.affectedRoads,
      nearbyInfrastructureOrVillage: calc.nearbyInfrastructure,
      mainReason: calc.mainReason,
      status: inc.status,
      lastUpdated: inc.updatedAt || inc.submittedAt || new Date().toISOString(),
      sourceIncident: inc,
      telemetryDetails: calc.telemetry,
    });
  });

  // Sort strictly real incidents by Priority Level (CRITICAL -> HIGH -> MEDIUM -> LOW), then by priorityScore descending
  const priorityRank: Record<EmergencyPriorityLevel, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  items.sort((a, b) => {
    const rankDiff = priorityRank[b.priorityLevel] - priorityRank[a.priorityLevel];
    if (rankDiff !== 0) return rankDiff;
    return b.priorityScore - a.priorityScore;
  });

  const criticalCount = items.filter((i) => i.priorityLevel === 'CRITICAL').length;
  const highCount = items.filter((i) => i.priorityLevel === 'HIGH').length;
  const mediumCount = items.filter((i) => i.priorityLevel === 'MEDIUM').length;
  const lowCount = items.filter((i) => i.priorityLevel === 'LOW').length;

  return {
    totalMonitored: items.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    topPriorityItem: items.length > 0 ? items[0] : null,
    items,
  };
}
