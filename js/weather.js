/**
 * Weather Module — Uses Open-Meteo API (free, no key required)
 */

const WEATHER_CODES = {
  0: { label: 'Clear Sky', icon: '☀️', photography: 'harsh-light' },
  1: { label: 'Mainly Clear', icon: '🌤️', photography: 'good-light' },
  2: { label: 'Partly Cloudy', icon: '⛅', photography: 'diffused-light' },
  3: { label: 'Overcast', icon: '☁️', photography: 'soft-light' },
  45: { label: 'Fog', icon: '🌫️', photography: 'atmospheric' },
  48: { label: 'Rime Fog', icon: '🌫️', photography: 'atmospheric' },
  51: { label: 'Light Drizzle', icon: '🌦️', photography: 'moody' },
  53: { label: 'Moderate Drizzle', icon: '🌧️', photography: 'moody' },
  55: { label: 'Dense Drizzle', icon: '🌧️', photography: 'challenging' },
  61: { label: 'Slight Rain', icon: '🌧️', photography: 'moody' },
  63: { label: 'Moderate Rain', icon: '🌧️', photography: 'challenging' },
  65: { label: 'Heavy Rain', icon: '🌧️', photography: 'challenging' },
  71: { label: 'Slight Snow', icon: '🌨️', photography: 'atmospheric' },
  73: { label: 'Moderate Snow', icon: '🌨️', photography: 'atmospheric' },
  75: { label: 'Heavy Snow', icon: '❄️', photography: 'challenging' },
  80: { label: 'Rain Showers', icon: '🌦️', photography: 'moody' },
  95: { label: 'Thunderstorm', icon: '⛈️', photography: 'dramatic' },
};

/**
 * Fetch current weather for given coordinates
 */
export async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,cloud_cover&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API failed');
    const data = await res.json();
    const current = data.current;
    const code = current.weather_code;
    const info = WEATHER_CODES[code] || WEATHER_CODES[0];

    return {
      temp: Math.round(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      cloudCover: current.cloud_cover,
      code,
      label: info.label,
      icon: info.icon,
      photography: info.photography,
    };
  } catch (err) {
    console.warn('Weather fetch failed, using defaults:', err);
    return {
      temp: 28,
      humidity: 60,
      windSpeed: 10,
      cloudCover: 30,
      code: 1,
      label: 'Mainly Clear',
      icon: '🌤️',
      photography: 'good-light',
    };
  }
}

/**
 * Get photography-specific weather advice
 */
export function getWeatherAdvice(weather) {
  const advice = {
    'harsh-light': {
      tip: 'Strong shadows. Seek shaded areas or use them creatively for dramatic contrast.',
      isoAdjust: -1,
      bestFor: ['Brutalist', 'Minimalist'],
    },
    'good-light': {
      tip: 'Excellent natural light. Great for balanced exposures.',
      isoAdjust: 0,
      bestFor: ['Golden Hour', 'Verdant', 'Minimalist'],
    },
    'diffused-light': {
      tip: 'Clouds act as a giant softbox. Perfect for portraits and textures.',
      isoAdjust: 1,
      bestFor: ['Moody', 'Minimalist', 'Verdant'],
    },
    'soft-light': {
      tip: 'Flat, even lighting. Push contrast in post or embrace the muted tones.',
      isoAdjust: 1,
      bestFor: ['Minimalist', 'Moody'],
    },
    'atmospheric': {
      tip: 'Fog and mist create ethereal depth. Shoot into the light for glow effects.',
      isoAdjust: 1,
      bestFor: ['Moody', 'Cyberpunk'],
    },
    'moody': {
      tip: 'Wet surfaces reflect light beautifully. Use puddles for mirror shots.',
      isoAdjust: 2,
      bestFor: ['Moody', 'Cyberpunk', 'Brutalist'],
    },
    'dramatic': {
      tip: 'Lightning and storm clouds create once-in-a-lifetime shots. Stay safe!',
      isoAdjust: 2,
      bestFor: ['Moody', 'Cyberpunk'],
    },
    'challenging': {
      tip: 'Heavy precipitation. Protect your gear and use weather-sealed equipment.',
      isoAdjust: 3,
      bestFor: ['Moody'],
    },
  };

  return advice[weather.photography] || advice['good-light'];
}
