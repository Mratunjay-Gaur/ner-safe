import { LocationItem, WeatherResponse } from '../types/weather';
import { DistrictEnvironmentalProfile } from '../types/environmental';
import {
  CalculatedRiskAssessment,
  RiskFactorContribution,
  RiskForecastWindow,
  RiskLevel,
  DataCompletenessStatus,
} from '../types/risk';
import { IIncidentReport } from '../types/incident';
import { getDistanceKm } from '../data/historicalLandslides';

/**
 * Maps numeric score (0-100) to standard RiskLevel
 */
export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MODERATE';
  return 'LOW';
}

/**
 * Calculates standardized, transparent multi-factor landslide risk assessment
 */
export function calculateMultiFactorLandslideRisk(
  location: LocationItem,
  weatherData: WeatherResponse | null,
  environmentalProfile: DistrictEnvironmentalProfile | null,
  incidentsList: IIncidentReport[] = []
): CalculatedRiskAssessment {
  const missingSources: string[] = [];
  const factors: RiskFactorContribution[] = [];

  // --- 1. Factor: Topographic Slope & Terrain Gradient (Weight: 25%) ---
  const terrainSlope = environmentalProfile?.terrainSlope;
  const isTerrainAvailable = Boolean(terrainSlope && terrainSlope.calculatedSlopeDegrees !== undefined);
  let slopeScore = 15;
  let measuredSlopeVal: number | string = 'Unavailable';

  if (isTerrainAvailable && terrainSlope) {
    const deg = terrainSlope.calculatedSlopeDegrees;
    measuredSlopeVal = `${deg}° (${terrainSlope.terrainCategory})`;

    if (deg <= 4) slopeScore = 8;
    else if (deg <= 12) slopeScore = 24;
    else if (deg <= 22) slopeScore = 52;
    else if (deg <= 35) slopeScore = 82;
    else slopeScore = 96;
  } else {
    missingSources.push('Copernicus 30m DEM Terrain Elevation Model');
    slopeScore = 20; // conservative default baseline
  }

  factors.push({
    id: 'factor-slope',
    name: 'Topographic Slope & Terrain Gradient',
    category: 'Terrain & Topography',
    measuredValue: measuredSlopeVal,
    unit: 'Degrees (°)',
    normalizedScore: slopeScore,
    weightPercent: 25,
    weightedContributionPoints: (slopeScore * 25) / 100,
    sourceType: 'STATIC',
    isAvailable: isTerrainAvailable,
    statusText: isTerrainAvailable ? 'Active DEM' : 'Unavailable',
    driverDescription:
      slopeScore >= 75
        ? 'High gravitational shear stress due to steep mountain slope.'
        : slopeScore >= 45
        ? 'Moderate slope elevation with moderate gravitational susceptibility.'
        : 'Gentle terrain slope with low gravitational sliding hazard.',
  });

  // --- 2. Factor: Volumetric Soil Moisture & Saturation (Weight: 25%) ---
  const soilMoisture = environmentalProfile?.soilMoisture;
  const isSoilAvailable = Boolean(soilMoisture && soilMoisture.surfaceSaturationPercent !== undefined);
  let soilScore = 25;
  let measuredSoilVal: number | string = 'Unavailable';

  if (isSoilAvailable && soilMoisture) {
    const sat = soilMoisture.surfaceSaturationPercent;
    const vVol = Math.round(soilMoisture.depth0to7cm * 100);
    measuredSoilVal = `${sat}% (${vVol}% vol, ${soilMoisture.moistureClassification})`;

    if (sat < 25) soilScore = 10;
    else if (sat < 50) soilScore = 32;
    else if (sat < 70) soilScore = 58;
    else if (sat < 85) soilScore = 82;
    else soilScore = 98;
  } else {
    missingSources.push('ECMWF ERA5-Land Volumetric Soil Moisture Telemetry');
    soilScore = 30;
  }

  factors.push({
    id: 'factor-soil',
    name: 'Volumetric Soil Moisture & Saturation',
    category: 'Hydrological & Soil',
    measuredValue: measuredSoilVal,
    unit: '% Saturation',
    normalizedScore: soilScore,
    weightPercent: 25,
    weightedContributionPoints: (soilScore * 25) / 100,
    sourceType: 'UPDATED',
    isAvailable: isSoilAvailable,
    statusText: isSoilAvailable ? 'ECMWF ERA5-Land' : 'Unavailable',
    driverDescription:
      soilScore >= 80
        ? 'Elevated pore-water pressure significantly reducing soil internal shear strength.'
        : soilScore >= 50
        ? 'Moderate antecedent soil moisture accumulation in upper 0–28cm horizons.'
        : 'Low soil water retention; dry/optimal ground cohesion conditions.',
  });

  // --- 3. Factor: Current & Antecedent Rainfall (Weight: 20%) ---
  const isWeatherAvailable = Boolean(weatherData && weatherData.current);
  let rainScore = 10;
  let measuredRainVal: number | string = 'Unavailable';

  if (isWeatherAvailable && weatherData) {
    const currentRate = weatherData.current.precipitation || 0;
    // Calculate 24h past rain from history if available
    let past24Rain = 0;
    if (weatherData.history && weatherData.history.length > 0) {
      past24Rain = weatherData.history.reduce((sum, h) => sum + (h.precipitation || 0), 0);
    }

    measuredRainVal = `${currentRate} mm/h (Past 24h: ${Math.round(past24Rain * 10) / 10} mm)`;

    if (currentRate >= 30) rainScore = 98; // Cloudburst / extreme intensity
    else if (currentRate >= 15) rainScore = 85; // Heavy rain
    else if (currentRate >= 5) rainScore = 65; // Moderate rain
    else if (currentRate >= 1) rainScore = 40; // Light showers
    else {
      // Base on antecedent 24h rainfall
      if (past24Rain >= 40) rainScore = 55;
      else if (past24Rain >= 15) rainScore = 35;
      else rainScore = 8;
    }
  } else {
    missingSources.push('WMO/ECMWF Live Precipitation Telemetry');
    rainScore = 15;
  }

  factors.push({
    id: 'factor-rain',
    name: 'Current & Antecedent Rainfall Rate',
    category: 'Atmospheric Trigger',
    measuredValue: measuredRainVal,
    unit: 'mm/hour',
    normalizedScore: rainScore,
    weightPercent: 20,
    weightedContributionPoints: (rainScore * 20) / 100,
    sourceType: 'LIVE',
    isAvailable: isWeatherAvailable,
    statusText: isWeatherAvailable ? 'WMO Live Feed' : 'Unavailable',
    driverDescription:
      rainScore >= 75
        ? 'Heavy active precipitation serving as immediate hydrostatic failure trigger.'
        : rainScore >= 40
        ? 'Persistent moisture input providing continuous soil lubricating action.'
        : 'Zero/negligible immediate rainfall trigger currently observed.',
  });

  // --- 4. Factor: Forecast Precipitation & Intensity (Weight: 15%) ---
  let forecastScore = 10;
  let measuredForecastVal: number | string = 'Unavailable';
  const isForecastAvailable = Boolean(weatherData && weatherData.daily && weatherData.daily.length > 0);

  if (isForecastAvailable && weatherData) {
    const todayDaily = weatherData.daily[0];
    const forecastSum = todayDaily.precipitationSum || 0;
    const precipProb = todayDaily.precipitationProbabilityMax || 0;
    measuredForecastVal = `${forecastSum} mm expected (${precipProb}% prob)`;

    if (forecastSum >= 65) forecastScore = 96;
    else if (forecastSum >= 35) forecastScore = 82;
    else if (forecastSum >= 15) forecastScore = 58;
    else if (forecastSum >= 5) forecastScore = 34;
    else forecastScore = 12;
  } else {
    missingSources.push('ECMWF Numerical Weather Forecast Model');
    forecastScore = 15;
  }

  factors.push({
    id: 'factor-forecast',
    name: 'Forecast Precipitation (Upcoming 24h)',
    category: 'Forecast Precipitation',
    measuredValue: measuredForecastVal,
    unit: 'mm / 24h',
    normalizedScore: forecastScore,
    weightPercent: 15,
    weightedContributionPoints: (forecastScore * 15) / 100,
    sourceType: 'LIVE',
    isAvailable: isForecastAvailable,
    statusText: isForecastAvailable ? 'ECMWF 24h Model' : 'Unavailable',
    driverDescription:
      forecastScore >= 75
        ? 'Upcoming forecast indicates heavy precipitation loading onto existing terrain.'
        : forecastScore >= 45
        ? 'Moderate precipitation expected in the forward 24-hour meteorological window.'
        : 'Favorable low-precipitation forecast expected over the next 24 hours.',
  });

  // --- 5. Factor: Historical Landslide Susceptibility (Weight: 10%) ---
  const historicalLandslides = environmentalProfile?.historicalLandslides || [];
  const nearbyHistoricalCount = environmentalProfile?.nearbyLandslideCount ?? historicalLandslides.length;
  const isHistoryAvailable = Boolean(environmentalProfile);
  let historyScore = 15;

  if (nearbyHistoricalCount >= 5) historyScore = 92;
  else if (nearbyHistoricalCount >= 3) historyScore = 72;
  else if (nearbyHistoricalCount >= 1) historyScore = 46;
  else historyScore = 12;

  factors.push({
    id: 'factor-history',
    name: 'Historical Landslide Susceptibility Index',
    category: 'Historical Susceptibility',
    measuredValue: `${nearbyHistoricalCount} verified events within 50km`,
    unit: 'Events',
    normalizedScore: historyScore,
    weightPercent: 10,
    weightedContributionPoints: (historyScore * 10) / 100,
    sourceType: 'HISTORICAL',
    isAvailable: isHistoryAvailable,
    statusText: 'GSI / NASA GLC Archive',
    driverDescription:
      historyScore >= 70
        ? 'Proven historical geological instability and recurring slope failures in corridor.'
        : historyScore >= 40
        ? 'Known historical landslide records documented in adjacent topographical zones.'
        : 'Minimal or isolated historical slope failures recorded in regional inventory.',
  });

  // --- 6. Factor: Field Observations & Verified Ground Incidents (Weight: 5%) ---
  // Find ground distress reports within 50km of selected location
  const nearbyIncidents = incidentsList.filter((inc) => {
    const dKm = getDistanceKm(location.latitude, location.longitude, inc.latitude, inc.longitude);
    return dKm <= 50;
  });

  const verifiedDistressCount = nearbyIncidents.filter(
    (inc) =>
      ['Landslide', 'Ground Crack', 'Slope Movement', 'Rockfall'].includes(inc.incidentType) &&
      (inc.status === 'VERIFIED' || inc.status === 'RESOLVED')
  ).length;

  const underReviewCount = nearbyIncidents.filter(
    (inc) => inc.status === 'UNDER REVIEW' || inc.status === 'SUBMITTED'
  ).length;

  let fieldScore = 0;
  let fieldDesc = '0 verified ground crack or slope movement reports within 50km';

  if (verifiedDistressCount > 0) {
    fieldScore = 95;
    fieldDesc = `${verifiedDistressCount} verified active ground distress / slope movement reports nearby`;
  } else if (underReviewCount > 0) {
    fieldScore = 50;
    fieldDesc = `${underReviewCount} pending citizen ground distress reports under active review`;
  }

  factors.push({
    id: 'factor-incidents',
    name: 'Ground Observations & Distress Reports',
    category: 'Field Observations',
    measuredValue: `${nearbyIncidents.length} reports (${verifiedDistressCount} verified)`,
    unit: 'Reports',
    normalizedScore: fieldScore,
    weightPercent: 5,
    weightedContributionPoints: (fieldScore * 5) / 100,
    sourceType: 'DATABASE',
    isAvailable: true,
    statusText: 'Authority Incidents Store',
    driverDescription:
      fieldScore >= 75
        ? 'Recent verified ground fissures/slope distress physically confirmed in proximity.'
        : fieldScore >= 40
        ? 'Unverified ground observation reports currently under review in vicinity.'
        : 'No recent field ground cracks or structural slope failures reported nearby.',
  });

  // --- Dynamic Multi-Factor Weight Normalization ---
  let totalAvailableWeight = 0;
  let totalWeightedPoints = 0;

  factors.forEach((f) => {
    if (f.isAvailable) {
      totalAvailableWeight += f.weightPercent;
      totalWeightedPoints += (f.normalizedScore * f.weightPercent) / 100;
    }
  });

  // If some data is unavailable, normalize over available weights
  const rawScore =
    totalAvailableWeight > 0 ? Math.round((totalWeightedPoints / totalAvailableWeight) * 100) : 25;

  const finalRiskScore = Math.max(0, Math.min(100, rawScore));
  const finalRiskLevel = getRiskLevelFromScore(finalRiskScore);

  // --- Compute Future Windows (Current, 6h, 12h, 24h) ---
  const hourly = weatherData?.hourly || [];
  const forecastWindows = calculateForecastWindows(
    finalRiskScore,
    hourly,
    isSoilAvailable && soilMoisture ? soilMoisture.surfaceSaturationPercent : 45,
    isTerrainAvailable && terrainSlope ? terrainSlope.calculatedSlopeDegrees : 18
  );

  // --- Data Completeness Audit ---
  const totalSourcesCount = 6;
  const availableSourcesCount = totalSourcesCount - missingSources.length;
  const completenessPercent = Math.round((availableSourcesCount / totalSourcesCount) * 100);

  let confidenceLevel: DataCompletenessStatus['confidenceLevel'] = 'HIGH CONFIDENCE';
  if (completenessPercent < 60) {
    confidenceLevel = 'LIMITED CONFIDENCE (DATA GAPS)';
  } else if (completenessPercent < 90) {
    confidenceLevel = 'MODERATE CONFIDENCE';
  }

  const uncertaintyNotes =
    missingSources.length > 0
      ? `Data completeness is ${completenessPercent}%. Missing or interpolated indicators: ${missingSources.join(', ')}. Risk scoring normalized across active sensors.`
      : 'All 6 primary environmental, DEM terrain, and meteorological feeds are active and synchronized.';

  // --- Standardized Safety Statement ---
  const assessmentStatement = `Estimated risk is ${finalRiskLevel} based on available environmental, topographic, and historical indicators.`;
  const safetyDisclaimer =
    'NER-SAFE Risk Monitor is a multi-factor decision-support prototype. It does not provide deterministic guarantees of slope stability and should be used in conjunction with official district disaster management directives.';

  return {
    location,
    riskScore: finalRiskScore,
    riskLevel: finalRiskLevel,
    assessmentStatement,
    safetyDisclaimer,
    factors,
    forecastWindows,
    dataCompleteness: {
      totalSourcesCount,
      availableSourcesCount,
      completenessPercent,
      missingSources,
      confidenceLevel,
      uncertaintyNotes,
    },
    calculatedAt: new Date().toISOString(),
    calculationMethod: 'Multi-Factor Dynamic Weighted Geophysical Vulnerability Matrix (SIH26001)',
  };
}

/**
 * Calculates supported forward-looking risk windows (Current, Next 6 Hours, Next 12 Hours, Next 24 Hours)
 */
function calculateForecastWindows(
  currentRiskScore: number,
  hourly: WeatherResponse['hourly'],
  baseSaturation: number,
  slopeDegrees: number
): RiskForecastWindow[] {
  // 1. Current Window
  const currentWindow: RiskForecastWindow = {
    windowId: 'current',
    label: 'Current Observation',
    timeRange: 'Now (Live)',
    riskScore: currentRiskScore,
    riskLevel: getRiskLevelFromScore(currentRiskScore),
    expectedPrecipitationMm: hourly[0]?.precipitation ?? 0,
    precipitationProbabilityMax: hourly[0]?.precipitationProbability ?? 0,
    projectedSoilSaturation: baseSaturation,
    primaryDriver: 'Live atmospheric & terrain measurements',
    status: 'ESTIMATED_FROM_ECMWF_FORECAST',
  };

  // 2. Next 6 Hours Window
  const slice6h = hourly.slice(0, 6);
  const rain6h = slice6h.reduce((sum, h) => sum + (h.precipitation || 0), 0);
  const prob6h = Math.max(0, ...slice6h.map((h) => h.precipitationProbability || 0));
  const saturation6h = Math.min(100, Math.round(baseSaturation + rain6h * 1.2));
  
  let delta6h = 0;
  if (rain6h >= 25) delta6h = slopeDegrees >= 25 ? +18 : +12;
  else if (rain6h >= 10) delta6h = +6;
  else if (rain6h === 0 && currentRiskScore > 20) delta6h = -3;

  const score6h = Math.max(5, Math.min(100, currentRiskScore + delta6h));

  const window6h: RiskForecastWindow = {
    windowId: '6h',
    label: 'Next 6 Hours',
    timeRange: '+0h to +6h',
    riskScore: score6h,
    riskLevel: getRiskLevelFromScore(score6h),
    expectedPrecipitationMm: Math.round(rain6h * 10) / 10,
    precipitationProbabilityMax: prob6h,
    projectedSoilSaturation: saturation6h,
    primaryDriver:
      rain6h >= 10
        ? `Upcoming 6h rainfall (${Math.round(rain6h)} mm) augmenting pore pressure`
        : 'Steady environmental moisture equilibrium',
    status: 'ESTIMATED_FROM_ECMWF_FORECAST',
  };

  // 3. Next 12 Hours Window
  const slice12h = hourly.slice(0, 12);
  const rain12h = slice12h.reduce((sum, h) => sum + (h.precipitation || 0), 0);
  const prob12h = Math.max(0, ...slice12h.map((h) => h.precipitationProbability || 0));
  const saturation12h = Math.min(100, Math.round(baseSaturation + rain12h * 1.5));

  let delta12h = 0;
  if (rain12h >= 45) delta12h = slopeDegrees >= 25 ? +25 : +16;
  else if (rain12h >= 20) delta12h = +10;
  else if (rain12h >= 5) delta12h = +3;
  else if (rain12h === 0 && currentRiskScore > 20) delta12h = -6;

  const score12h = Math.max(5, Math.min(100, currentRiskScore + delta12h));

  const window12h: RiskForecastWindow = {
    windowId: '12h',
    label: 'Next 12 Hours',
    timeRange: '+0h to +12h',
    riskScore: score12h,
    riskLevel: getRiskLevelFromScore(score12h),
    expectedPrecipitationMm: Math.round(rain12h * 10) / 10,
    precipitationProbabilityMax: prob12h,
    projectedSoilSaturation: saturation12h,
    primaryDriver:
      rain12h >= 20
        ? `Cumulative 12h precipitation (${Math.round(rain12h)} mm) loading`
        : 'Subsurface drainage dissipation exceeding rainfall input',
    status: 'ESTIMATED_FROM_ECMWF_FORECAST',
  };

  // 4. Next 24 Hours Window
  const slice24h = hourly.slice(0, 24);
  const rain24h = slice24h.reduce((sum, h) => sum + (h.precipitation || 0), 0);
  const prob24h = Math.max(0, ...slice24h.map((h) => h.precipitationProbability || 0));
  const saturation24h = Math.min(100, Math.round(baseSaturation + rain24h * 1.8));

  let delta24h = 0;
  if (rain24h >= 60) delta24h = slopeDegrees >= 25 ? +30 : +20;
  else if (rain24h >= 30) delta24h = +12;
  else if (rain24h >= 10) delta24h = +4;
  else if (rain24h === 0 && currentRiskScore > 20) delta24h = -10;

  const score24h = Math.max(5, Math.min(100, currentRiskScore + delta24h));

  const window24h: RiskForecastWindow = {
    windowId: '24h',
    label: 'Next 24 Hours',
    timeRange: '+0h to +24h',
    riskScore: score24h,
    riskLevel: getRiskLevelFromScore(score24h),
    expectedPrecipitationMm: Math.round(rain24h * 10) / 10,
    precipitationProbabilityMax: prob24h,
    projectedSoilSaturation: saturation24h,
    primaryDriver:
      rain24h >= 30
        ? `Diurnal storm accumulation (${Math.round(rain24h)} mm) elevating slope saturation`
        : 'Extended 24h atmospheric stabilization forecast',
    status: 'ESTIMATED_FROM_ECMWF_FORECAST',
  };

  return [currentWindow, window6h, window12h, window24h];
}
