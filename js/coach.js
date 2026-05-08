/**
 * Photography Coach Module — Camera settings, composition tips, and hero shots
 */

/**
 * Calculate solar position for optimal timing
 */
function getSolarPhase(hour) {
  if (hour >= 5 && hour < 7) return { phase: 'golden-morning', label: 'Golden Hour (AM)', quality: 'exceptional' };
  if (hour >= 7 && hour < 9) return { phase: 'morning', label: 'Morning Light', quality: 'great' };
  if (hour >= 9 && hour < 11) return { phase: 'mid-morning', label: 'Mid-Morning', quality: 'good' };
  if (hour >= 11 && hour < 14) return { phase: 'midday', label: 'Harsh Midday', quality: 'challenging' };
  if (hour >= 14 && hour < 16) return { phase: 'afternoon', label: 'Afternoon', quality: 'good' };
  if (hour >= 16 && hour < 18) return { phase: 'golden-evening', label: 'Golden Hour (PM)', quality: 'exceptional' };
  if (hour >= 18 && hour < 20) return { phase: 'blue-hour', label: 'Blue Hour', quality: 'exceptional' };
  return { phase: 'night', label: 'Night', quality: 'specialized' };
}

/**
 * Generate camera settings based on conditions
 */
function getCameraSettings(weather, solarPhase, aesthetic) {
  const baseSettings = {
    'golden-morning': { iso: 200, aperture: 'f/2.8', shutter: '1/500', wb: '5500K' },
    'morning': { iso: 100, aperture: 'f/5.6', shutter: '1/1000', wb: '5200K' },
    'mid-morning': { iso: 100, aperture: 'f/8', shutter: '1/1000', wb: '5000K' },
    'midday': { iso: 100, aperture: 'f/11', shutter: '1/2000', wb: '5500K' },
    'afternoon': { iso: 100, aperture: 'f/8', shutter: '1/1000', wb: '5200K' },
    'golden-evening': { iso: 200, aperture: 'f/2.8', shutter: '1/250', wb: '5800K' },
    'blue-hour': { iso: 800, aperture: 'f/2.8', shutter: '1/60', wb: '7000K' },
    'night': { iso: 1600, aperture: 'f/1.8', shutter: '1/30', wb: '4000K' },
  };

  const settings = { ...baseSettings[solarPhase.phase] };

  // Adjust for weather
  if (weather.cloudCover > 70) {
    settings.iso = Math.min(3200, settings.iso * 2);
    settings.shutter = adjustShutter(settings.shutter, 1);
  }

  // Adjust for aesthetic style
  const aestheticMods = {
    'Moody': { aperture: 'f/1.8', note: 'Shallow depth for atmospheric isolation' },
    'Brutalist': { aperture: 'f/8', note: 'Deep depth for sharp geometric detail' },
    'Cyberpunk': { iso: 1600, shutter: '1/30', note: 'Slow shutter for neon motion blur' },
    'Golden Hour': { aperture: 'f/2.8', note: 'Wide open for soft bokeh and light flares' },
    'Minimalist': { aperture: 'f/5.6', note: 'Balanced depth for clean compositions' },
    'Verdant': { aperture: 'f/4', note: 'Moderate depth to separate foliage layers' },
  };

  const mod = aestheticMods[aesthetic] || {};
  Object.assign(settings, mod);

  return settings;
}

function adjustShutter(shutter, stops) {
  const values = ['1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8'];
  const idx = values.indexOf(shutter);
  if (idx === -1) return shutter;
  return values[Math.min(values.length - 1, idx + stops)] || shutter;
}

/**
 * Generate composition tips based on location category
 */
function getCompositionTips(location) {
  const tips = {
    heritage: [
      'Use the pillared corridors as natural leading lines toward the main structure.',
      'Frame the ornate carvings with negative space to emphasize detail.',
      'Shoot from a low angle to exaggerate the height and grandeur of the architecture.',
    ],
    landscape: [
      'Apply the rule of thirds — place the horizon on the upper or lower third line.',
      'Use foreground elements (rocks, vegetation) to create depth and scale.',
      'Wait for a "moment" — a bird, a wave, a figure — to add narrative to the scene.',
    ],
    street: [
      'Pre-compose your frame and wait for subjects to walk into position.',
      'Use natural frames — doorways, windows, arches — to isolate your subject.',
      'Shoot during transitions: rain stopping, market opening, lights turning on.',
    ],
    architecture: [
      'Use vertical framing to emphasize height and structural lines.',
      'Look for symmetry — even slight asymmetry creates visual tension.',
      'Include a human figure for scale and narrative context.',
    ],
  };

  const category = location.category || 'street';
  const available = tips[category] || tips.street;
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Generate complete coaching data for a location
 */
export function generateCoaching(location, weather, visualDNA) {
  const now = new Date();
  const hour = now.getHours();
  const solar = getSolarPhase(hour);
  const settings = getCameraSettings(weather, solar, visualDNA.aesthetic);
  const composition = getCompositionTips(location);

  // Determine optimal time
  const bestTimeParts = (location.bestTime || '07:00-08:00').split('-');
  const bestStart = parseInt(bestTimeParts[0]);
  const isOptimalNow = hour >= bestStart && hour <= bestStart + 2;

  return {
    location: location.name,
    currentLight: solar,
    settings,
    composition,
    heroShot: location.heroShot || 'Find the decisive moment where light, subject, and geometry align.',
    optimalTime: location.bestTime,
    isOptimalNow,
    weatherImpact: getWeatherImpact(weather),
    camera_coach_config: generateCameraCoachConfig(location, settings, composition, visualDNA)
  };
}

/**
 * Generate a structured camera_coach_config for external device syncing or advanced manual control
 */
function generateCameraCoachConfig(location, settings, composition, visualDNA) {
  return {
    version: "1.0",
    metadata: {
      location_id: location.id,
      aesthetic_signature: visualDNA.aesthetic,
      timestamp: new Date().toISOString()
    },
    exposure_logic: {
      target_iso: settings.iso,
      target_aperture: settings.aperture,
      target_shutter: settings.shutter,
      white_balance: settings.wb,
      metering_mode: visualDNA.aesthetic === 'Brutalist' ? 'Spot' : 'Matrix',
      dynamic_range_optimization: visualDNA.aesthetic === 'Moody' ? 'Low' : 'Auto'
    },
    composition_rules: {
      primary_rule: composition.includes('third') ? 'Rule of Thirds' : 'Leading Lines',
      grid_type: "3x3",
      lens_recommendation: visualDNA.aesthetic === 'Cyberpunk' ? '35mm Prime' : '24-70mm Zoom'
    },
    processing_signature: {
      contrast: visualDNA.metrics.contrast > 0.6 ? "+2" : "0",
      saturation: visualDNA.metrics.saturation > 0.6 ? "+1" : "-1",
      sharpness: visualDNA.metrics.edgeDensity > 0.6 ? "+1" : "0"
    }
  };
}

function getWeatherImpact(weather) {
  if (weather.cloudCover > 80) return { level: 'positive', text: 'Overcast sky acts as a natural softbox — ideal for even lighting.' };
  if (weather.cloudCover > 50) return { level: 'neutral', text: 'Partial clouds create dynamic light — watch for dramatic breaks.' };
  if (weather.windSpeed > 20) return { level: 'warning', text: 'High wind — use faster shutter speeds and brace your camera.' };
  return { level: 'positive', text: 'Clear conditions with strong directional light.' };
}

export { getSolarPhase };
