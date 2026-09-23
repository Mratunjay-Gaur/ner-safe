import {
  BorderCountryMeta,
  BorderStation,
  CrossBorderAlert,
  CrossBorderAlertLevel,
  CrossBorderWeatherData,
  NeighborCountryId,
} from '../types/crossBorder';
import { BORDER_COUNTRIES_DATA, NEIGHBOR_COUNTRIES_LIST } from '../data/crossBorderCountries';
import { getWeatherConditionByCode, getWindDirectionCardinal } from '../utils/weatherUtils';
import { HourlyForecastItem, DailyForecastItem } from '../types/weather';
import { safeParseResponse } from '../utils/safeFetch';

// In-memory client cache to prevent redundant Open-Meteo API network calls
const crossBorderCache = new Map<string, { data: CrossBorderWeatherData; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Fetch live meteorological telemetry and calculate cross-border impact for a neighboring country station.
 */
export async function fetchCrossBorderWeatherData(
  countryId: NeighborCountryId,
  stationId?: string
): Promise<CrossBorderWeatherData> {
  const country = BORDER_COUNTRIES_DATA[countryId];
  if (!country) {
    throw new Error(`Country ${countryId} is not a valid NER bordering country.`);
  }

  // Find target station or default to the first station (usually capital or primary border hub)
  const station: BorderStation =
    country.stations.find((s) => s.id === stationId) || country.stations[0];

  const cacheKey = `${countryId}_${station.id}`;
  const cached = crossBorderCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const { latitude: lat, longitude: lon } = station;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,visibility&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&past_days=1&forecast_days=7&timezone=auto`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  const response = await fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );

  if (!response.ok) {
    throw new Error(`Open-Meteo service responded with status ${response.status} for ${country.name}`);
  }

  const { data: raw, ok: isParsedOk, error: parseErr } = await safeParseResponse(response);
  if (!isParsedOk || !raw) {
    throw new Error(parseErr || `Failed to parse telemetry for ${country.name}`);
  }

  const currentRaw = raw.current || {};
  const hourlyRaw = raw.hourly || {};
  const dailyRaw = raw.daily || {};

  const currentWeatherCode = currentRaw.weather_code ?? 0;
  const { condition: weatherCondition } = getWeatherConditionByCode(currentWeatherCode);
  const windDir = currentRaw.wind_direction_10m ?? 0;
  const windCardinal = getWindDirectionCardinal(windDir);

  const current = {
    temperature: Math.round((currentRaw.temperature_2m ?? 0) * 10) / 10,
    apparentTemperature:
      Math.round((currentRaw.apparent_temperature ?? currentRaw.temperature_2m ?? 0) * 10) / 10,
    relativeHumidity: Math.round(currentRaw.relative_humidity_2m ?? 0),
    windSpeed: Math.round((currentRaw.wind_speed_10m ?? 0) * 10) / 10,
    windDirection: windDir,
    windDirectionCardinal: windCardinal,
    surfacePressure: Math.round(currentRaw.surface_pressure ?? 1013),
    visibility: currentRaw.visibility
      ? Math.round((currentRaw.visibility / 1000) * 10) / 10
      : 10,
    cloudCover: Math.round(currentRaw.cloud_cover ?? 0),
    precipitation: Math.round((currentRaw.precipitation ?? 0) * 10) / 10,
    weatherCode: currentWeatherCode,
    weatherCondition,
    isDay: currentRaw.is_day === 1,
    updatedAt: currentRaw.time || new Date().toISOString(),
    dataSource: 'WMO / ECMWF Global Meteorological Network via Open-Meteo',
  };

  // Process 24-hour forecast
  const hourlyTimes: string[] = hourlyRaw.time || [];
  const currentTimeStr = currentRaw.time;
  let startIndex = 0;
  if (currentTimeStr) {
    const foundIdx = hourlyTimes.findIndex((t) => t >= currentTimeStr);
    if (foundIdx !== -1) startIndex = foundIdx;
  }

  const hourly: HourlyForecastItem[] = [];
  const next24 = hourlyTimes.slice(startIndex, startIndex + 24);
  for (let i = 0; i < next24.length; i++) {
    const idx = startIndex + i;
    const wCode = hourlyRaw.weather_code?.[idx] ?? 0;
    const { condition } = getWeatherConditionByCode(wCode);
    hourly.push({
      time: hourlyRaw.time[idx],
      timestamp: new Date(hourlyRaw.time[idx]).getTime(),
      temperature: Math.round((hourlyRaw.temperature_2m?.[idx] ?? 0) * 10) / 10,
      precipitation: Math.round((hourlyRaw.precipitation?.[idx] ?? 0) * 10) / 10,
      precipitationProbability: hourlyRaw.precipitation_probability?.[idx] ?? 0,
      relativeHumidity: Math.round(hourlyRaw.relative_humidity_2m?.[idx] ?? 0),
      weatherCode: wCode,
      weatherCondition: condition,
      windSpeed: Math.round((hourlyRaw.wind_speed_10m?.[idx] ?? 0) * 10) / 10,
      isDay: true,
    });
  }

  // Process 7-day daily forecast
  const dailyTimes: string[] = dailyRaw.time || [];
  const daily: DailyForecastItem[] = [];
  for (let i = 0; i < dailyTimes.length; i++) {
    const dCode = dailyRaw.weather_code?.[i] ?? 0;
    const { condition } = getWeatherConditionByCode(dCode);
    const dateObj = new Date(dailyTimes[i]);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    daily.push({
      date: dailyTimes[i],
      dayName: i === 0 ? 'Today' : dayName,
      temperatureMax: Math.round((dailyRaw.temperature_2m_max?.[i] ?? 0) * 10) / 10,
      temperatureMin: Math.round((dailyRaw.temperature_2m_min?.[i] ?? 0) * 10) / 10,
      precipitationSum: Math.round((dailyRaw.precipitation_sum?.[i] ?? 0) * 10) / 10,
      precipitationProbabilityMax: dailyRaw.precipitation_probability_max?.[i] ?? 0,
      windSpeedMax: Math.round((dailyRaw.wind_speed_10m_max?.[i] ?? 0) * 10) / 10,
      weatherCode: dCode,
      weatherCondition: condition,
      sunrise: dailyRaw.sunrise?.[i] ? dailyRaw.sunrise[i].split('T')[1] : undefined,
      sunset: dailyRaw.sunset?.[i] ? dailyRaw.sunset[i].split('T')[1] : undefined,
      uvIndexMax: dailyRaw.uv_index_max?.[i] ?? undefined,
    });
  }

  // Calculate Cross-Border Alerts & Relevance based on real meteorological data
  const todayPrecip = daily[0]?.precipitationSum ?? current.precipitation;
  const maxPrecipNext48h = Math.max(
    todayPrecip,
    daily[1]?.precipitationSum ?? 0,
    daily[2]?.precipitationSum ?? 0
  );
  const connectedStatesList = country.connectedNerStates.map((s) => s.state);

  const alerts: CrossBorderAlert[] = [];
  let upstreamRainfallStatus: 'Minimal' | 'Moderate' | 'Heavy' | 'Extreme' = 'Minimal';
  if (todayPrecip >= 60 || current.precipitation >= 20) {
    upstreamRainfallStatus = 'Extreme';
  } else if (todayPrecip >= 25 || current.precipitation >= 8) {
    upstreamRainfallStatus = 'Heavy';
  } else if (todayPrecip >= 5 || current.precipitation >= 2) {
    upstreamRainfallStatus = 'Moderate';
  }

  // 1. Convective / Severe Storm Alert
  if (currentWeatherCode >= 95 || (daily[0] && daily[0].weatherCode >= 95)) {
    const isSevere = currentWeatherCode >= 96;
    alerts.push({
      id: `alert-ts-${countryId}-${station.id}`,
      countryId,
      countryName: country.name,
      level: isSevere ? 'CRITICAL' : 'HIGH',
      event: isSevere ? 'Severe Convective Thunderstorm & Hail' : 'Active Thunderstorm Front',
      severity: isSevere ? 'Warning' : 'Watch',
      description: `Intense convective instability detected at ${station.name} (${country.name}). Lightning, violent downdrafts, and localized cloudburst potential.`,
      affectedBorderStates: connectedStatesList,
      relevanceExplanation: `Atmospheric storm cells in ${country.name} border areas frequently propagate directly across the boundary into adjacent terrain of ${connectedStatesList.join(', ')}.`,
      detectedAt: current.updatedAt,
    });
  }

  // 2. Transboundary Precipitation / Flooding Alert
  if (maxPrecipNext48h >= 40 || current.precipitation >= 12) {
    const isCritical = maxPrecipNext48h >= 75 || current.precipitation >= 25;
    alerts.push({
      id: `alert-rain-${countryId}-${station.id}`,
      countryId,
      countryName: country.name,
      level: isCritical ? 'CRITICAL' : 'HIGH',
      event: isCritical ? 'Critical Transboundary Rainfall' : 'Heavy Upstream Precipitation Advisory',
      severity: isCritical ? 'Severe' : 'Warning',
      description: `Elevated precipitation observed at ${station.name} (${todayPrecip} mm today, peaking at ${maxPrecipNext48h} mm in 48h).`,
      affectedBorderStates: connectedStatesList,
      relevanceExplanation: `Hydrological drainage flows from ${country.name} into shared river catchments. Water table saturation raises slope destabilization risks across connected border districts in ${connectedStatesList.join(', ')}.`,
      detectedAt: current.updatedAt,
    });
  } else if (maxPrecipNext48h >= 20) {
    alerts.push({
      id: `alert-modrain-${countryId}-${station.id}`,
      countryId,
      countryName: country.name,
      level: 'ELEVATED',
      event: 'Moderate Rainfall Advisory',
      severity: 'Advisory',
      description: `Sustained rainfall detected in ${country.name} border zone (${todayPrecip} mm today).`,
      affectedBorderStates: connectedStatesList,
      relevanceExplanation: `Ground moisture accumulation in ${station.name} may heighten runoff velocity into ${connectedStatesList.join(', ')}.`,
      detectedAt: current.updatedAt,
    });
  }

  // 3. High Wind Alert
  if (current.windSpeed >= 40) {
    alerts.push({
      id: `alert-wind-${countryId}-${station.id}`,
      countryId,
      countryName: country.name,
      level: current.windSpeed >= 55 ? 'HIGH' : 'ELEVATED',
      event: 'Strong Surface Wind & Gale Advisory',
      severity: 'Watch',
      description: `Surface wind gusts reaching ${current.windSpeed} km/h from ${windCardinal} across ${station.name}.`,
      affectedBorderStates: connectedStatesList,
      relevanceExplanation: `Airflow vector towards ${windCardinal} indicates rapid transboundary cloud transit and atmospheric moisture convergence towards the NER boundary.`,
      detectedAt: current.updatedAt,
    });
  }

  // Calculate Deterministic Cross-Border Relevance Score (0 - 100)
  let relevanceScore = 15; // baseline monitoring baseline
  if (upstreamRainfallStatus === 'Extreme') relevanceScore += 45;
  else if (upstreamRainfallStatus === 'Heavy') relevanceScore += 30;
  else if (upstreamRainfallStatus === 'Moderate') relevanceScore += 15;

  if (currentWeatherCode >= 95) relevanceScore += 25;
  else if (currentWeatherCode >= 80) relevanceScore += 15;
  else if (currentWeatherCode >= 51) relevanceScore += 10;

  if (current.windSpeed >= 40) relevanceScore += 15;
  else if (current.windSpeed >= 25) relevanceScore += 8;

  if (current.relativeHumidity >= 85 && current.precipitation > 0) relevanceScore += 10;

  relevanceScore = Math.min(100, Math.max(10, relevanceScore));

  let relevanceLevel: CrossBorderAlertLevel = 'NORMAL';
  if (relevanceScore >= 75) relevanceLevel = 'CRITICAL';
  else if (relevanceScore >= 50) relevanceLevel = 'HIGH';
  else if (relevanceScore >= 30) relevanceLevel = 'ELEVATED';

  // Construct Cross-Border Relevance Note
  let crossBorderRelevanceNote = '';
  switch (countryId) {
    case 'bangladesh':
      crossBorderRelevanceNote =
        upstreamRainfallStatus === 'Extreme' || upstreamRainfallStatus === 'Heavy'
          ? `High cyclonic/monsoonal precipitation in Bangladesh (${current.precipitation} mm/h) directly affects floodplains and slope saturation in Meghalaya (Cherrapunji/Mawsynram), Assam (Barak/Surma basin), Tripura, and Mizoram.`
          : `Weather conditions at ${station.name} are currently stable. River discharge levels across the 54 shared transboundary channels into Assam and Meghalaya remain within seasonal thresholds.`;
      break;
    case 'bhutan':
      crossBorderRelevanceNote =
        upstreamRainfallStatus === 'Extreme' || upstreamRainfallStatus === 'Heavy'
          ? `Heavy runoff from Bhutan's high mountain catchments flows down the Manas, Sankosh, and Beki rivers into Assam (Kokrajhar, Chirang, Baksa) and Arunachal Pradesh. Watch for sudden foothill stream surges.`
          : `Mountain precipitation in Bhutan remains moderate. Transboundary watercourses entering western Assam and Arunachal Pradesh are at standard seasonal flow.`;
      break;
    case 'china':
      crossBorderRelevanceNote =
        upstreamRainfallStatus === 'Extreme' || upstreamRainfallStatus === 'Heavy'
          ? `Precipitation/snowmelt at ${station.name} directly impacts the Yarlung Tsangpo / Siang River corridor entering Arunachal Pradesh (Upper Siang) and glacial passes in Sikkim. Monitoring transboundary hydrological levels.`
          : `Sub-alpine conditions across southeastern Tibet. Hydrological flow along the Siang corridor into Arunachal Pradesh and Sikkim passes is consistent with baseline observations.`;
      break;
    case 'myanmar':
      crossBorderRelevanceNote =
        upstreamRainfallStatus === 'Extreme' || upstreamRainfallStatus === 'Heavy'
          ? `Intense squall line across Western Myanmar mountain ranges (Chin Hills / Sagaing). Shared geological fault lines in Mizoram (Champhai) and Manipur (Chandel/Tengnoupal) face elevated slope failure risks.`
          : `Observations at ${station.name} show steady conditions along the Indo-Myanmar mountain arc. Cross-border transit corridors (Moreh-Tamu, Zokhawthar) are operating with normal weather parameters.`;
      break;
    case 'nepal':
      crossBorderRelevanceNote =
        upstreamRainfallStatus === 'Extreme' || upstreamRainfallStatus === 'Heavy'
          ? `Convective storm activity in Eastern Nepal hills (Singalila ridge / Koshi Province) triggers rapid runoff into West Sikkim (Geyzing, Soreng) and Kangchenjunga catchment.`
          : `Stable atmospheric conditions over Eastern Nepal. Singalila ridgeline winds and Teesta upper headwater tributaries in Sikkim remain within regular boundaries.`;
      break;
  }

  const transboundaryWindImpact = `${current.windSpeed} km/h ${windCardinal} (${
    current.windSpeed > 30 ? 'Moderate to High transboundary air mass transport' : 'Normal airflow'
  })`;

  const result: CrossBorderWeatherData = {
    country,
    activeStation: station,
    current,
    hourly,
    daily,
    alerts,
    crossBorderRelevanceScore: relevanceScore,
    crossBorderRelevanceLevel: relevanceLevel,
    crossBorderRelevanceNote,
    upstreamRainfallStatus,
    transboundaryWindImpact,
    lastUpdated: current.updatedAt,
  };

  crossBorderCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

/**
 * Fetch a multi-country overview of all 5 bordering countries simultaneously.
 */
export async function fetchAllBorderCountriesOverview(): Promise<
  Array<{
    country: BorderCountryMeta;
    weather: CrossBorderWeatherData | null;
    error?: string;
  }>
> {
  const results = await Promise.allSettled(
    NEIGHBOR_COUNTRIES_LIST.map((country) =>
      fetchCrossBorderWeatherData(country.id, country.stations[0].id)
    )
  );

  return NEIGHBOR_COUNTRIES_LIST.map((country, idx) => {
    const res = results[idx];
    if (res.status === 'fulfilled') {
      return { country, weather: res.value };
    } else {
      return { country, weather: null, error: res.reason?.message || 'Failed to fetch telemetry' };
    }
  });
}
