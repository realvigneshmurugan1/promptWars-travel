import { describe, it, expect, vi } from 'vitest';
import { sanitize, formatPercent } from '../js/utils.js';
import { generateCoaching, getSolarPhase } from '../js/coach.js';
import { getSpectralForLocation } from '../js/spectral.js';
import { getWeatherAdvice } from '../js/weather.js';
import { scoutLocations, haversineDistance, formatDistance } from '../js/scout.js';

describe('Security Utils', () => {
  it('should sanitize HTML tags to prevent XSS', () => {
    const malicious = '<script>alert("xss")</script><b>Hello</b>';
    const clean = sanitize(malicious);
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('Hello');
  });

  it('should handle empty input in sanitize', () => {
    expect(sanitize('')).toBe('');
  });
});

describe('Coaching Logic', () => {
  it('should generate valid coaching data', () => {
    const mockLoc = { name: 'Taj Mahal', category: 'heritage', id: '1' };
    const mockWeather = { temp: 25, cloudCover: 20, icon: '☀️', photography: 'good-light' };
    const mockDNA = { aesthetic: 'Moody', metrics: { contrast: 0.7 } };
    
    const coaching = generateCoaching(mockLoc, mockWeather, mockDNA);
    expect(coaching.location).toBe('Taj Mahal');
    expect(coaching.settings).toHaveProperty('iso');
    expect(coaching.camera_coach_config.metadata.location_id).toBe('1');
  });

  it('should handle night-time coaching solar phases', () => {
    const solar = getSolarPhase(23); // 11 PM
    expect(solar.phase).toBe('night');
  });

  it('should identify golden hour correctly', () => {
    const solar = getSolarPhase(17); // 5 PM
    expect(solar.phase).toBe('golden-evening');
  });
});

describe('Spectral Module', () => {
  it('should generate atmospheric narratives for locations', async () => {
    const location = { name: 'Lotus Temple', category: 'sacred' };
    const result = await getSpectralForLocation(location);
    expect(result.title).toContain('Gemini AI');
    expect(result.narrative).toBeDefined();
    expect(result.narrative.length).toBeGreaterThan(20);
  });
});

describe('Weather Module', () => {
  it('should provide specific photography advice for harsh light', () => {
    const advice = getWeatherAdvice({ photography: 'harsh-light' });
    expect(advice.tip).toContain('shadows');
    expect(advice.isoAdjust).toBe(-1);
  });

  it('should provide advice for moody/rainy conditions', () => {
    const advice = getWeatherAdvice({ photography: 'moody' });
    expect(advice.tip).toContain('reflect');
    expect(advice.isoAdjust).toBe(2);
  });

  it('should handle default weather fallback advice', () => {
    const advice = getWeatherAdvice({ photography: 'non-existent' });
    expect(advice).toHaveProperty('tip');
    expect(advice.isoAdjust).toBe(0);
  });
});

describe('Scout & Geometry', () => {
  it('should calculate haversine distance correctly', () => {
    // Distance between two points in Bangalore
    const dist = haversineDistance(12.9716, 77.5946, 12.9352, 77.5359);
    expect(dist).toBeGreaterThan(7000);
    expect(dist).toBeLessThan(10000);
  });

  it('should format distances appropriately', () => {
    expect(formatDistance(500)).toBe('500m');
    expect(formatDistance(1500)).toBe('1.5km');
  });

  it('should scout and rank locations by vibe match', () => {
    const mockDNA = { aesthetic: 'Minimalist', metrics: { saturation: 0.2, contrast: 0.3, edgeDensity: 0.4, simplicity: 0.8, warmth: 0.5 } };
    const result = scoutLocations(12.9716, 77.5946, mockDNA);
    expect(result.locations.length).toBeGreaterThan(0);
    expect(result.topPick).toBeDefined();
    expect(result.locations[0].vibeMatch).toBeGreaterThanOrEqual(result.locations[1].vibeMatch);
  });
});

describe('Data Formatting', () => {
  it('should format percentages correctly', () => {
    expect(formatPercent(0.854)).toBe('85%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('should handle zero distance in formatting', () => {
    expect(formatDistance(0)).toBe('0m');
  });
});

describe('Advanced Coach', () => {
  it('should trigger wind warnings in weather impact', () => {
    const mockWeather = { cloudCover: 20, windSpeed: 25 }; // High wind
    const impact = generateCoaching({ name: 'X' }, mockWeather, { metrics: {} }).weatherImpact;
    expect(impact.level).toBe('warning');
    expect(impact.text).toContain('High wind');
  });
});
