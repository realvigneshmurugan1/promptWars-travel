/**
 * Scout Module — Location discovery & vibe matching engine
 */

import locationData from '../data/locations.json';

/**
 * Calculate vibe match score between user's Visual DNA and a location
 */
function calculateVibeMatch(visualDNA, location) {
  const vibe = location.vibeProfile;
  const metrics = visualDNA.metrics;

  // Map user metrics to location vibe dimensions
  const userProfile = {
    warmth: metrics.warmth,
    contrast: metrics.contrast,
    texture: metrics.edgeDensity,
    color: metrics.saturation,
    geometry: metrics.edgeDensity * 0.5 + (1 - metrics.simplicity) * 0.5,
  };

  // Calculate weighted similarity
  let totalMatch = 0;
  let totalWeight = 0;
  const weights = { warmth: 1.2, contrast: 1.0, texture: 1.5, color: 1.3, geometry: 1.0 };

  for (const key of Object.keys(vibe)) {
    const diff = 1 - Math.abs(userProfile[key] - vibe[key]);
    const w = weights[key] || 1;
    totalMatch += diff * w;
    totalWeight += w;
  }

  // Bonus for tag alignment with aesthetic
  const aestheticTagMap = {
    'Golden Hour': ['golden-hour', 'warm', 'waterfront', 'vast'],
    'Brutalist': ['brutalist', 'geometric', 'concrete', 'minimal', 'viewpoint'],
    'Cyberpunk': ['neon', 'cyberpunk', 'night', 'crowd', 'market'],
    'Minimalist': ['minimal', 'white', 'clean', 'geometric', 'sacred'],
    'Moody': ['moody', 'alley', 'texture', 'atmospheric', 'street-art'],
    'Verdant': ['nature', 'green', 'peaceful', 'park'],
  };

  const relevantTags = aestheticTagMap[visualDNA.aesthetic] || [];
  const tagOverlap = location.tags.filter(t => relevantTags.includes(t)).length;
  const tagBonus = tagOverlap * 0.05;

  const rawScore = (totalMatch / totalWeight) + tagBonus;
  return Math.min(99, Math.round(rawScore * 100));
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format distance for display
 */
function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Get the best city match for given coordinates
 */
function findCity(lat, lon) {
  let bestCity = 'default';
  let bestDist = Infinity;

  for (const [key, city] of Object.entries(locationData.cities)) {
    if (key === 'default') continue;
    const dist = haversineDistance(lat, lon, city.lat, city.lon);
    if (dist < bestDist && dist < 50000) { // within 50km
      bestDist = dist;
      bestCity = key;
    }
  }

  return locationData.cities[bestCity];
}

/**
 * Scout nearby locations and rank by vibe match
 */
export function scoutLocations(userLat, userLon, visualDNA) {
  const city = findCity(userLat, userLon);
  const results = [];

  for (const loc of city.locations) {
    // For default locations, place them near the user
    let locLat = loc.lat || userLat;
    let locLon = loc.lon || userLon;

    if (loc.lat === 0 && loc.lon === 0) {
      // Generate positions around the user (200m to 2km)
      const angle = Math.random() * Math.PI * 2;
      const dist = 200 + Math.random() * 1800;
      locLat = userLat + (dist / 111000) * Math.cos(angle);
      locLon = userLon + (dist / (111000 * Math.cos(userLat * Math.PI / 180))) * Math.sin(angle);
    }

    const distance = haversineDistance(userLat, userLon, locLat, locLon);
    const vibeMatch = calculateVibeMatch(visualDNA, loc);

    results.push({
      ...loc,
      lat: locLat,
      lon: locLon,
      distance,
      distanceFormatted: formatDistance(distance),
      vibeMatch,
    });
  }

  // Sort by vibe match (descending)
  results.sort((a, b) => b.vibeMatch - a.vibeMatch);

  return {
    cityName: city.name,
    locations: results,
    topPick: results[0],
  };
}

/**
 * Generate a scout alert message for the top location
 */
export function generateScoutAlert(scoutResult, visualDNA) {
  const top = scoutResult.topPick;
  if (!top) return 'No locations found nearby.';

  const direction = getCardinalDirection(top.lat, top.lon);
  return `Move ${top.distanceFormatted} ${direction} for a ${top.vibeMatch}% vibe match. "${top.name}" optimizes your ${visualDNA.aesthetic} style with ${top.tags.slice(0, 2).join(' & ')} elements.`;
}

/**
 * Get approximate cardinal direction (simplified)
 */
function getCardinalDirection(lat, lon) {
  // This is a simplified version — just returns a plausible direction
  const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  const idx = Math.floor(Math.random() * directions.length);
  return directions[idx];
}

/**
 * Check real-time traffic status using Google Distance Matrix API
 */
export async function checkTraffic(userLat, userLon, destLat, destLon) {
  if (!window.google) return { level: 'low', delay: 0, text: 'Traffic clear.' };

  return new Promise((resolve) => {
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [{ lat: userLat, lng: userLon }],
      destinations: [{ lat: destLat, lng: destLon }],
      travelMode: google.maps.TravelMode.WALKING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: 'bestguess'
      }
    }, (response, status) => {
      if (status !== 'OK') {
        resolve({ level: 'low', delay: 0, text: 'Traffic status unavailable.' });
        return;
      }

      const element = response.rows[0].elements[0];
      const duration = element.duration.value / 60; // Base duration in mins
      const durationWithTraffic = element.duration_in_traffic ? element.duration_in_traffic.value / 60 : duration;
      const delay = Math.max(0, Math.round(durationWithTraffic - duration));

      let level = 'low';
      if (delay > 10) level = 'heavy';
      else if (delay > 3) level = 'moderate';

      resolve({
        level,
        delay,
        text: level === 'heavy' ? 'Heavy traffic delays detected.' : level === 'moderate' ? 'Moderate traffic present.' : 'Traffic is light.',
        distance: element.distance.text,
        duration: element.duration.text
      });
    });
  });
}

export { haversineDistance, formatDistance };
