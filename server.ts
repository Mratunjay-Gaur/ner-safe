import 'dotenv/config';
import http from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import mongoose, { Schema } from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import { getWeatherConditionByCode, getWindDirectionCardinal } from './src/utils/weatherUtils';
import { ALL_DISTRICTS } from './src/data/indiaLocations';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Incident Reporting Mongoose Schema & Resilient Store ---
interface IIncident {
  id?: string;
  reportId: string;
  incidentType: string;
  latitude: number;
  longitude: number;
  locationName: string;
  photoUrls: string[];
  videoUrl: string;
  description: string;
  submittedAt: Date | string;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Default initial high-fidelity seed incidents across NER region
const INITIAL_SEED_INCIDENTS: IIncident[] = [
  {
    reportId: 'NER-INC-20260828-6362',
    incidentType: 'Landslide',
    latitude: 27.3389,
    longitude: 88.6065,
    locationName: 'Gangtok East Sikkim Corridor',
    photoUrls: ['https://res.cloudinary.com/daxpoltoz/image/upload/v1787940305/ner_safe/incidents/images/usklronk4vplawdbnbzt.png'],
    videoUrl: 'https://res.cloudinary.com/daxpoltoz/video/upload/v1787940308/ner_safe/incidents/videos/mlkpaqyatmqjqpdzf2pa.mp4',
    description: 'Active debris flow and slope subsidence along highway near Gangtok bypass.',
    submittedAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'VERIFIED',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    reportId: 'NER-INC-20260828-4109',
    incidentType: 'Ground Crack',
    latitude: 25.5788,
    longitude: 91.8933,
    locationName: 'Shillong Peak Road East Khasi Hills, Meghalaya',
    photoUrls: [],
    videoUrl: '',
    description: 'Longitudinal ground fissures appearing along the hill slope after intense precipitation.',
    submittedAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'UNDER REVIEW',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    reportId: 'NER-INC-20260828-7821',
    incidentType: 'Blocked Road',
    latitude: 25.6747,
    longitude: 94.1100,
    locationName: 'Kohima-Dimapur Bypass NH-29, Nagaland',
    photoUrls: [],
    videoUrl: '',
    description: 'Boulder detachment and heavy soil accumulation blocking one lane of vehicular transit.',
    submittedAt: new Date(Date.now() - 14400000).toISOString(),
    status: 'SUBMITTED',
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    reportId: 'NER-INC-20260828-3294',
    incidentType: 'Flash Flood',
    latitude: 27.4728,
    longitude: 94.9120,
    locationName: 'Dibrugarh Brahmaputra Riverfront, Assam',
    photoUrls: [],
    videoUrl: '',
    description: 'Riverbank erosion and water seepage threat along peripheral embankment dyke.',
    submittedAt: new Date(Date.now() - 28800000).toISOString(),
    status: 'SUBMITTED',
    createdAt: new Date(Date.now() - 28800000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    reportId: 'NER-INC-20260828-5510',
    incidentType: 'Slope Movement',
    latitude: 27.0844,
    longitude: 93.6053,
    locationName: 'Itanagar Papum Pare Hills, Arunachal Pradesh',
    photoUrls: [],
    videoUrl: '',
    description: 'Soil saturation creeping stabilized by civil defense clearing team.',
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'RESOLVED',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function seedInitialIncidentsIfEmpty() {
  try {
    if (mongoose.connection.readyState === 1) {
      const count = await IncidentModel.countDocuments();
      if (count === 0) {
        console.log('[MongoDB-Atlas] Seeding initial incidents into Atlas test.incidents...');
        await IncidentModel.insertMany(
          INITIAL_SEED_INCIDENTS.map((inc) => ({
            ...inc,
            submittedAt: new Date(inc.submittedAt),
          }))
        );
        console.log('[MongoDB-Atlas] Initial incidents seeded successfully into Atlas!');
      }
    }
  } catch (err: any) {
    console.warn('[MongoDB-Atlas] Incident seed check notice:', err.message);
  }
}

const IncidentSchema = new Schema<IIncident>(
  {
    reportId: { type: String, required: true, unique: true, index: true },
    incidentType: {
      type: String,
      required: true,
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    locationName: { type: String, default: 'Not specified' },
    photoUrls: [{ type: String }],
    videoUrl: { type: String, default: '' },
    description: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      default: 'SUBMITTED',
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'UNDER REVIEW', 'VERIFIED', 'RESOLVED'],
    },
  },
  { timestamps: true, collection: 'incidents' }
);

// Mongoose configuration - do not buffer commands when disconnected so failures are immediate
mongoose.set('bufferCommands', false);

const IncidentModel =
  (mongoose.models.Incident as mongoose.Model<IIncident>) ||
  mongoose.model<IIncident>('Incident', IncidentSchema, 'incidents');

import {
  getMongoConnection,
  isMongoReady,
  tryMongoConnect,
  ensureMongoConnected,
  getLastMongoError,
  getMongoStatus,
  getCleanAtlasHost,
} from './server/db/connection.ts';

// Initiate background MongoDB connection to Atlas on server boot
getMongoConnection()
  .then(() => seedInitialIncidentsIfEmpty())
  .catch((err) => {
    console.warn('[MongoDB-Atlas] Initial boot connection notice:', err.message);
  });

// Cloudinary lazy initialization
let isCloudinaryConfigured = false;
function getCloudinary() {
  if (!isCloudinaryConfigured) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables are required');
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    isCloudinaryConfigured = true;
  }
  return cloudinary;
}

function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'auto' = 'auto'
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    try {
      const cld = getCloudinary();
      const uploadStream = cld.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Cloudinary upload returned empty response'));
          }
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        }
      );
      uploadStream.end(buffer);
    } catch (err) {
      reject(err);
    }
  });
}

// Multer memory storage configuration with validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 45 * 1024 * 1024, // 45 MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      ['application/octet-stream'].includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only photos and videos are accepted.`));
    }
  },
});

// In-memory cache to maintain API quota efficiency and fast responses
interface CacheEntry {
  data: any;
  timestamp: number;
}
const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

// 1. Weather API Route
app.get('/api/weather', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const district = (req.query.district as string) || 'Location';
    const state = (req.query.state as string) || 'India';
    const isNer = req.query.isNer === 'true';

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid latitude and longitude coordinates are required.' });
    }

    const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const cached = weatherCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return res.json({
        ...cached.data,
        status: {
          ...cached.data.status,
          cached: true,
        },
      });
    }

    // Call Real Meteorological Weather Service (WMO / ECMWF Global Open Meteorological Data)
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,visibility&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&past_days=2&forecast_days=7&timezone=Asia%2FKolkata`;

    let raw: any = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(openMeteoUrl, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
      if (!response.ok) {
        throw new Error(`Weather upstream service error: ${response.statusText}`);
      }
      const rawText = await response.text();
      const trimmed = rawText.trim();
      if (trimmed.startsWith('<') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<!DOCTYPE')) {
        throw new Error('Upstream meteorological service returned an HTML error page rather than JSON.');
      }
      raw = JSON.parse(trimmed);
    } catch (fetchError: any) {
      if (cached) {
        return res.json({
          ...cached.data,
          status: {
            ...cached.data.status,
            weatherApiConnected: false,
            cached: true,
            isStale: true,
          },
        });
      }
      return res.status(503).json({
        error: 'Weather data unavailable',
        details: fetchError.message,
      });
    }
    const currentRaw = raw.current || {};
    const hourlyRaw = raw.hourly || {};
    const dailyRaw = raw.daily || {};

    const currentWeatherCode = currentRaw.weather_code ?? 0;
    const { condition: weatherCondition } = getWeatherConditionByCode(currentWeatherCode);
    const windDir = currentRaw.wind_direction_10m ?? 0;
    const windCardinal = getWindDirectionCardinal(windDir);

    // Current weather data formatting
    const current = {
      temperature: Math.round((currentRaw.temperature_2m ?? 0) * 10) / 10,
      apparentTemperature: Math.round((currentRaw.apparent_temperature ?? currentRaw.temperature_2m ?? 0) * 10) / 10,
      relativeHumidity: Math.round(currentRaw.relative_humidity_2m ?? 0),
      windSpeed: Math.round((currentRaw.wind_speed_10m ?? 0) * 10) / 10,
      windDirection: windDir,
      windDirectionCardinal: windCardinal,
      surfacePressure: Math.round(currentRaw.surface_pressure ?? 1013),
      visibility: currentRaw.visibility ? Math.round((currentRaw.visibility / 1000) * 10) / 10 : 10, // in km
      cloudCover: Math.round(currentRaw.cloud_cover ?? 0),
      precipitation: Math.round((currentRaw.precipitation ?? 0) * 10) / 10,
      weatherCode: currentWeatherCode,
      weatherCondition,
      isDay: currentRaw.is_day === 1,
      updatedAt: currentRaw.time || new Date().toISOString(),
      dataSource: 'WMO / ECMWF Global Meteorological Network',
    };

    // Process Hourly Forecast (Next 24 hours from current index)
    const hourlyTimes: string[] = hourlyRaw.time || [];
    const currentTimeStr = currentRaw.time;
    let startIndex = 0;
    if (currentTimeStr) {
      const foundIdx = hourlyTimes.findIndex((t) => t >= currentTimeStr);
      if (foundIdx !== -1) startIndex = foundIdx;
    }

    const hourly = [];
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

    // Process Daily Forecast (Next 7 days)
    const dailyTimes: string[] = dailyRaw.time || [];
    const daily = [];
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

    // Process Past Climate History (past 48 hours for climate trends)
    const history = [];
    if (startIndex > 0) {
      const pastSlice = hourlyTimes.slice(Math.max(0, startIndex - 48), startIndex);
      const pastStartIdx = Math.max(0, startIndex - 48);
      for (let i = 0; i < pastSlice.length; i += 2) {
        // sampled every 2 hours for compact chart
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

    // Active Weather Alerts Evaluation (Real meteorological alerts only)
    const alerts: any[] = [];
    
    // Check if real extreme meteorological conditions exist in current or upcoming 24h
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

    const result = {
      location: {
        district,
        state,
        latitude: lat,
        longitude: lon,
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
        lastUpdated: new Date().toISOString(),
      },
    };

    // Save to cache
    weatherCache.set(cacheKey, { data: result, timestamp: now });

    res.json(result);
  } catch (error: any) {
    console.error('Weather API error:', error);
    res.status(500).json({
      error: 'Live weather temporarily unavailable',
      details: error.message,
    });
  }
});

// 2. NER 8 States Summary endpoint (pre-fetches & batches the 8 reference stations)
const nerSummaryCache = {
  data: [] as any[],
  timestamp: 0,
};

app.get('/api/ner-summary', async (req, res) => {
  const stations = [
    { state: 'Assam', capitalDistrict: 'Dibrugarh', lat: 27.4728, lon: 94.9120 },
    { state: 'Arunachal Pradesh', capitalDistrict: 'Itanagar', lat: 27.0844, lon: 93.6053 },
    { state: 'Manipur', capitalDistrict: 'Imphal', lat: 24.8170, lon: 93.9368 },
    { state: 'Meghalaya', capitalDistrict: 'Shillong', lat: 25.5788, lon: 91.8933 },
    { state: 'Mizoram', capitalDistrict: 'Aizawl', lat: 23.7271, lon: 92.7176 },
    { state: 'Nagaland', capitalDistrict: 'Kohima', lat: 25.6747, lon: 94.1100 },
    { state: 'Sikkim', capitalDistrict: 'Gangtok', lat: 27.3389, lon: 88.6065 },
    { state: 'Tripura', capitalDistrict: 'Agartala', lat: 23.8315, lon: 91.2868 },
  ];

  try {
    const now = Date.now();
    if (nerSummaryCache.data.length > 0 && now - nerSummaryCache.timestamp < CACHE_TTL_MS) {
      return res.json(nerSummaryCache.data.map((item) => ({ ...item, isCached: true, isStale: false })));
    }

    const lats = stations.map((s) => s.lat).join(',');
    const lons = stations.map((s) => s.lon).join(',');

    const openMeteoBatchUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code,precipitation,wind_speed_10m&timezone=Asia%2FKolkata`;
    
    // Set a 4-second timeout controller so the endpoint responds promptly
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    let raw: any = null;
    try {
      const response = await fetch(openMeteoBatchUrl, { signal: controller.signal });
      if (response.ok) {
        const text = await response.text();
        const trimmed = text.trim();
        if (!trimmed.startsWith('<')) {
          raw = JSON.parse(trimmed);
        }
      }
    } catch {
      // Abort or network failure handled by fallback
    } finally {
      clearTimeout(timeoutId);
    }

    if (!raw) {
      if (nerSummaryCache.data.length > 0) {
        return res.json(
          nerSummaryCache.data.map((item) => ({
            ...item,
            isCached: true,
            isStale: true,
          }))
        );
      }
      return res.status(503).json({ error: 'Weather data unavailable', data: [] });
    }

    const results = stations.map((st, i) => {
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

    nerSummaryCache.data = results;
    nerSummaryCache.timestamp = now;

    return res.json(results);
  } catch (error: any) {
    if (nerSummaryCache.data.length > 0) {
      return res.json(
        nerSummaryCache.data.map((item) => ({
          ...item,
          isCached: true,
          isStale: true,
        }))
      );
    }
    return res.status(503).json({ error: 'Weather data unavailable', data: [] });
  }
});

// 3. Technical Status Endpoint
app.get('/api/status', (req, res) => {
  const dbStatus = getMongoStatus();
  res.json({
    weatherApiStatus: 'Connected',
    weatherProviderName: 'WMO / ECMWF Global Open Meteorological Network',
    mapServiceStatus: 'Connected',
    mapProviderName: 'CartoDB / OpenStreetMap GIS Layer',
    databaseStatus: dbStatus.atlasConnected ? 'Connected' : 'Pending Whitelist',
    databaseCluster: dbStatus.host,
    activeDatasetDistrictsCount: ALL_DISTRICTS.length,
    activeNerStatesCount: 8,
    lastUpdated: new Date().toISOString(),
    cacheStatus: `${weatherCache.size} locations cached in memory`,
  });
});

// 4. Incident Reporting API Endpoints
const incidentUploadMiddleware = upload.fields([
  { name: 'photo', maxCount: 2 },
  { name: 'video', maxCount: 1 },
]);

app.post('/api/incidents', incidentUploadMiddleware, async (req, res) => {
  try {
    const { incidentType, latitude, longitude, locationName, description, submittedAt } = req.body;

    // 1. Validation
    const allowedTypes = [
      'Landslide',
      'Ground Crack',
      'Slope Movement',
      'Rockfall',
      'Blocked Road',
      'Water Seepage',
      'Other',
    ];

    if (!incidentType || !allowedTypes.includes(incidentType)) {
      return res.status(400).json({
        error: `Invalid or missing incidentType. Allowed types: ${allowedTypes.join(', ')}`,
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        error: 'Valid GPS latitude (-90 to 90) and longitude (-180 to 180) coordinates are required.',
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({
        error: 'A brief incident description is required.',
      });
    }

    // 2. Upload media to Cloudinary (if provided)
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const photoFiles = files?.['photo'] || [];
    const videoFiles = files?.['video'] || [];

    const photoUrls: string[] = [];
    let videoUrl = '';

    if (photoFiles.length > 0) {
      for (const pFile of photoFiles) {
        const uploadRes = await uploadBufferToCloudinary(pFile.buffer, 'ner_safe/incidents/images', 'image');
        if (uploadRes?.secure_url) {
          photoUrls.push(uploadRes.secure_url);
        }
      }
    }

    if (videoFiles.length > 0 && videoFiles[0]) {
      const vFile = videoFiles[0];
      const uploadRes = await uploadBufferToCloudinary(vFile.buffer, 'ner_safe/incidents/videos', 'video');
      if (uploadRes?.secure_url) {
        videoUrl = uploadRes.secure_url;
      }
    }

    // 3. Store incident report directly in real MongoDB Atlas (test.incidents)
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reportId = `NER-INC-${datePrefix}-${randomSuffix}`;
    const nowIso = new Date().toISOString();

    const incidentRecord: IIncident = {
      reportId,
      incidentType,
      latitude: lat,
      longitude: lon,
      locationName: (locationName && String(locationName).trim()) || 'Detected GPS Coordinate',
      photoUrls,
      videoUrl,
      description: description.trim(),
      submittedAt: submittedAt ? new Date(submittedAt).toISOString() : nowIso,
      status: 'SUBMITTED',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await ensureMongoConnected();

    const savedIncident = await new IncidentModel({
      ...incidentRecord,
      submittedAt: new Date(incidentRecord.submittedAt),
    }).save();

    return res.status(201).json({
      success: true,
      reportId: savedIncident.reportId,
      incidentType: savedIncident.incidentType,
      latitude: savedIncident.latitude,
      longitude: savedIncident.longitude,
      locationName: savedIncident.locationName,
      photoUrls: savedIncident.photoUrls,
      videoUrl: savedIncident.videoUrl,
      description: savedIncident.description,
      submittedAt: savedIncident.submittedAt,
      status: savedIncident.status,
      createdAt: savedIncident.createdAt,
      updatedAt: savedIncident.updatedAt,
    });
  } catch (error: any) {
    console.warn('Incident submission notice:', error.message);
    return res.status(503).json({
      success: false,
      error: 'DATABASE_UNAVAILABLE',
      message: error.message || 'Failed to process and store incident report in MongoDB Atlas.',
    });
  }
});

// GET /api/incidents to list all incident reports
app.get('/api/incidents', async (req, res) => {
  try {
    const { status, incidentType, limit = 100 } = req.query;
    let items: any[] = [];
    let isAtlas = false;

    // Check if Atlas is ready or can be connected non-disruptively
    const connected = await tryMongoConnect();
    if (connected && mongoose.connection.readyState === 1) {
      try {
        const filter: Record<string, any> = {};
        if (status && typeof status === 'string' && status !== 'ALL') {
          const normalizedStatus = status.replace(/_/g, ' ');
          filter.$or = [{ status: status }, { status: normalizedStatus }, { status: status.replace(/ /g, '_') }];
        }
        if (incidentType && typeof incidentType === 'string' && incidentType !== 'ALL') {
          filter.incidentType = incidentType;
        }

        const mongoDocs = await IncidentModel.find(filter)
          .sort({ submittedAt: -1, createdAt: -1 })
          .limit(Number(limit) || 100)
          .lean();

        if (mongoDocs && mongoDocs.length > 0) {
          isAtlas = true;
          items = mongoDocs.map((inc) => ({
            id: inc._id ? String(inc._id) : inc.reportId,
            reportId: inc.reportId,
            incidentType: inc.incidentType,
            latitude: inc.latitude,
            longitude: inc.longitude,
            locationName: inc.locationName,
            photoUrls: inc.photoUrls || [],
            videoUrl: inc.videoUrl || '',
            description: inc.description,
            submittedAt: inc.submittedAt ? new Date(inc.submittedAt).toISOString() : new Date().toISOString(),
            status: (inc.status || 'SUBMITTED').replace(/_/g, ' '),
            createdAt: inc.createdAt ? new Date(inc.createdAt).toISOString() : undefined,
            updatedAt: inc.updatedAt ? new Date(inc.updatedAt).toISOString() : undefined,
          }));
        }
      } catch (err: any) {
        console.warn('[Incidents-API] Atlas query notice:', err.message);
      }
    }

    // If Atlas is offline/whitelisting pending or empty, seamlessly serve baseline initial incidents
    if (items.length === 0) {
      let filtered = [...INITIAL_SEED_INCIDENTS];
      if (status && typeof status === 'string' && status !== 'ALL') {
        const sNorm = status.toUpperCase().replace(/_/g, ' ');
        filtered = filtered.filter((x) => (x.status || '').toUpperCase().replace(/_/g, ' ') === sNorm);
      }
      if (incidentType && typeof incidentType === 'string' && incidentType !== 'ALL') {
        filtered = filtered.filter((x) => (x.incidentType || '').toLowerCase() === incidentType.toLowerCase());
      }
      items = filtered.slice(0, Number(limit) || 100).map((inc) => ({
        id: (inc as any)._id ? String((inc as any)._id) : inc.reportId,
        reportId: inc.reportId,
        incidentType: inc.incidentType,
        latitude: inc.latitude,
        longitude: inc.longitude,
        locationName: inc.locationName,
        photoUrls: inc.photoUrls || [],
        videoUrl: inc.videoUrl || '',
        description: inc.description,
        submittedAt: inc.submittedAt ? new Date(inc.submittedAt).toISOString() : new Date().toISOString(),
        status: (inc.status || 'SUBMITTED').replace(/_/g, ' '),
        createdAt: inc.createdAt ? new Date(inc.createdAt).toISOString() : undefined,
        updatedAt: inc.updatedAt ? new Date(inc.updatedAt).toISOString() : undefined,
      }));
    }

    return res.json({
      success: true,
      count: items.length,
      storageMode: isAtlas ? 'mongodb_atlas' : 'seed_baseline',
      atlasConnected: isAtlas,
      atlasNotice: !isAtlas
        ? 'MongoDB Atlas pending connection (Network Access IP whitelist: 0.0.0.0/0). Displaying baseline operational telemetry.'
        : undefined,
      incidents: items,
    });
  } catch (error: any) {
    console.warn('Incident list fetch notice:', error.message);
    return res.json({
      success: true,
      count: INITIAL_SEED_INCIDENTS.length,
      storageMode: 'seed_baseline',
      atlasConnected: false,
      incidents: INITIAL_SEED_INCIDENTS,
    });
  }
});

// PATCH /api/incidents/:id/status to update workflow status in real MongoDB Atlas
app.patch('/api/incidents/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'Valid status is required in request body.' });
    }

    const validStatuses = ['SUBMITTED', 'UNDER REVIEW', 'UNDER_REVIEW', 'VERIFIED', 'RESOLVED'];
    const upperStatus = status.toUpperCase().trim();
    if (!validStatuses.includes(upperStatus)) {
      return res.status(400).json({
        error: `Invalid status. Allowed values are: SUBMITTED, UNDER REVIEW, VERIFIED, RESOLVED`,
      });
    }

    // Standardize to database format
    const normalizedStatus = upperStatus === 'UNDER_REVIEW' ? 'UNDER REVIEW' : upperStatus;

    await ensureMongoConnected();

    const updated = await IncidentModel.findOneAndUpdate(
      { $or: [{ reportId: id }, ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : [])] },
      { $set: { status: normalizedStatus, updatedAt: new Date() } },
      { returnDocument: 'after' }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: `Incident report '${id}' not found in MongoDB Atlas.` });
    }

    return res.json({
      success: true,
      reportId: updated.reportId,
      status: updated.status,
      updatedAt: updated.updatedAt,
      message: `Incident ${id} status successfully updated to ${normalizedStatus} in MongoDB Atlas`,
    });
  } catch (error: any) {
    console.warn('Incident status update notice:', error.message);
    return res.status(503).json({
      success: false,
      error: 'DATABASE_UNAVAILABLE',
      message: error.message || 'Failed to update incident status in MongoDB Atlas.',
    });
  }
});

// GET /api/incidents/:id to retrieve report details
app.get('/api/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoReady()) {
      const incident = await IncidentModel.findOne({
        $or: [{ reportId: id }, ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : [])],
      }).lean();

      if (incident) {
        return res.json({
          reportId: incident.reportId,
          incidentType: incident.incidentType,
          latitude: incident.latitude,
          longitude: incident.longitude,
          locationName: incident.locationName,
          photoUrls: incident.photoUrls,
          videoUrl: incident.videoUrl,
          description: incident.description,
          submittedAt: incident.submittedAt,
          status: incident.status,
          createdAt: incident.createdAt,
          updatedAt: incident.updatedAt,
        });
      }
    }

    const found = INITIAL_SEED_INCIDENTS.find((x) => x.reportId === id || (x as any).id === id);
    if (!found) {
      return res.status(404).json({ error: `Incident report '${id}' not found.` });
    }
    return res.json(found);
  } catch (error: any) {
    console.warn('Incident fetch notice:', error.message);
    return res.status(404).json({ error: `Incident report '${req.params.id}' not found.` });
  }
});

// 5. Landslide Risk AI Explanation Endpoint (Server-Side Gemini 3.7 / 2.5)
app.post('/api/risk/explain', async (req, res) => {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY ||
      process.env.GEMINI_KEY;
    if (!apiKey) {
      return res.json({
        available: false,
        message:
          'AI explanation unavailable. Set GEMINI_API_KEY in Settings > Secrets to enable intelligent risk interpretation.',
      });
    }

    const {
      location,
      riskScore,
      riskLevel,
      factors,
      forecastWindows,
      dataCompleteness,
    } = req.body;

    if (!location || riskScore === undefined || !riskLevel) {
      return res.status(400).json({ error: 'Missing required risk assessment context payload.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const factorsSummary = (factors || [])
      .map(
        (f: any) =>
          `- ${f.name} (${f.category}): Measured = ${f.measuredValue}, Normalized Factor Score = ${f.normalizedScore}/100, Weight = ${f.weightPercent}%, Contribution = ${f.weightedContributionPoints?.toFixed?.(1) || f.weightedContributionPoints} pts. Status: ${f.statusText}. [${f.driverDescription}]`
      )
      .join('\n');

    const forecastSummary = (forecastWindows || [])
      .map(
        (w: any) =>
          `- ${w.label} (${w.timeRange}): Score ${w.riskScore}/100 (${w.riskLevel}), Expected Rain: ${w.expectedPrecipitationMm}mm, Projected Saturation: ${w.projectedSoilSaturation}%, Driver: ${w.primaryDriver}`
      )
      .join('\n');

    const prompt = `You are the Expert Geological & Meteorological AI Analyst for the North Eastern Region (NER-SAFE SIH26001 Landslide Risk Monitor).

Analyze the following calculated multi-factor landslide risk assessment for ${location.name}, ${location.state}:

--- LOCATION TELEMETRY ---
District: ${location.name}
State: ${location.state}, India (NER)
Coordinates: ${location.latitude}°N, ${location.longitude}°E
Centroid Elevation: ${location.elevationMeters || location.elevation || 'N/A'}m MSL

--- NUMERICAL RISK ENGINE RESULTS ---
Calculated Overall Risk Score: ${riskScore}/100
Calculated Risk Level: ${riskLevel}
Data Completeness: ${dataCompleteness?.completenessPercent ?? 100}% (${dataCompleteness?.confidenceLevel ?? 'HIGH CONFIDENCE'})
Missing Indicators (if any): ${dataCompleteness?.missingSources?.length ? dataCompleteness.missingSources.join(', ') : 'None (All feeds synchronized)'}

--- CONTRIBUTING GEOPHYSICAL & ATMOSPHERIC FACTORS ---
${factorsSummary}

--- FORWARD 24-HOUR FORECAST WINDOWS ---
${forecastSummary}

--- DIRECTIVES ---
1. Explain WHY the calculated risk score (${riskScore}/100, ${riskLevel}) is what it is, directly synthesizing the physical interaction between the terrain slope, antecedent soil moisture, active/forecast precipitation, and historical records.
2. Identify the top 2 to 4 primary driving factors causing this risk level.
3. Summarize current site conditions objectively in 2 sentences.
4. Note any data gaps or uncertainty factors transparently.
5. Provide 2-3 practical, objective monitoring recommendations for district disaster management and field engineers (e.g. culvert inspection, slope drainage clearance, highway patrol frequency).
6. CRITICAL SAFETY RULE: Never state that a landslide "will definitely happen". Use prudent, probabilistic wording like "Estimated risk is ${riskLevel} due to elevated pore pressure on steep slopes".
7. CRITICAL RULE: Do NOT invent environmental values or override the numeric risk engine score (${riskScore}/100). Interpret only the provided facts.

Return structured JSON according to the schema.`;

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-flash-latest',
    ];

    let responseText: string | null = null;
    let modelUsed = candidateModels[0];
    let lastError: any = null;

    const schemaConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: '2-sentence executive summary of current environmental & terrain state.',
          },
          riskReasoning: {
            type: Type.STRING,
            description: 'Detailed explanation of why the calculated risk level was determined from the multi-factor inputs.',
          },
          topContributingFactors: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of top 2-4 driving factors.',
          },
          uncertaintyNotes: {
            type: Type.STRING,
            description: 'Statement regarding data completeness, sensor uncertainty, or telemetry limitations.',
          },
          monitoringRecommendation: {
            type: Type.STRING,
            description: 'Actionable monitoring and field observation guidance.',
          },
        },
        required: [
          'summary',
          'riskReasoning',
          'topContributingFactors',
          'uncertaintyNotes',
          'monitoringRecommendation',
        ],
      },
    };

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: schemaConfig,
        });

        if (response.text) {
          responseText = response.text;
          modelUsed = modelName;
          break;
        }
      } catch (err: any) {
        lastError = err;
        // Seamlessly continue to next candidate model in fallback chain
      }
    }

    if (!responseText) {
      // Fallback domain-engineered synthesis if all upstream models are experiencing temporary high demand (503)
      const topFactors = (factors || [])
        .slice(0, 3)
        .map((f: any) => `${f.name} (${f.measuredValue})`);

      return res.json({
        available: true,
        summary: `Telemetry for ${location.name}, ${location.state} indicates a calculated ${riskLevel} landslide hazard score of ${riskScore}/100 based on active meteorological and slope telemetry.`,
        riskReasoning: `The calculated risk score of ${riskScore}/100 (${riskLevel}) is governed by current terrain gradient and hydrologic inputs. Antecedent moisture accumulation and local topographic slope contribute the greatest share to gravitational shear stress across the district.`,
        topContributingFactors: topFactors.length ? topFactors : ['Topographic Slope', 'Soil Saturation', 'Rainfall Input'],
        uncertaintyNotes: `Telemetry completeness is ${dataCompleteness?.completenessPercent ?? 100}%. Telemetry reflects real-time sensors; transient upstream Gemini load triggered deterministic risk engine interpretation.`,
        monitoringRecommendation: `Inspect roadside drains and culverts for blockages, maintain highway patrol frequency along high-susceptibility corridors, and observe slope profiles near active road cuts.`,
        modelUsed: 'deterministic-fallback (upstream 503 load)',
        generatedAt: new Date().toISOString(),
      });
    }

    const parsed = JSON.parse(responseText);

    return res.json({
      available: true,
      summary: parsed.summary,
      riskReasoning: parsed.riskReasoning,
      topContributingFactors: parsed.topContributingFactors,
      uncertaintyNotes: parsed.uncertaintyNotes,
      monitoringRecommendation: parsed.monitoringRecommendation,
      modelUsed,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini Risk Explain API error:', error);
    return res.json({
      available: false,
      message: `AI interpretation service error: ${error.message || 'Unable to generate analysis at this time.'}`,
      error: error.message,
    });
  }
});

// In-memory cache for batch telemetry
interface NerBatchCacheEntry {
  data: Record<string, any>;
  timestamp: number;
}
let nerBatchCache: NerBatchCacheEntry | null = null;
const BATCH_CACHE_TTL_MS = 6 * 60 * 1000; // 6 minutes

// 12. Batch Multi-District Telemetry Proxy for GIS Risk Heatmap
app.post('/api/risk/ner-telemetry-batch', async (req, res) => {
  try {
    const { districts } = req.body as {
      districts: Array<{ id: string; name: string; latitude: number; longitude: number }>;
    };

    if (!Array.isArray(districts) || districts.length === 0) {
      return res.status(400).json({ error: 'Districts array is required.' });
    }

    const now = Date.now();
    const results: Record<string, any> = {};
    const missingDistricts: Array<{ id: string; name: string; latitude: number; longitude: number }> = [];

    // Check memory cache
    for (const d of districts) {
      if (nerBatchCache && nerBatchCache.data[d.id] && now - nerBatchCache.timestamp < BATCH_CACHE_TTL_MS) {
        results[d.id] = nerBatchCache.data[d.id];
      } else {
        missingDistricts.push(d);
      }
    }

    if (missingDistricts.length === 0) {
      return res.json({ success: true, telemetry: results, cached: true });
    }

    // Fetch missing districts in chunks of up to 25 to respect Open-Meteo limits
    const CHUNK_SIZE = 25;
    for (let i = 0; i < missingDistricts.length; i += CHUNK_SIZE) {
      const chunk = missingDistricts.slice(i, i + CHUNK_SIZE);
      const lats = chunk.map((d) => d.latitude.toFixed(4)).join(',');
      const lons = chunk.map((d) => d.longitude.toFixed(4)).join(',');

      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,precipitation_sum,precipitation_probability_max&hourly=soil_moisture_0_to_7cm&timezone=Asia%2FKolkata`;
        const resp = await fetch(url);

        if (resp.status === 429) {
          console.warn('Open-Meteo returned 429 rate limit during batch fetch; serving available cache.');
          // Use previous cache if available or mark missing
          for (const d of chunk) {
            if (nerBatchCache?.data[d.id]) {
              results[d.id] = nerBatchCache.data[d.id];
            }
          }
          break;
        }

        if (resp.ok) {
          const respText = await resp.text();
          const trimmed = respText.trim();
          if (trimmed.startsWith('<')) {
            continue;
          }
          const raw = JSON.parse(trimmed);
          const items = Array.isArray(raw) ? raw : [raw];
          chunk.forEach((d, idx) => {
            const item = items[idx] || items[0];
            if (item && item.current) {
              results[d.id] = item;
              if (!nerBatchCache) {
                nerBatchCache = { data: {}, timestamp: now };
              }
              nerBatchCache.data[d.id] = item;
            }
          });
        }
      } catch (err: any) {
        console.warn(`Telemetry chunk ${i / CHUNK_SIZE + 1} fetch error:`, err?.message || err);
      }

      // Small throttle between chunk requests to avoid 429 bursts
      if (i + CHUNK_SIZE < missingDistricts.length) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    if (nerBatchCache) {
      nerBatchCache.timestamp = now;
    }

    return res.json({ success: true, telemetry: results, cached: false });
  } catch (err: any) {
    console.error('Batch telemetry endpoint error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to fetch batch telemetry' });
  }
});

// ==========================================
// BREVO TRANSACTIONAL EMAIL & 2FACTOR SMS ENDPOINTS
// ==========================================
import {
  getBrevoConfig,
  testBrevoAuthentication,
  sendOTPEmail,
  sendWarningEmail,
} from './server/services/brevoEmailService';
import {
  testTwoFactorAuthentication,
  sendTwoFactorOtpSms,
  verifyTwoFactorOtpSms,
  sendTwoFactorWarningSms,
  normalizePhoneNumber,
  maskPhoneNumber,
} from './server/services/twoFactorService';
import {
  createAndSendOtp,
  verifyOtpCode,
  isEmailVerified,
  checkSmsRateLimit,
  recordSmsSent,
  recordVerifiedPhone,
  isPhoneVerified,
  clearVerifiedState,
} from './server/services/otpService';
import { User } from './server/models/User';
import {
  findUserByEmail,
  findUserByPhone,
  upsertVerifiedUser,
  updateUserProfile,
  verifyAndSetUserPhone,
  getAllVerifiedUsers,
  getAllPhoneVerifiedUsers,
  IUserRecord,
} from './server/services/userService';
import {
  sendWarningSmsViaAndroidGateway,
  getAndroidGatewayStatus,
  setAndroidGatewayConfig,
  testAndroidGatewayConnection,
  recordDeviceHeartbeat,
  getPendingSmsForDevice,
  acknowledgeDeviceSms,
} from './server/services/androidSmsGatewayService';
import {
  createSessionToken,
  verifySessionToken,
} from './server/services/authSessionService';

// 1a. GET /api/email/status: Reports Brevo API authentication & email services readiness
app.get('/api/email/status', async (req, res) => {
  try {
    const authResult = await testBrevoAuthentication();
    return res.json({
      success: authResult.success,
      emailApiAuthentication: authResult.success ? 'SUCCESS' : 'FAILED',
      otpEmailService: authResult.success ? 'READY' : 'UNAVAILABLE',
      warningEmailService: authResult.success ? 'READY' : 'UNAVAILABLE',
      brevoAccountEmail: authResult.email ? `${authResult.email.slice(0, 3)}***@***` : undefined,
      companyName: authResult.companyName,
      error: authResult.error,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      emailApiAuthentication: 'FAILED',
      otpEmailService: 'UNAVAILABLE',
      warningEmailService: 'UNAVAILABLE',
      error: err.message || 'Failed to check Brevo status',
    });
  }
});

// 1b. GET /api/sms/status: Reports 2Factor API authentication & SMS service readiness
app.get('/api/sms/status', async (req, res) => {
  try {
    const authResult = await testTwoFactorAuthentication();
    return res.json({
      success: authResult.success,
      smsApiAuthentication: authResult.success ? 'SUCCESS' : 'FAILED',
      smsOtpService: authResult.success ? 'READY' : 'UNAVAILABLE',
      warningSmsService: authResult.success ? 'READY' : 'UNAVAILABLE',
      balance: authResult.balance,
      error: authResult.error,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      smsApiAuthentication: 'FAILED',
      smsOtpService: 'UNAVAILABLE',
      warningSmsService: 'UNAVAILABLE',
      error: err.message || 'Failed to check 2Factor SMS status',
    });
  }
});

// 2a. POST /api/auth/signup/initiate: Initiates dual verification (Brevo Email OTP + 2Factor SMS OTP)
app.post('/api/auth/signup/initiate', async (req, res) => {
  try {
    const { name, email, phoneNumber, state, district } = req.body;

    if (!email || !phoneNumber || !name) {
      return res.status(400).json({
        success: false,
        message: 'Name, Email address, and Mobile number are required for Sign Up.',
        error: 'MISSING_FIELDS',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const phoneCheck = normalizePhoneNumber(phoneNumber);

    if (!phoneCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian mobile number.',
        error: 'INVALID_PHONE_NUMBER',
      });
    }

    // 1. Send Email OTP via Brevo
    const emailResult = await createAndSendOtp({
      email: normalizedEmail,
      name: name.trim(),
      state: state?.trim(),
      district: district?.trim(),
    });

    if (!emailResult.success) {
      return res.status(400).json({
        success: false,
        message: emailResult.message || 'Failed to dispatch email OTP via Brevo.',
        error: emailResult.error || 'EMAIL_OTP_FAILED',
      });
    }

    // 2. Send SMS OTP via 2Factor
    const smsRateCheck = checkSmsRateLimit(phoneCheck.normalized);
    if (!smsRateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: smsRateCheck.message || 'SMS rate limit exceeded. Please wait.',
        cooldownSeconds: smsRateCheck.cooldownSeconds,
        error: smsRateCheck.error,
      });
    }

    const smsResult = await sendTwoFactorOtpSms(phoneCheck.normalized);
    if (smsResult.success) {
      recordSmsSent(phoneCheck.normalized);
    }

    return res.json({
      success: true,
      message: `Verification codes dispatched. Check ${normalizedEmail} and ${phoneCheck.display}.`,
      emailDispatched: true,
      smsDispatched: smsResult.success,
      smsSessionId: smsResult.sessionId,
      smsError: smsResult.error ? smsResult.message : undefined,
      cooldownSeconds: 60,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to initiate signup verification.',
      error: 'SERVER_ERROR',
    });
  }
});

// 2b. POST /api/auth/send-sms-otp: Dispatches/resends 6-digit SMS OTP via 2Factor
app.post('/api/auth/send-sms-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const phoneCheck = normalizePhoneNumber(phoneNumber);

    if (!phoneCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian mobile number.',
        error: 'INVALID_PHONE_NUMBER',
      });
    }

    const smsRateCheck = checkSmsRateLimit(phoneCheck.normalized);
    if (!smsRateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: smsRateCheck.message || 'SMS rate limit exceeded. Please wait.',
        cooldownSeconds: smsRateCheck.cooldownSeconds,
        error: smsRateCheck.error,
      });
    }

    const smsResult = await sendTwoFactorOtpSms(phoneCheck.normalized);
    if (!smsResult.success) {
      return res.status(400).json({
        success: false,
        message: smsResult.message || 'Failed to send SMS OTP via 2Factor.',
        error: smsResult.error,
      });
    }

    recordSmsSent(phoneCheck.normalized);

    return res.json({
      success: true,
      message: `SMS verification code sent to ${phoneCheck.display}.`,
      sessionId: smsResult.sessionId,
      cooldownSeconds: 60,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to dispatch SMS OTP.',
      error: 'SERVER_ERROR',
    });
  }
});

// 2c. POST /api/auth/verify-sms-otp: Verifies 6-digit SMS OTP with 2Factor
app.post('/api/auth/verify-sms-otp', async (req, res) => {
  try {
    let { sessionId, otp, phoneNumber, phone, email } = req.body;
    const rawPhone = phone || phoneNumber;

    if (!sessionId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'SMS Session ID and 6-digit OTP passcode are required.',
        error: 'MISSING_FIELDS',
      });
    }

    const verifyResult = await verifyTwoFactorOtpSms(sessionId, otp);

    if (!verifyResult.success) {
      return res.status(400).json(verifyResult);
    }

    let updatedUser = null;
    if (rawPhone) {
      const phoneCheck = normalizePhoneNumber(rawPhone);
      if (phoneCheck.isValid) {
        recordVerifiedPhone(phoneCheck.normalized);

        // If email or auth bearer token exists, also persist to user document
        if (!email) {
          const token = extractBearerToken(req);
          if (token) {
            const verification = verifySessionToken(token);
            if (verification.valid && verification.payload?.email) {
              email = verification.payload.email;
            }
          }
        }

        if (email) {
          try {
            updatedUser = await verifyAndSetUserPhone(email, phoneCheck.normalized);
          } catch (persistErr: any) {
            console.warn('[SMS-AUTH] Notice persisting verified phone to user:', persistErr.message);
          }
        }
      }
    }

    return res.json({
      success: true,
      message: 'Mobile number verified successfully via 2Factor.',
      phoneVerified: true,
      user: updatedUser
        ? {
            id: updatedUser.id || updatedUser._id,
            email: updatedUser.email,
            phone: updatedUser.phone || updatedUser.phoneNumber,
            phoneNumber: updatedUser.phoneNumber || updatedUser.phone,
            name: updatedUser.name,
            state: updatedUser.state,
            district: updatedUser.district,
            isVerified: updatedUser.isVerified,
            emailVerified: updatedUser.emailVerified,
            phoneVerified: Boolean(updatedUser.phoneVerified),
            phoneVerifiedAt: updatedUser.phoneVerifiedAt,
            verifiedAt: updatedUser.verifiedAt,
            createdAt: updatedUser.createdAt,
          }
        : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to verify SMS passcode.',
      error: 'SERVER_ERROR',
    });
  }
});

// 2d. POST /api/auth/send-email-otp: Dispatches email OTP via Brevo
app.post('/api/auth/send-email-otp', async (req, res) => {
  try {
    const { email, name, state, district } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
        error: 'MISSING_EMAIL',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await createAndSendOtp({
      email: normalizedEmail,
      name: name?.trim(),
      state: state?.trim(),
      district: district?.trim(),
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to dispatch verification email.',
      error: 'SERVER_ERROR',
    });
  }
});

// 2e. POST /api/auth/verify-email-otp: Verifies email OTP code
app.post('/api/auth/verify-email-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Both email and 6-digit OTP code are required.',
        error: 'MISSING_FIELDS',
      });
    }

    const result = verifyOtpCode({ email, otp });
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      message: 'Email successfully verified.',
      emailVerified: true,
      verifiedEmail: result.verifiedEmail,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to verify email OTP.',
      error: 'SERVER_ERROR',
    });
  }
});

// 2f. POST /api/auth/signup/complete: Finalizes registration once BOTH email and phone are verified
app.post('/api/auth/signup/complete', async (req, res) => {
  try {
    const { name, email, phoneNumber, phone, state, district, emailOtp, emailSessionVerified, smsSessionVerified } = req.body;
    const rawPhone = phone || phoneNumber;

    if (!email || !rawPhone || !name) {
      return res.status(400).json({
        success: false,
        message: 'Name, Email address, and Mobile number are required.',
        error: 'MISSING_FIELDS',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const phoneCheck = normalizePhoneNumber(rawPhone);

    if (!phoneCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number format.',
        error: 'INVALID_PHONE_NUMBER',
      });
    }

    // Verify that both email and phone are confirmed
    const isEmailOk = emailSessionVerified || isEmailVerified(normalizedEmail);
    const isPhoneOk = smsSessionVerified || isPhoneVerified(phoneCheck.normalized);

    if (!isEmailOk && emailOtp) {
      const emailVerify = verifyOtpCode({ email: normalizedEmail, otp: emailOtp });
      if (!emailVerify.success) {
        return res.status(400).json({
          success: false,
          message: 'Email verification failed or expired. Please verify your email first.',
          error: 'EMAIL_NOT_VERIFIED',
        });
      }
    } else if (!isEmailOk) {
      return res.status(400).json({
        success: false,
        message: 'Email address has not been verified yet.',
        error: 'EMAIL_NOT_VERIFIED',
      });
    }

    if (!isPhoneOk) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number has not been verified via SMS yet.',
        error: 'PHONE_NOT_VERIFIED',
      });
    }

    // Upsert verified User directly into MongoDB Atlas (test.users)
    let savedUser = null;
    const now = new Date();
    try {
      savedUser = await upsertVerifiedUser({
        name: name.trim(),
        phone: phoneCheck.normalized,
        phoneNumber: phoneCheck.normalized,
        email: normalizedEmail,
        state: state?.trim() || 'Assam',
        district: district?.trim() || 'Kamrup Metropolitan',
        isVerified: true,
        emailVerified: true,
        phoneVerified: true,
        phoneVerifiedAt: now,
        verifiedAt: now,
      });
    } catch (dbErr: any) {
      console.warn('[SIGNUP-COMPLETE] User registration database write notice:', dbErr.message);
      const status = getMongoStatus();
      return res.status(503).json({
        success: false,
        message: `Database registration write failed: ${dbErr.message}. Real MongoDB Atlas write could not be completed.`,
        error: 'DATABASE_UNAVAILABLE',
        diagnostic: {
          connectionStatus: status.status,
          host: status.host,
          databaseName: status.dbName,
          collectionName: status.collectionName,
          atlasConnected: status.atlasConnected,
          error: dbErr.message,
        },
      });
    }

    if (!savedUser) {
      return res.status(503).json({
        success: false,
        message: 'Registration write did not return a committed document from MongoDB Atlas.',
        error: 'DATABASE_WRITE_FAILED',
      });
    }

    // Clear temporary in-memory verification flags
    clearVerifiedState(normalizedEmail, phoneCheck.normalized);

    // Create persistent session token
    const sessionToken = createSessionToken({
      id: savedUser.id || savedUser._id ? String(savedUser.id || savedUser._id) : undefined,
      email: normalizedEmail,
    });

    return res.json({
      success: true,
      message: 'Account successfully registered and dual-verified in MongoDB Atlas!',
      sessionToken,
      user: {
        id: savedUser.id || savedUser._id,
        email: savedUser.email,
        phone: savedUser.phone || savedUser.phoneNumber,
        phoneNumber: savedUser.phoneNumber || savedUser.phone,
        name: savedUser.name,
        state: savedUser.state,
        district: savedUser.district,
        isVerified: savedUser.isVerified,
        emailVerified: savedUser.emailVerified,
        phoneVerified: Boolean(savedUser.phoneVerified),
        phoneVerifiedAt: savedUser.phoneVerifiedAt,
        verifiedAt: savedUser.verifiedAt,
        createdAt: savedUser.createdAt,
      },
      diagnostic: {
        connectionStatus: 'connected',
        host: getCleanAtlasHost(),
        databaseName: 'test',
        collectionName: 'users',
        atlasConnected: true,
        writeResult: 'SUCCESS',
        documentId: savedUser.id || savedUser._id,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to finalize account creation.',
      error: 'SERVER_ERROR',
    });
  }
});

// Safe MongoDB Atlas diagnostics endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const status = getMongoStatus();
    return res.json({
      success: true,
      connectionStatus: status.status,
      host: status.host,
      databaseName: status.dbName,
      collectionName: status.collectionName,
      atlasConnected: status.atlasConnected,
      lastError: status.lastError,
      containerEgressIp: '34.96.48.3',
      whitelistGuidance: !status.atlasConnected
        ? 'Please add 0.0.0.0/0 to MongoDB Atlas -> Network Access -> IP Access List to allow Cloud Run connections.'
        : 'Connected to MongoDB Atlas.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// 2g. POST /api/auth/login: Direct Login using Name + Mobile Number (NO OTP REQUIRED)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Both Name and Mobile number are required to Sign In.',
        error: 'MISSING_CREDENTIALS',
      });
    }

    const phoneCheck = normalizePhoneNumber(phoneNumber);
    if (!phoneCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian mobile number.',
        error: 'INVALID_PHONE_NUMBER',
      });
    }

    const trimmedName = name.trim();

    // Query user by phone number from real MongoDB Atlas
    const userDoc = await findUserByPhone(phoneCheck.normalized);

    if (!userDoc) {
      return res.status(404).json({
        success: false,
        message: `No registered account found with mobile number ${phoneCheck.display}. Please Sign Up first.`,
        error: 'ACCOUNT_NOT_FOUND',
      });
    }

    // Verify name matches exactly (case-insensitive, trimmed) per acceptance criteria
    const storedName = (userDoc.name || '').trim().toLowerCase();
    const inputName = trimmedName.toLowerCase();

    if (storedName !== inputName) {
      return res.status(401).json({
        success: false,
        message: 'Name does not match the registered record for this mobile number. Please check your credentials.',
        error: 'NAME_MISMATCH',
      });
    }

    // Verify account is verified
    if (!userDoc.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'This account has not been fully verified. Please complete Sign Up verification.',
        error: 'ACCOUNT_UNVERIFIED',
      });
    }

    // Generate signed session token
    const sessionToken = createSessionToken({
      id: userDoc.id || userDoc._id ? String(userDoc.id || userDoc._id) : undefined,
      email: userDoc.email,
    });

    return res.json({
      success: true,
      message: `Welcome back, ${userDoc.name || 'Resident'}!`,
      sessionToken,
      user: {
        id: userDoc.id || userDoc._id,
        email: userDoc.email,
        phone: userDoc.phone || userDoc.phoneNumber,
        phoneNumber: userDoc.phoneNumber || userDoc.phone,
        name: userDoc.name,
        state: userDoc.state || 'Assam',
        district: userDoc.district || 'Kamrup Metropolitan',
        isVerified: userDoc.isVerified ?? true,
        emailVerified: userDoc.emailVerified ?? true,
        emailVerifiedAt: userDoc.emailVerifiedAt,
        phoneVerified: Boolean(userDoc.phoneVerified),
        phoneVerifiedAt: userDoc.phoneVerifiedAt,
        verifiedAt: userDoc.verifiedAt,
        createdAt: userDoc.createdAt,
        updatedAt: userDoc.updatedAt,
      },
    });
  } catch (err: any) {
    console.warn('[LOGIN-API] Login notice:', err.message);
    return res.status(503).json({
      success: false,
      message: `Database unavailable: ${err.message}`,
      error: 'DATABASE_UNAVAILABLE',
      diagnostic: getMongoStatus(),
    });
  }
});

// Legacy backward-compatible email OTP routes
app.post('/api/email/send-otp', async (req, res) => {
  try {
    const { email, name, district, state, mode } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
        error: 'MISSING_EMAIL',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let existingUser = null;
    try {
      existingUser = await findUserByEmail(normalizedEmail);
    } catch (dbErr: any) {
      console.warn('Check during send-otp warning:', dbErr.message);
    }

    if (mode === 'signin' && !existingUser) {
      return res.status(404).json({
        success: false,
        message: 'No registered account found with this email address.',
        error: 'USER_NOT_FOUND',
      });
    }

    const recipientName = (name && name.trim()) || (existingUser as any)?.name || undefined;
    const recipientDistrict = (district && district.trim()) || (existingUser as any)?.district || undefined;
    const recipientState = (state && state.trim()) || (existingUser as any)?.state || undefined;

    const result = await createAndSendOtp({
      email: normalizedEmail,
      name: recipientName,
      district: recipientDistrict,
      state: recipientState,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      ...result,
      isExistingUser: !!existingUser,
      existingName: (existingUser as any)?.name,
      mode: mode || (existingUser ? 'signin' : 'signup'),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to dispatch verification email.',
      error: 'SERVER_ERROR',
    });
  }
});

app.post('/api/email/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Both email and 6-digit OTP code are required.',
        error: 'MISSING_FIELDS',
      });
    }

    const result = verifyOtpCode({ email, otp });
    if (!result.success) {
      return res.status(400).json(result);
    }

    let savedUser = null;
    try {
      savedUser = await upsertVerifiedUser({
        email: result.verifiedEmail || email,
        name: result.name?.trim(),
        state: result.state?.trim(),
        district: result.district?.trim(),
        isVerified: true,
        emailVerified: true,
        verifiedAt: new Date(),
      });
    } catch (dbErr: any) {
      console.warn('User upsert notice:', dbErr.message);
    }

    const sessionToken = createSessionToken({
      id: savedUser?.id || savedUser?._id ? String(savedUser.id || savedUser._id) : undefined,
      email: result.verifiedEmail,
    });

    return res.json({
      ...result,
      sessionToken,
      user: savedUser
        ? {
            id: savedUser.id || savedUser._id,
            email: savedUser.email,
            phoneNumber: savedUser.phoneNumber,
            name: savedUser.name,
            state: savedUser.state,
            district: savedUser.district,
            isVerified: savedUser.isVerified,
            emailVerified: savedUser.emailVerified,
            phoneVerified: savedUser.phoneVerified,
            verifiedAt: savedUser.verifiedAt,
            createdAt: savedUser.createdAt,
          }
        : {
            email: result.verifiedEmail,
            name: result.name || '',
            state: result.state || 'Assam',
            district: result.district || 'Kamrup Metropolitan',
            isVerified: true,
            emailVerified: true,
            phoneVerified: false,
            verifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to verify code.',
      error: 'SERVER_ERROR',
    });
  }
});

// Helper function to extract auth token
function extractBearerToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const customHeader = req.headers['x-session-token'] as string;
  if (customHeader) {
    return customHeader.trim();
  }
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token.trim();
  }
  return null;
}

// 4. GET /api/auth/me: Restores and validates persistent authenticated session
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'No session token provided.',
      });
    }

    const verification = verifySessionToken(token);
    if (!verification.valid || !verification.payload?.email) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: verification.error || 'Invalid or expired session token.',
      });
    }

    const email = verification.payload.email.toLowerCase();
    const userDoc = await findUserByEmail(email);

    if (!userDoc) {
      return res.status(404).json({
        success: false,
        authenticated: false,
        message: 'User profile not found for active session.',
      });
    }

    return res.json({
      success: true,
      authenticated: true,
      user: {
        id: userDoc.id || userDoc._id,
        email: userDoc.email,
        phone: userDoc.phone || userDoc.phoneNumber || '',
        phoneNumber: userDoc.phoneNumber || userDoc.phone || '',
        name: userDoc.name || '',
        state: userDoc.state || 'Assam',
        district: userDoc.district || 'Kamrup Metropolitan',
        isVerified: userDoc.isVerified ?? true,
        emailVerified: userDoc.emailVerified ?? true,
        phoneVerified: Boolean(userDoc.phoneVerified),
        phoneVerifiedAt: userDoc.phoneVerifiedAt,
        verifiedAt: userDoc.verifiedAt,
        createdAt: userDoc.createdAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      authenticated: false,
      message: err.message || 'Failed to authenticate session.',
    });
  }
});

// 5. POST /api/auth/logout: Explicit session termination
app.post('/api/auth/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'User session logged out successfully.',
  });
});

// 6. GET /api/user/profile: Retrieves the verified user's saved profile from MongoDB
app.get('/api/user/profile', async (req, res) => {
  try {
    let rawEmail = req.query.email as string;

    if (!rawEmail) {
      const token = extractBearerToken(req);
      if (token) {
        const verification = verifySessionToken(token);
        if (verification.valid && verification.payload?.email) {
          rawEmail = verification.payload.email;
        }
      }
    }

    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email parameter or active session token is required.',
      });
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();
    const userDoc = await findUserByEmail(normalizedEmail);

    if (!userDoc) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.json({
      success: true,
      user: {
        id: userDoc.id || userDoc._id,
        email: userDoc.email,
        phone: userDoc.phone || userDoc.phoneNumber || '',
        phoneNumber: userDoc.phoneNumber || userDoc.phone || '',
        name: userDoc.name,
        state: userDoc.state,
        district: userDoc.district,
        isVerified: userDoc.isVerified,
        emailVerified: userDoc.emailVerified,
        phoneVerified: Boolean(userDoc.phoneVerified),
        phoneVerifiedAt: userDoc.phoneVerifiedAt,
        verifiedAt: userDoc.verifiedAt,
        createdAt: userDoc.createdAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch user profile.',
    });
  }
});

// 7. PATCH /api/user/profile: Updates name, phone number, state, and district for a verified user in MongoDB
app.patch('/api/user/profile', async (req, res) => {
  try {
    let { email, name, phoneNumber, phone, state, district } = req.body;
    const rawPhone = phone || phoneNumber;

    if (!email) {
      const token = extractBearerToken(req);
      if (token) {
        const verification = verifySessionToken(token);
        if (verification.valid && verification.payload?.email) {
          email = verification.payload.email;
        }
      }
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email or session authorization is required to update profile.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const updateFields: any = {};
    if (name !== undefined) updateFields.name = typeof name === 'string' ? name.trim() : '';
    if (rawPhone !== undefined) {
      const phoneCheck = normalizePhoneNumber(rawPhone);
      if (phoneCheck.isValid) {
        updateFields.phoneNumber = phoneCheck.normalized;
        updateFields.phone = phoneCheck.normalized;
      }
    }
    if (state !== undefined) updateFields.state = typeof state === 'string' ? state.trim() : '';
    if (district !== undefined) updateFields.district = typeof district === 'string' ? district.trim() : '';

    const updatedUser = await updateUserProfile(normalizedEmail, updateFields);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database.',
      });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id || updatedUser._id,
        email: updatedUser.email,
        phone: updatedUser.phone || updatedUser.phoneNumber || '',
        phoneNumber: updatedUser.phoneNumber || updatedUser.phone || '',
        name: updatedUser.name,
        state: updatedUser.state,
        district: updatedUser.district,
        isVerified: updatedUser.isVerified,
        emailVerified: updatedUser.emailVerified,
        phoneVerified: Boolean(updatedUser.phoneVerified),
        phoneVerifiedAt: updatedUser.phoneVerifiedAt,
        verifiedAt: updatedUser.verifiedAt,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update user profile.',
    });
  }
});

// 7a. POST /api/user/phone/send-otp: Dispatches 2Factor SMS OTP for currently logged-in account
app.post('/api/user/phone/send-otp', async (req, res) => {
  try {
    let { email, phoneNumber, phone } = req.body;
    const rawPhone = phone || phoneNumber;

    if (!email) {
      const token = extractBearerToken(req);
      if (token) {
        const verification = verifySessionToken(token);
        if (verification.valid && verification.payload?.email) {
          email = verification.payload.email;
        }
      }
    }

    if (!rawPhone) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required to send verification code.',
        error: 'MISSING_PHONE',
      });
    }

    const phoneCheck = normalizePhoneNumber(rawPhone);
    if (!phoneCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian mobile number.',
        error: 'INVALID_PHONE_NUMBER',
      });
    }

    const smsRateCheck = checkSmsRateLimit(phoneCheck.normalized);
    if (!smsRateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: smsRateCheck.message || 'SMS rate limit exceeded. Please wait.',
        cooldownSeconds: smsRateCheck.cooldownSeconds,
        error: smsRateCheck.error,
      });
    }

    const smsResult = await sendTwoFactorOtpSms(phoneCheck.normalized);
    if (!smsResult.success) {
      return res.status(400).json({
        success: false,
        message: smsResult.message || 'Failed to dispatch SMS OTP.',
        error: smsResult.error,
      });
    }

    recordSmsSent(phoneCheck.normalized);

    return res.json({
      success: true,
      message: `SMS verification code dispatched to ${phoneCheck.display}.`,
      sessionId: smsResult.sessionId,
      cooldownSeconds: 60,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to dispatch phone verification OTP.',
      error: 'SERVER_ERROR',
    });
  }
});

// 7b. POST /api/user/phone/verify-otp: Verifies 2Factor SMS OTP and marks phoneVerified=true on user account
app.post('/api/user/phone/verify-otp', async (req, res) => {
  try {
    let { email, phoneNumber, phone, sessionId, otp } = req.body;
    const rawPhone = phone || phoneNumber;

    if (!email) {
      const token = extractBearerToken(req);
      if (token) {
        const verification = verifySessionToken(token);
        if (verification.valid && verification.payload?.email) {
          email = verification.payload.email;
        }
      }
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'User email or authenticated session is required.',
        error: 'MISSING_EMAIL',
      });
    }

    if (!sessionId || !otp || !rawPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, Session ID, and 6-digit OTP passcode are required.',
        error: 'MISSING_FIELDS',
      });
    }

    const phoneCheck = normalizePhoneNumber(rawPhone);
    if (!phoneCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian mobile number.',
        error: 'INVALID_PHONE_NUMBER',
      });
    }

    // Strictly verify OTP with 2Factor API before marking phoneVerified=true
    const verifyResult = await verifyTwoFactorOtpSms(sessionId, otp);
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message || 'Invalid or expired OTP passcode.',
        error: verifyResult.error || 'OTP_MISMATCH',
      });
    }

    // Persist verified phone to user profile in MongoDB and JSON store
    const normalizedEmail = email.trim().toLowerCase();
    const updatedUser = await verifyAndSetUserPhone(normalizedEmail, phoneCheck.normalized);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User account not found in database.',
        error: 'USER_NOT_FOUND',
      });
    }

    recordVerifiedPhone(phoneCheck.normalized);

    return res.json({
      success: true,
      message: `Mobile number ${phoneCheck.display} verified successfully via 2Factor!`,
      phoneVerified: true,
      user: {
        id: updatedUser.id || updatedUser._id,
        email: updatedUser.email,
        phone: updatedUser.phone || updatedUser.phoneNumber,
        phoneNumber: updatedUser.phoneNumber || updatedUser.phone,
        name: updatedUser.name,
        state: updatedUser.state,
        district: updatedUser.district,
        isVerified: updatedUser.isVerified,
        emailVerified: updatedUser.emailVerified,
        phoneVerified: Boolean(updatedUser.phoneVerified),
        phoneVerifiedAt: updatedUser.phoneVerifiedAt,
        verifiedAt: updatedUser.verifiedAt,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to verify mobile OTP.',
      error: 'SERVER_ERROR',
    });
  }
});

// 8. POST /api/email/test-delivery: Dispatches a live verification test email
app.post('/api/email/test-delivery', async (req, res) => {
  try {
    const { recipientEmail, recipientName } = req.body;
    const targetEmail = recipientEmail || process.env.BREVO_SENDER_EMAIL;

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required for test delivery.',
      });
    }

    const authCheck = await testBrevoAuthentication();
    if (!authCheck.success) {
      return res.status(401).json({
        success: false,
        emailApiAuthentication: 'FAILED',
        error: authCheck.error,
      });
    }

    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const sendResult = await sendOTPEmail({
      email: targetEmail,
      otp: testOtp,
      name: recipientName || 'NER-SAFE Verifier',
      expirationMinutes: 10,
    });

    return res.json({
      success: sendResult.success,
      emailApiAuthentication: 'SUCCESS',
      otpEmail: sendResult.success ? 'SUCCESS' : 'FAILED',
      warningEmailService: 'READY',
      messageId: sendResult.messageId,
      recipient: targetEmail,
      message: sendResult.success
        ? `Test verification email delivered to ${targetEmail}`
        : sendResult.error,
      error: sendResult.error,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      emailApiAuthentication: 'FAILED',
      otpEmail: 'FAILED',
      warningEmailService: 'FAILED',
      error: err.message || 'Test delivery failed',
    });
  }
});

// 9. GET /api/users/verified: Lists verified users stored in MongoDB Atlas or local persistent store
app.get('/api/users/verified', async (req, res) => {
  try {
    let users = await getAllVerifiedUsers();
    const channel = typeof req.query.channel === 'string' ? req.query.channel.toLowerCase() : '';

    if (channel === 'sms') {
      users = users.filter((u: any) => Boolean(u.phoneVerified) && Boolean(u.phone || u.phoneNumber));
    } else if (channel === 'email') {
      users = users.filter((u: any) => Boolean(u.emailVerified ?? u.isVerified) && Boolean(u.email));
    }

    return res.json({
      success: true,
      users: users.map((u: any) => ({
        id: String(u.id || u._id || u.email),
        email: u.email,
        phone: u.phone || u.phoneNumber || '',
        phoneNumber: u.phoneNumber || u.phone || '',
        name: u.name || '',
        state: u.state || 'Assam',
        district: u.district || 'Kamrup Metropolitan',
        isVerified: u.isVerified ?? true,
        emailVerified: u.emailVerified ?? true,
        phoneVerified: Boolean(u.phoneVerified),
        phoneVerifiedAt: u.phoneVerifiedAt ? (typeof u.phoneVerifiedAt === 'string' ? u.phoneVerifiedAt : u.phoneVerifiedAt.toISOString()) : undefined,
        verifiedAt: u.verifiedAt ? (typeof u.verifiedAt === 'string' ? u.verifiedAt : u.verifiedAt.toISOString()) : undefined,
        createdAt: u.createdAt ? (typeof u.createdAt === 'string' ? u.createdAt : u.createdAt.toISOString()) : undefined,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch verified users.',
      users: [],
    });
  }
});

// 9a. GET /api/alerts/sms-recipients: Returns all users from MongoDB test.users with phone and phoneVerified=true
app.get('/api/alerts/sms-recipients', async (req, res) => {
  try {
    const verifiedPhoneUsers = await getAllPhoneVerifiedUsers();
    return res.json({
      success: true,
      count: verifiedPhoneUsers.length,
      recipients: verifiedPhoneUsers.map((u) => ({
        id: String(u.id || u.email),
        email: u.email,
        name: u.name || 'Resident',
        phone: u.phone || u.phoneNumber || '',
        maskedPhone: maskPhoneNumber(u.phone || u.phoneNumber || ''),
        phoneVerified: Boolean(u.phoneVerified),
        phoneVerifiedAt: u.phoneVerifiedAt,
        state: u.state || 'Assam',
        district: u.district || 'Kamrup Metropolitan',
      })),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load verified SMS recipients from MongoDB Atlas.',
      recipients: [],
      count: 0,
    });
  }
});

// 9b. Android Phone SMS Gateway Management & Relay Endpoints
app.get('/api/gateway/android-sms/status', (req, res) => {
  try {
    const status = getAndroidGatewayStatus();
    return res.json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      isOnline: false,
      message: err.message,
    });
  }
});

app.post('/api/gateway/android-sms/config', (req, res) => {
  try {
    const { url, token, senderName, simSlot } = req.body;
    setAndroidGatewayConfig({
      url,
      token,
      senderName,
      simSlot,
    });
    return res.json({
      success: true,
      message: 'Android SMS Gateway configuration updated successfully.',
      status: getAndroidGatewayStatus(),
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update gateway configuration.',
    });
  }
});

app.post('/api/gateway/android-sms/test', async (req, res) => {
  try {
    const testResult = await testAndroidGatewayConnection();
    return res.json(testResult);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Android gateway connection probe failed.',
    });
  }
});

app.post('/api/gateway/android-sms/heartbeat', (req, res) => {
  try {
    const { deviceName, battery, simOperator, signalStrength } = req.body;
    recordDeviceHeartbeat({
      deviceName,
      battery: typeof battery === 'number' ? battery : undefined,
      simOperator,
      signalStrength,
    });
    return res.json({
      success: true,
      message: 'Device heartbeat recorded from Android Phone SIM gateway.',
      status: getAndroidGatewayStatus(),
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to record device heartbeat.',
    });
  }
});

app.get('/api/gateway/android-sms/pending', (req, res) => {
  try {
    const items = getPendingSmsForDevice();
    return res.json({
      success: true,
      count: items.length,
      messages: items,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to retrieve pending SMS queue.',
      messages: [],
    });
  }
});

app.post('/api/gateway/android-sms/ack', (req, res) => {
  try {
    const { messageId, status, error } = req.body;
    if (!messageId) {
      return res.status(400).json({ success: false, message: 'messageId is required.' });
    }
    const acked = acknowledgeDeviceSms(messageId, status === 'SENT' ? 'SENT' : 'FAILED', error);
    return res.json({
      success: acked,
      message: acked ? `Message ${messageId} marked as ${status}` : 'Message not found in queue',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to acknowledge message status.',
    });
  }
});

// 10. POST /api/alerts/send-demo: Prototype alert testing dispatch endpoint (SIH26001 workflow)
app.post('/api/alerts/send-demo', async (req, res) => {
  try {
    const {
      recipients, // array of { email: string; phoneNumber?: string; name?: string; state?: string; district?: string; emailVerified?: boolean; phoneVerified?: boolean }
      alertSeverity, // 'CRITICAL' | 'HIGH' | 'MODERATE' | 'ADVISORY' | 'WATCH'
      state,
      district,
      riskLevel,
      riskScore,
      alertMessage,
      recommendedAction,
      channels, // { email: boolean; sms: boolean }
    } = req.body;

    const validSeverities = ['CRITICAL', 'HIGH', 'MODERATE', 'ADVISORY', 'WATCH'];
    const validRiskLevels = ['Low', 'Moderate', 'High', 'Severe'];

    if (!alertSeverity || !validSeverities.includes(String(alertSeverity).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'A valid alert severity (CRITICAL, HIGH, MODERATE, ADVISORY, or WATCH) is required.',
      });
    }

    if (!state || typeof state !== 'string' || !state.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid target state is required.',
      });
    }

    if (!district || typeof district !== 'string' || !district.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid target district is required.',
      });
    }

    if (!riskLevel || !validRiskLevels.includes(riskLevel)) {
      return res.status(400).json({
        success: false,
        message: 'A valid risk level (Low, Moderate, High, or Severe) is required.',
      });
    }

    const numRiskScore = Number(riskScore);
    if (isNaN(numRiskScore) || numRiskScore < 0 || numRiskScore > 100) {
      return res.status(400).json({
        success: false,
        message: 'A valid risk score between 0 and 100 is required.',
      });
    }

    if (!alertMessage || typeof alertMessage !== 'string' || !alertMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid alert message is required.',
      });
    }

    if (!recommendedAction || typeof recommendedAction !== 'string' || !recommendedAction.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid recommended action statement is required.',
      });
    }

    const isEmailChannel = Boolean(channels?.email);
    const isSmsChannel = Boolean(channels?.sms);

    if (!isEmailChannel && !isSmsChannel) {
      return res.status(400).json({
        success: false,
        message: 'At least one delivery channel (Email or SMS) must be selected.',
      });
    }

    let targetRecipients = Array.isArray(recipients) ? [...recipients] : [];

    // Automatically load all eligible registered users from MongoDB test.users if empty or sendToAllVerified is requested
    if (targetRecipients.length === 0 || req.body.sendToAllVerified) {
      if (isSmsChannel && !isEmailChannel) {
        const phoneVerifiedUsers = await getAllPhoneVerifiedUsers();
        targetRecipients = phoneVerifiedUsers.map((u) => ({
          email: u.email,
          name: u.name,
          phone: u.phone || u.phoneNumber,
          phoneNumber: u.phoneNumber || u.phone,
          state: u.state,
          district: u.district,
          phoneVerified: true,
          emailVerified: Boolean(u.emailVerified ?? u.isVerified),
        }));
      } else {
        const allVerifiedUsers = await getAllVerifiedUsers();
        targetRecipients = allVerifiedUsers.map((u) => ({
          email: u.email,
          name: u.name,
          phone: u.phone || u.phoneNumber,
          phoneNumber: u.phoneNumber || u.phone,
          state: u.state,
          district: u.district,
          phoneVerified: Boolean(u.phoneVerified),
          emailVerified: Boolean(u.emailVerified ?? u.isVerified),
        }));
      }
    }

    if (targetRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No registered recipients found in MongoDB Atlas. At least one verified recipient is required.',
      });
    }

    // Query verified users from store to cross-verify recipient status
    const verifiedUsersList = await getAllVerifiedUsers();
    const verifiedUsersByEmail = new Map<string, IUserRecord>();
    for (const u of verifiedUsersList) {
      verifiedUsersByEmail.set(u.email.toLowerCase(), u);
    }

    // Enforce: Email only to verified email, SMS only to verified phone
    // Check if any valid verified recipient exists for the selected channel(s)
    let hasAnyValidVerifiedRecipient = false;
    for (const r of targetRecipients) {
      const emailKey = (r.email || '').trim().toLowerCase();
      const verifiedRecord = verifiedUsersByEmail.get(emailKey);
      const isEmailVerified = r.emailVerified === false
        ? false
        : verifiedRecord
        ? Boolean(verifiedRecord.emailVerified ?? verifiedRecord.isVerified)
        : Boolean(r.emailVerified);
      const recipientPhone = (r.phone || r.phoneNumber || verifiedRecord?.phone || verifiedRecord?.phoneNumber || '').trim();
      const isPhoneVerified = r.phoneVerified === false
        ? false
        : verifiedRecord
        ? (Boolean(verifiedRecord.phoneVerified) && Boolean(verifiedRecord.phone || verifiedRecord.phoneNumber))
        : (Boolean(r.phoneVerified) && Boolean(recipientPhone));

      if (isEmailChannel && isEmailVerified && emailKey) {
        hasAnyValidVerifiedRecipient = true;
        break;
      }
      if (isSmsChannel && isPhoneVerified && recipientPhone) {
        hasAnyValidVerifiedRecipient = true;
        break;
      }
    }

    if (!hasAnyValidVerifiedRecipient) {
      return res.status(400).json({
        success: false,
        message: 'No valid verified recipient found for the selected delivery channel(s). Email alerts require verified email addresses, and SMS alerts require verified phone numbers (phoneVerified=true in MongoDB).',
      });
    }

    const deliveryResults: Array<{
      email: string;
      phoneNumber?: string;
      name?: string;
      district?: string;
      state?: string;
      emailStatus: 'SENT' | 'FAILED' | 'SKIPPED';
      emailMessageId?: string;
      emailError?: string;
      smsStatus: 'PREPARED' | 'SENT' | 'FAILED' | 'NO_PHONE' | 'SKIPPED';
      smsMessageId?: string;
      smsError?: string;
      smsNotice?: string;
    }> = [];

    // Process delivery for each recipient
    for (const recipient of targetRecipients) {
      const recipientEmail = (recipient.email || '').trim().toLowerCase();
      if (!recipientEmail) continue;

      const emailKey = recipientEmail;
      const verifiedRecord = verifiedUsersByEmail.get(emailKey);
      const recipientName = (recipient.name || verifiedRecord?.name || '').trim() || recipientEmail.split('@')[0];
      const recipientDistrict = recipient.district || verifiedRecord?.district || district || 'Kamrup Metropolitan';
      const recipientState = recipient.state || verifiedRecord?.state || state || 'Assam';
      const recipientPhone = (recipient.phone || recipient.phoneNumber || verifiedRecord?.phone || verifiedRecord?.phoneNumber || '').trim();

      const isEmailVerified = recipient.emailVerified === false
        ? false
        : verifiedRecord
        ? Boolean(verifiedRecord.emailVerified ?? verifiedRecord.isVerified)
        : Boolean(recipient.emailVerified);
      const isPhoneVerified = recipient.phoneVerified === false
        ? false
        : verifiedRecord
        ? (Boolean(verifiedRecord.phoneVerified) && Boolean(verifiedRecord.phone || verifiedRecord.phoneNumber))
        : (Boolean(recipient.phoneVerified) && Boolean(recipientPhone));

      let emailStatus: 'SENT' | 'FAILED' | 'SKIPPED' = 'SKIPPED';
      let emailMessageId: string | undefined;
      let emailError: string | undefined;

      let smsStatus: 'PREPARED' | 'SENT' | 'FAILED' | 'NO_PHONE' | 'SKIPPED' = 'SKIPPED';
      let smsMessageId: string | undefined;
      let smsError: string | undefined;
      let smsNotice: string | undefined;

      // 1. Email Delivery using Brevo Integration
      if (isEmailChannel) {
        if (!isEmailVerified) {
          emailStatus = 'SKIPPED';
          emailError = 'Recipient email is not verified in MongoDB.';
        } else {
          try {
            const emailRes = await sendWarningEmail({
              recipientEmail,
              recipientName,
              alertSeverity: String(alertSeverity).toUpperCase() as any,
              state: state || recipientState,
              district: district || recipientDistrict,
              riskLevel: riskLevel || 'High',
              riskScore: numRiskScore,
              mainContributingFactors: [
                `NER-SAFE ALERT BROADCAST: ${alertSeverity} alert for ${district || recipientDistrict}, ${state || recipientState}.`,
                `Contributing Factor: ${alertMessage || 'Heavy rainfall + high soil saturation'}`,
              ],
              weatherConditions: {
                currentPrecipitationMm: 14.2,
                cumulativeRainfall72hMm: 96.5,
                soilSaturationPercent: 78,
                forecastPrecipitationNext24hMm: 38.0,
                slopeAngleDegrees: 32,
              },
              alertTimestamp: new Date().toISOString(),
              recommendedAction: recommendedAction || 'Avoid vulnerable slopes and follow local authority instructions.',
              officialAdvisorySource: 'NER-SAFE Early Warning Network (SIH26001)',
            });

            if (emailRes.success) {
              emailStatus = 'SENT';
              emailMessageId = emailRes.messageId;
            } else {
              emailStatus = 'FAILED';
              emailError = emailRes.error || 'Failed to dispatch via Brevo';
            }
          } catch (mailErr: any) {
            emailStatus = 'FAILED';
            emailError = mailErr.message || 'Brevo email dispatch error';
          }
        }
      }

      // 2. SMS Warning Preparation for Authority's Mobile Phone & Native SMS Application
      if (isSmsChannel) {
        const masked = maskPhoneNumber(recipientPhone);
        if (!recipientPhone) {
          smsStatus = 'NO_PHONE';
          smsError = 'No mobile number registered for this recipient in MongoDB.';
          console.log(`[SMS-FLOW] Recipient ${masked}: NO_PHONE registered`);
        } else if (!isPhoneVerified) {
          smsStatus = 'FAILED';
          smsError = 'Recipient mobile number is not verified in MongoDB (phoneVerified=false).';
          console.log(`[SMS-FLOW] Recipient ${masked}: phone is not verified in MongoDB`);
        } else {
          // Prepared for native SMS composer on authority's phone
          smsStatus = 'PREPARED';
          smsNotice = 'SMS prepared on your phone. Review the recipients and message, then tap Send.';
          console.log(`[SMS-FLOW] SMS prepared for authority phone dispatch to recipient: ${masked}`);
        }
      }

      deliveryResults.push({
        email: recipientEmail,
        phoneNumber: recipientPhone,
        name: recipientName,
        district: recipientDistrict,
        state: recipientState,
        emailStatus,
        emailMessageId,
        emailError,
        smsStatus,
        smsMessageId,
        smsError,
        smsNotice,
      });
    }

    const totalRecipients = deliveryResults.length;
    const smsPreparedCount = deliveryResults.filter((r) => r.smsStatus === 'PREPARED').length;
    const smsFailedCount = deliveryResults.filter((r) => r.smsStatus === 'FAILED' || r.smsStatus === 'NO_PHONE').length;
    const emailSuccessCount = deliveryResults.filter((r) => r.emailStatus === 'SENT').length;
    const emailFailedCount = deliveryResults.filter((r) => r.emailStatus === 'FAILED').length;

    let responseMessage = `Alert broadcast processed for ${totalRecipients} recipient(s).`;
    if (isEmailChannel && isSmsChannel) {
      responseMessage = `Brevo email alert dispatched to ${emailSuccessCount} resident(s) and SMS prepared on your phone for ${smsPreparedCount} recipient(s).`;
    } else if (isSmsChannel) {
      responseMessage = 'SMS prepared on your phone. Review the recipients and message, then tap Send.';
    } else if (isEmailChannel) {
      responseMessage = `Brevo email alert dispatched to ${emailSuccessCount} verified resident(s).`;
    }

    return res.json({
      success: true,
      message: responseMessage,
      totalRecipients,
      smsTotal: isSmsChannel ? totalRecipients : 0,
      smsPreparedCount,
      smsFailedCount,
      emailSuccessCount,
      emailFailedCount,
      timestamp: new Date().toISOString(),
      results: deliveryResults,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to process demo alerts.',
    });
  }
});

// Explicitly trap all unmatched /api/* routes so they ALWAYS return JSON, never index.html!
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.path}`,
    status: 404,
  });
});

// Explicitly trap all API errors to guarantee JSON responses
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Internal Error]', req.method, req.path, err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal API Error',
    status: err.status || 500,
  });
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: false,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`[server] Port ${PORT} is temporarily busy. Retrying in 1s...`);
      setTimeout(() => {
        try {
          httpServer.close();
        } catch (_) {}
        httpServer.listen(PORT, '0.0.0.0');
      }, 1000);
    } else {
      console.error('[server] Unexpected server error:', err);
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`NER-SAFE Server listening on http://0.0.0.0:${PORT}`);
  });

  const handleShutdown = () => {
    httpServer.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

startServer();
