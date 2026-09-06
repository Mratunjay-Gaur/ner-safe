export function getWeatherConditionByCode(code: number): {
  condition: string;
  category: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
} {
  switch (code) {
    case 0:
      return { condition: 'Clear Sky', category: 'clear' };
    case 1:
      return { condition: 'Mainly Clear', category: 'clear' };
    case 2:
      return { condition: 'Partly Cloudy', category: 'cloudy' };
    case 3:
      return { condition: 'Overcast', category: 'cloudy' };
    case 45:
      return { condition: 'Foggy', category: 'fog' };
    case 48:
      return { condition: 'Depositing Rime Fog', category: 'fog' };
    case 51:
      return { condition: 'Light Drizzle', category: 'rain' };
    case 53:
      return { condition: 'Moderate Drizzle', category: 'rain' };
    case 55:
      return { condition: 'Dense Drizzle', category: 'rain' };
    case 56:
      return { condition: 'Light Freezing Drizzle', category: 'rain' };
    case 57:
      return { condition: 'Dense Freezing Drizzle', category: 'rain' };
    case 61:
      return { condition: 'Slight Rain', category: 'rain' };
    case 63:
      return { condition: 'Moderate Rain', category: 'rain' };
    case 65:
      return { condition: 'Heavy Rain', category: 'rain' };
    case 66:
      return { condition: 'Light Freezing Rain', category: 'rain' };
    case 67:
      return { condition: 'Heavy Freezing Rain', category: 'rain' };
    case 71:
      return { condition: 'Slight Snowfall', category: 'snow' };
    case 73:
      return { condition: 'Moderate Snowfall', category: 'snow' };
    case 75:
      return { condition: 'Heavy Snowfall', category: 'snow' };
    case 77:
      return { condition: 'Snow Grains', category: 'snow' };
    case 80:
      return { condition: 'Slight Rain Showers', category: 'rain' };
    case 81:
      return { condition: 'Moderate Rain Showers', category: 'rain' };
    case 82:
      return { condition: 'Violent Rain Showers', category: 'rain' };
    case 85:
      return { condition: 'Slight Snow Showers', category: 'snow' };
    case 86:
      return { condition: 'Heavy Snow Showers', category: 'snow' };
    case 95:
      return { condition: 'Thunderstorm', category: 'storm' };
    case 96:
      return { condition: 'Thunderstorm with Slight Hail', category: 'storm' };
    case 99:
      return { condition: 'Thunderstorm with Heavy Hail', category: 'storm' };
    default:
      return { condition: 'Fair Weather', category: 'clear' };
  }
}

export function getWindDirectionCardinal(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((degrees % 360) / 22.5) % 16;
  return directions[index];
}

export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return isoString;
  }
}

export function formatSyncTime(dateOrIso: Date | string | null | undefined): string | undefined {
  if (!dateOrIso) return undefined;
  try {
    const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(date.getTime())) return undefined;
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return undefined;
  }
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}
