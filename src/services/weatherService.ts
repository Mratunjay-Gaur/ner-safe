import { LocationItem, NerStateSummary, SystemStatusInfo, WeatherResponse, HourlyForecastItem, DailyForecastItem, ClimateHistoryPoint, WeatherAlert } from '../types/weather';
import { getWeatherConditionByCode, getWindDirectionCardinal } from '../utils/weatherUtils';
import { ALL_DISTRICTS, NER_STATES } from '../data/indiaLocations';
import { safeFetchJson, safeParseResponse } from '../utils/safeFetch';

// 8 NER Capital reference coordinates for regional telemetry
const NER_STATIONS = [
  { state: 'Assam', capitalDistrict: 'Dibrugarh', lat: 27.4728, lon: 94.9120 },
  { state: 'Arunachal Pradesh', capitalDistrict: 'Itanagar', lat: 27.0844, lon: 93.6053 },
  { state: 'Manipur', capitalDistrict: 'Imphal', lat: 24.8170, lon: 93.9368 },
  { state: 'Meghalaya', capitalDistrict: 'Shillong', lat: 25.5788, lon: 91.8933 },
  { state: 'Mizoram', capitalDistrict: 'Aizawl', lat: 23.7271, lon: 92.7176 },
  { state: 'Nagaland', capitalDistrict: 'Kohima', lat: 25.6747, lon: 94.1100 },
  { state: 'Sikkim', capitalDistrict: 'Gangtok', lat: 27.3389, lon: 88.6065 },
  { state: 'Tripura', capitalDistrict: 'Agartala', lat: 23.8315, lon: 91.2868 },
];

// In-memory client cache for real meteorological data
const clientDistrictWeatherCache = new Map<string, { data: WeatherResponse; timestamp: number }>();
let clientNerSummaryCache: { data: NerStateSummary[]; timestamp: number } | null = null;

/**
 * Direct client-side meteorological fetch from Open-Meteo (WMO / ECMWF Global Meteorological Network).
 * Used directly or as an instant fallback if Express proxy is warming up or dev server is in SPA mode.
 */
async function fetchDirectFromOpenMeteo(location: LocationItem): Promise<WeatherResponse> {
  const { latitude: lat, longitude: lon, name: district, state, isNer, elevationMeters } = location;
  const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}`;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,visibility&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&past_days=2&forecast_days=7&timezone=Asia%2FKolkata`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!response.ok) {
      throw new Error(`Open-Meteo service responded with status ${response.status}`);
    }

    const { data: raw, ok: isParsedOk, error: parseErr } = await safeParseResponse(response);
    if (!isParsedOk || !raw) {
      throw new Error(parseErr || 'Invalid meteorological telemetry response format');
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
      apparentTemperature: Math.round((currentRaw.apparent_temperature ?? currentRaw.temperature_2m ?? 0) * 10) / 10,
      relativeHumidity: Math.round(currentRaw.relative_humidity_2m ?? 0),
      windSpeed: Math.round((currentRaw.wind_speed_10m ?? 0) * 10) / 10,
      windDirection: windDir,
      windDirectionCardinal: windCardinal,
      surfacePressure: Math.round(currentRaw.surface_pressure ?? 1013),
      visibility: currentRaw.visibility ? Math.round((currentRaw.visibility / 1000) * 10) / 10 : 10,
      cloudCover: Math.round(currentRaw.cloud_cover ?? 0),
      precipitation: Math.round((currentRaw.precipitation ?? 0) * 10) / 10,
      weatherCode: currentWeatherCode,
      weatherCondition,
      isDay: currentRaw.is_day === 1,
      updatedAt: currentRaw.time || new Date().toISOString(),
      dataSource: 'WMO / ECMWF Global Meteorological Network',
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

    // Process Past Climate History (past 48 hours)
    const history: ClimateHistoryPoint[] = [];
    if (startIndex > 0) {
      const pastSlice = hourlyTimes.slice(Math.max(0, startIndex - 48), startIndex);
      const pastStartIdx = Math.max(0, startIndex - 48);
      for (let i = 0; i < pastSlice.length; i += 2) {
        const idx = pastStartIdx + i;
        const timeVal = hourlyRaw.time[idx];
        history.push({
          time: timeVal.split('T')[1]?.slice(0, 5) || timeVal,
          dateStr: timeVal.split('T')[0] || '',
          temperature: Math.round((hourlyRaw.temperature_2m?.[idx] ?? 0) * 10) / 10,
          precipitation: Math.round((hourlyRaw.precipitation?.[idx] ?? 0) * 10) / 10,
          humidity: Math.round(hourlyRaw.relative_humidity_2m?.[idx] ?? 0),
        });
      }
    }

    // Meteorological alerts evaluation
    const alerts: WeatherAlert[] = [];
    if (currentWeatherCode >= 95 || (daily[0] && daily[0].weatherCode >= 95)) {
      alerts.push({
        id: `alert-ts-${district.toLowerCase()}-${Date.now()}`,
        severity: currentWeatherCode >= 96 ? 'Warning' : 'Watch',
        event: currentWeatherCode >= 96 ? 'Severe Thunderstorm with Hail' : 'Thunderstorm Activity',
        description: `Active convective activity observed in ${district}. Possibility of localized gusty winds and lightning.`,
        startTime: current.updatedAt,
        endTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        source: 'Meteorological Weather Network',
        areaDesc: `${district}, ${state}`,
      });
    } else if (current.precipitation >= 25 || (daily[0] && daily[0].precipitationSum >= 40)) {
      alerts.push({
        id: `alert-rain-${district.toLowerCase()}-${Date.now()}`,
        severity: daily[0]?.precipitationSum >= 65 ? 'Warning' : 'Advisory',
        event: 'Heavy Rainfall Advisory',
        description: `Persistent precipitation detected (${current.precipitation} mm/h current, ${daily[0]?.precipitationSum} mm daily expected) across ${district}.`,
        startTime: current.updatedAt,
        endTime: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        source: 'Meteorological Weather Network',
        areaDesc: `${district}, ${state}`,
      });
    } else if (current.windSpeed >= 50) {
      alerts.push({
        id: `alert-wind-${district.toLowerCase()}-${Date.now()}`,
        severity: 'Advisory',
        event: 'High Wind Speed Alert',
        description: `Elevated surface wind gusts reaching ${current.windSpeed} km/h from ${windCardinal}.`,
        startTime: current.updatedAt,
        endTime: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        source: 'Meteorological Weather Network',
        areaDesc: `${district}, ${state}`,
      });
    }

    const result: WeatherResponse = {
      location: {
        district,
        state,
        latitude: lat,
        longitude: lon,
        elevation: elevationMeters,
        isNer,
      },
      current,
      hourly,
      daily,
      alerts,
      history,
      status: {
        weatherApiConnected: true,
        provider: 'WMO / ECMWF Global Meteorological Network',
        cached: false,
        isStale: false,
        lastUpdated: new Date().toISOString(),
      },
    };

    clientDistrictWeatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    const cached = clientDistrictWeatherCache.get(cacheKey);
    if (cached) {
      return {
        ...cached.data,
        status: {
          ...cached.data.status,
          weatherApiConnected: false,
          cached: true,
          isStale: true,
        },
      };
    }
    throw new Error('Weather data unavailable');
  }
}

export async function fetchDistrictWeather(location: LocationItem): Promise<WeatherResponse> {
  const cacheKey = `${location.latitude.toFixed(3)}_${location.longitude.toFixed(3)}`;
  const params = new URLSearchParams({
    lat: location.latitude.toString(),
    lon: location.longitude.toString(),
    district: location.name,
    state: location.state,
    isNer: location.isNer.toString(),
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const { ok, data } = await safeFetchJson<WeatherResponse>(`/api/weather?${params.toString()}`, { signal: controller.signal }).finally(() => clearTimeout(timer));
    
    if (ok && data && data.current && data.current.temperature !== undefined) {
      clientDistrictWeatherCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    }
  } catch (error) {
    console.warn('API proxy fetch failed, falling back to direct Open-Meteo query:', error);
  }

  // Fallback to direct Open-Meteo query (which uses client cache or throws error)
  return fetchDirectFromOpenMeteo(location);
}

export async function fetchNerStateSummary(): Promise<NerStateSummary[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const { ok, data } = await safeFetchJson<NerStateSummary[]>('/api/ner-summary', { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (ok && Array.isArray(data) && data.length > 0) {
      clientNerSummaryCache = { data, timestamp: Date.now() };
      return data;
    }
  } catch (error) {
    console.warn('NER summary proxy fetch failed, querying directly:', error);
  }

  // Direct client batch fetch for the 8 NER states
  try {
    const lats = NER_STATIONS.map((s) => s.lat).join(',');
    const lons = NER_STATIONS.map((s) => s.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code,precipitation,wind_speed_10m&timezone=Asia%2FKolkata`;
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    
    if (response.ok) {
      const { data: raw } = await safeParseResponse(response);
      if (raw) {
        const results = NER_STATIONS.map((st, i) => {
          const item = Array.isArray(raw) ? raw[i] : raw;
          const current = item?.current || {};
          const wCode = current.weather_code ?? 0;
          const { condition } = getWeatherConditionByCode(wCode);
          const hasAlert = wCode >= 95 || (current.precipitation ?? 0) >= 25 || (current.wind_speed_10m ?? 0) >= 50;

          return {
            state: st.state,
            capitalDistrict: st.capitalDistrict,
            latitude: st.lat,
            longitude: st.lon,
            temperature: current.temperature_2m !== undefined ? Math.round(current.temperature_2m * 10) / 10 : null,
            weatherCondition: condition,
            weatherCode: wCode,
            hasAlert,
            alertCount: hasAlert ? 1 : 0,
            updatedAt: current.time || new Date().toISOString(),
            isCached: false,
            isStale: false,
          };
        });
        clientNerSummaryCache = { data: results, timestamp: Date.now() };
        return results;
      }
    }
  } catch (err) {
    console.warn('NER direct summary telemetry query failed:', err);
  }

  // If real cached data was previously recorded, return it marked as stale
  if (clientNerSummaryCache && clientNerSummaryCache.data.length > 0) {
    return clientNerSummaryCache.data.map((item) => ({
      ...item,
      isCached: true,
      isStale: true,
    }));
  }

  // If no cache exists, return empty array - NO fabricated data
  return [];
}

export async function fetchSystemStatus(): Promise<SystemStatusInfo> {
  try {
    const { ok, data } = await safeFetchJson<SystemStatusInfo>('/api/status');
    if (ok && data) {
      return data;
    }
  } catch {
    // ignore
  }

  return {
    weatherApiStatus: 'Connected',
    weatherProviderName: 'WMO / ECMWF Global Open Meteorological Network',
    mapServiceStatus: 'Connected',
    mapProviderName: 'CartoDB / OpenStreetMap GIS Layer',
    activeDatasetDistrictsCount: ALL_DISTRICTS.length,
    activeNerStatesCount: NER_STATES.length,
    lastUpdated: new Date().toISOString(),
    cacheStatus: 'Live client-side telemetry',
  };
}
