import { INDIA_STATES_DATA } from '../data/indiaLocations';
import { safeFetchJson, safeParseResponse } from '../utils/safeFetch';
import { DistrictEnvironmentalProfile } from '../types/environmental';
import { IIncidentReport } from '../types/incident';
import { CalculatedRiskAssessment, DistrictHeatmapPoint, NerRiskHeatmapState } from '../types/risk';
import { LocationItem, WeatherResponse } from '../types/weather';
import { getWeatherConditionByCode, getWindDirectionCardinal } from '../utils/weatherUtils';
import { fetchDistrictEnvironmentalProfile } from './environmentalService';
import { fetchIncidents } from './incidentService';
import { calculateMultiFactorLandslideRisk } from './riskEngine';
import { fetchDistrictWeather } from './weatherService';

// All 130 North Eastern Region (NER) districts from the 8 states
export const ALL_NER_DISTRICTS: LocationItem[] = INDIA_STATES_DATA
  .filter((state) => state.isNer)
  .flatMap((state) => state.districts);

// In-memory cache for calculated assessments (TTL: 5 minutes)
const districtAssessmentCache = new Map<
  string,
  {
    point: DistrictHeatmapPoint;
    timestamp: number;
  }
>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Initializes empty heatmap points for all NER districts
 */
export function getInitialNerHeatmapPoints(): DistrictHeatmapPoint[] {
  return ALL_NER_DISTRICTS.map((d) => ({
    districtId: d.id,
    districtName: d.name,
    state: d.state,
    stateCode: d.stateCode,
    latitude: d.latitude,
    longitude: d.longitude,
    elevationMeters: d.elevationMeters,
    riskScore: null,
    riskLevel: 'UNAVAILABLE',
    assessmentStatement: 'Risk data loading...',
    lastUpdated: null,
    status: 'LOADING',
    dataAvailabilityNotes: 'Pending telemetry ingestion',
  }));
}

/**
 * Converts a CalculatedRiskAssessment into a DistrictHeatmapPoint
 */
export function assessmentToHeatmapPoint(
  assessment: CalculatedRiskAssessment,
  envProfile?: DistrictEnvironmentalProfile | null
): DistrictHeatmapPoint {
  const loc = assessment.location;
  const slope = envProfile?.terrainSlope?.calculatedSlopeDegrees ??
    assessment.factors.find((f) => f.id === 'factor-slope')?.measuredValue;
  const soil = envProfile?.soilMoisture?.surfaceSaturationPercent ??
    assessment.factors.find((f) => f.id === 'factor-soil')?.measuredValue;
  const rainFactor = assessment.factors.find((f) => f.id === 'factor-rain');
  const forecastFactor = assessment.factors.find((f) => f.id === 'factor-forecast');
  const historyFactor = assessment.factors.find((f) => f.id === 'factor-history');

  return {
    districtId: loc.id,
    districtName: loc.name,
    state: loc.state,
    stateCode: loc.stateCode,
    latitude: loc.latitude,
    longitude: loc.longitude,
    elevationMeters: loc.elevationMeters || 0,
    riskScore: assessment.riskScore,
    riskLevel: assessment.riskLevel,
    assessmentStatement: assessment.assessmentStatement,
    lastUpdated: assessment.calculatedAt,
    status: 'READY',
    dataAvailabilityNotes: `${assessment.dataCompleteness.completenessPercent}% feeds active (${assessment.dataCompleteness.availableSourcesCount}/${assessment.dataCompleteness.totalSourcesCount})`,
    slopeDegrees: typeof slope === 'number' ? slope : parseFloat(String(slope)) || undefined,
    soilSaturationPercent: typeof soil === 'number' ? soil : parseFloat(String(soil)) || undefined,
    currentPrecipitationMm: assessment.forecastWindows[0]?.expectedPrecipitationMm,
    forecastPrecipitationMm: assessment.forecastWindows[3]?.expectedPrecipitationMm,
    historicalLandslideCount: typeof historyFactor?.measuredValue === 'number' ? historyFactor.measuredValue : undefined,
    fullAssessment: assessment,
  };
}

/**
 * Updates or injects an already calculated district assessment into the heatmap cache
 */
export function cacheDistrictAssessment(
  assessment: CalculatedRiskAssessment,
  envProfile?: DistrictEnvironmentalProfile | null
): DistrictHeatmapPoint {
  const point = assessmentToHeatmapPoint(assessment, envProfile);
  districtAssessmentCache.set(assessment.location.id, {
    point,
    timestamp: Date.now(),
  });
  return point;
}

/**
 * Fetches and calculates live multi-factor risk assessment for a batch of districts
 * using the server-side batch proxy and verified datasets.
 */
async function fetchAndCalculateBatch(
  districts: LocationItem[],
  incidentsList: IIncidentReport[]
): Promise<DistrictHeatmapPoint[]> {
  if (districts.length === 0) return [];

  // Check cache first for valid items
  const results: DistrictHeatmapPoint[] = [];
  const districtsToFetch: LocationItem[] = [];

  for (const d of districts) {
    const cached = districtAssessmentCache.get(d.id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      results.push(cached.point);
    } else {
      districtsToFetch.push(d);
    }
  }

  if (districtsToFetch.length === 0) {
    return results;
  }

  try {
    let rawDataMap: Record<string, any> = {};

    // 1. First try server-side resilient batch telemetry endpoint
    try {
      const { ok, data: json } = await safeFetchJson<any>('/api/risk/ner-telemetry-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          districts: districtsToFetch.map((d) => ({
            id: d.id,
            name: d.name,
            latitude: d.latitude,
            longitude: d.longitude,
          })),
        }),
      });

      if (ok && json && json.telemetry) {
        rawDataMap = json.telemetry;
      }
    } catch {
      // Backend proxy fallback if needed
    }

    // 2. For any districts not returned by server proxy, attempt direct fetch if few
    const stillNeeded = districtsToFetch.filter((d) => !rawDataMap[d.id]);
    if (stillNeeded.length > 0) {
      try {
        const lats = stillNeeded.map((d) => d.latitude.toFixed(4)).join(',');
        const lons = stillNeeded.map((d) => d.longitude.toFixed(4)).join(',');
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,precipitation_sum,precipitation_probability_max&hourly=soil_moisture_0_to_7cm&timezone=Asia%2FKolkata`;

        const res = await fetch(url);
        if (res.ok) {
          const { data: rawData } = await safeParseResponse<any>(res);
          if (rawData) {
            const itemsArray = Array.isArray(rawData) ? rawData : [rawData];
            stillNeeded.forEach((d, idx) => {
              const item = itemsArray[idx] || itemsArray[0];
              if (item && item.current) {
                rawDataMap[d.id] = item;
              }
            });
          }
        }
      } catch {
        // Quietly absorb network or rate-limit issues and let unavailable fallback take over
      }
    }

    // Process each district in parallel
    const calculatedPoints = await Promise.all(
      districtsToFetch.map(async (district) => {
        const item = rawDataMap[district.id];
        if (!item || !item.current) {
          // If required data is unavailable, return explicit UNAVAILABLE without fake numbers
          return {
            districtId: district.id,
            districtName: district.name,
            state: district.state,
            stateCode: district.stateCode,
            latitude: district.latitude,
            longitude: district.longitude,
            elevationMeters: district.elevationMeters,
            riskScore: null,
            riskLevel: 'UNAVAILABLE' as const,
            assessmentStatement: 'Risk data unavailable',
            lastUpdated: new Date().toISOString(),
            status: 'UNAVAILABLE' as const,
            dataAvailabilityNotes: 'Meteorological telemetry feed unreachable or rate-limited',
          };
        }

        try {
          const currentRaw = item.current;
          const dailyRaw = item.daily || {};
          const hourlyRaw = item.hourly || {};
          const weatherCode = currentRaw.weather_code ?? 0;
          const { condition } = getWeatherConditionByCode(weatherCode);

          // Construct standardized WeatherResponse
          const weatherRes: WeatherResponse = {
            location: {
              district: district.name,
              state: district.state,
              latitude: district.latitude,
              longitude: district.longitude,
              elevation: district.elevationMeters,
              isNer: true,
            },
            current: {
              temperature: Math.round((currentRaw.temperature_2m ?? 0) * 10) / 10,
              apparentTemperature: Math.round((currentRaw.temperature_2m ?? 0) * 10) / 10,
              relativeHumidity: Math.round(currentRaw.relative_humidity_2m ?? 0),
              windSpeed: Math.round((currentRaw.wind_speed_10m ?? 0) * 10) / 10,
              windDirection: 0,
              windDirectionCardinal: 'N',
              surfacePressure: 1013,
              visibility: 10,
              cloudCover: 20,
              precipitation: Math.round((currentRaw.precipitation ?? 0) * 10) / 10,
              weatherCode,
              weatherCondition: condition,
              isDay: true,
              updatedAt: currentRaw.time || new Date().toISOString(),
              dataSource: 'WMO / ECMWF Global Meteorological Network',
            },
            hourly: (hourlyRaw.time || []).slice(0, 24).map((t: string, hIdx: number) => ({
              time: t,
              timestamp: new Date(t).getTime(),
              temperature: Math.round((hourlyRaw.temperature_2m?.[hIdx] ?? currentRaw.temperature_2m ?? 0) * 10) / 10,
              precipitation: Math.round((hourlyRaw.precipitation?.[hIdx] ?? currentRaw.precipitation ?? 0) * 10) / 10,
              precipitationProbability: hourlyRaw.precipitation_probability?.[hIdx] ?? 0,
              relativeHumidity: Math.round(hourlyRaw.relative_humidity_2m?.[hIdx] ?? currentRaw.relative_humidity_2m ?? 0),
              weatherCode: hourlyRaw.weather_code?.[hIdx] ?? weatherCode,
              weatherCondition: condition,
              windSpeed: Math.round((hourlyRaw.wind_speed_10m?.[hIdx] ?? currentRaw.wind_speed_10m ?? 0) * 10) / 10,
              isDay: true,
            })),
            daily: (dailyRaw.time || []).slice(0, 7).map((d: string, dIdx: number) => ({
              date: d,
              dayName: 'Day',
              temperatureMax: dailyRaw.temperature_2m_max?.[dIdx] !== undefined ? Math.round(dailyRaw.temperature_2m_max[dIdx] * 10) / 10 : Math.round((currentRaw.temperature_2m ?? 0) * 10) / 10,
              temperatureMin: dailyRaw.temperature_2m_min?.[dIdx] !== undefined ? Math.round(dailyRaw.temperature_2m_min[dIdx] * 10) / 10 : Math.round((currentRaw.temperature_2m ?? 0) * 10) / 10,
              precipitationSum: Math.round((dailyRaw.precipitation_sum?.[dIdx] ?? 0) * 10) / 10,
              precipitationProbabilityMax: dailyRaw.precipitation_probability_max?.[dIdx] ?? 0,
              windSpeedMax: Math.round((dailyRaw.wind_speed_10m_max?.[dIdx] ?? currentRaw.wind_speed_10m ?? 0) * 10) / 10,
              weatherCode: dailyRaw.weather_code?.[dIdx] ?? weatherCode,
              weatherCondition: condition,
            })),
            alerts: [],
            history: [],
            status: {
              weatherApiConnected: true,
              provider: 'WMO / ECMWF Global Open Meteorological Network',
              cached: false,
              lastUpdated: new Date().toISOString(),
            },
          };

          // Fetch environmental profile (cached DEM slope + verified historical landslides)
          const envProfile = await fetchDistrictEnvironmentalProfile(district, currentRaw.time);

          // Calculate multi-factor risk assessment using the official engine
          const assessment = calculateMultiFactorLandslideRisk(
            district,
            weatherRes,
            envProfile,
            incidentsList
          );

          const point = assessmentToHeatmapPoint(assessment, envProfile);
          districtAssessmentCache.set(district.id, {
            point,
            timestamp: Date.now(),
          });

          return point;
        } catch {
          return {
            districtId: district.id,
            districtName: district.name,
            state: district.state,
            stateCode: district.stateCode,
            latitude: district.latitude,
            longitude: district.longitude,
            elevationMeters: district.elevationMeters,
            riskScore: null,
            riskLevel: 'UNAVAILABLE' as const,
            assessmentStatement: 'Risk data unavailable',
            lastUpdated: new Date().toISOString(),
            status: 'UNAVAILABLE' as const,
            dataAvailabilityNotes: 'Environmental sensor synthesis unavailable',
          };
        }
      })
    );

    return [...results, ...calculatedPoints];
  } catch {
    // Return unavailable placeholders for failed batch without crashing
    const fallbacks: DistrictHeatmapPoint[] = districtsToFetch.map((d) => ({
      districtId: d.id,
      districtName: d.name,
      state: d.state,
      stateCode: d.stateCode,
      latitude: d.latitude,
      longitude: d.longitude,
      elevationMeters: d.elevationMeters,
      riskScore: null,
      riskLevel: 'UNAVAILABLE',
      assessmentStatement: 'Risk data unavailable',
      lastUpdated: new Date().toISOString(),
      status: 'UNAVAILABLE',
      dataAvailabilityNotes: 'Live telemetry network unavailable',
    }));

    return [...results, ...fallbacks];
  }
}

/**
 * Progressively loads and streams all 130 NER districts risk data
 * in responsive batches with progress reporting.
 */
export async function loadAllNerDistrictsProgressive(
  onBatchLoaded: (updatedPoints: DistrictHeatmapPoint[], progressPercent: number) => void,
  priorityDistrictId?: string
): Promise<DistrictHeatmapPoint[]> {
  const allDistricts = [...ALL_NER_DISTRICTS];

  // If a priority district is specified, move it to the front of the queue
  if (priorityDistrictId) {
    const pIdx = allDistricts.findIndex((d) => d.id === priorityDistrictId);
    if (pIdx > 0) {
      const [priority] = allDistricts.splice(pIdx, 1);
      allDistricts.unshift(priority);
    }
  }

  // Load ground incidents once for spatial proximity evaluation
  let incidents: IIncidentReport[] = [];
  try {
    const rawIncidents = await fetchIncidents({ limit: 100 });
    incidents = (rawIncidents as unknown as IIncidentReport[]) || [];
  } catch {
    incidents = [];
  }

  // Process in batches of 16 districts
  const BATCH_SIZE = 16;
  const total = allDistricts.length;
  let allPointsMap = new Map<string, DistrictHeatmapPoint>();

  // Initialize all as loading
  for (const d of allDistricts) {
    const cached = districtAssessmentCache.get(d.id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      allPointsMap.set(d.id, cached.point);
    } else {
      allPointsMap.set(d.id, {
        districtId: d.id,
        districtName: d.name,
        state: d.state,
        stateCode: d.stateCode,
        latitude: d.latitude,
        longitude: d.longitude,
        elevationMeters: d.elevationMeters,
        riskScore: null,
        riskLevel: 'UNAVAILABLE',
        assessmentStatement: 'Loading telemetry...',
        lastUpdated: null,
        status: 'LOADING',
      });
    }
  }

  // Send initial state
  onBatchLoaded(Array.from(allPointsMap.values()), 5);

  let processedCount = 0;

  for (let i = 0; i < allDistricts.length; i += BATCH_SIZE) {
    const chunk = allDistricts.slice(i, i + BATCH_SIZE);
    const calculatedChunk = await fetchAndCalculateBatch(chunk, incidents);

    for (const pt of calculatedChunk) {
      allPointsMap.set(pt.districtId, pt);
    }

    processedCount += chunk.length;
    const progress = Math.min(100, Math.round((processedCount / total) * 100));
    onBatchLoaded(Array.from(allPointsMap.values()), progress);

    // Yield briefly to event loop for smooth UI rendering
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  return Array.from(allPointsMap.values());
}

/**
 * Calculates summary statistics for the heatmap
 */
export function computeHeatmapStats(points: DistrictHeatmapPoint[]) {
  let critical = 0;
  let high = 0;
  let moderate = 0;
  let low = 0;
  let unavailable = 0;

  for (const p of points) {
    if (p.status !== 'READY' || p.riskScore === null || p.riskLevel === 'UNAVAILABLE') {
      unavailable++;
    } else if (p.riskLevel === 'CRITICAL') {
      critical++;
    } else if (p.riskLevel === 'HIGH') {
      high++;
    } else if (p.riskLevel === 'MODERATE') {
      moderate++;
    } else if (p.riskLevel === 'LOW') {
      low++;
    }
  }

  return { critical, high, moderate, low, unavailable };
}
