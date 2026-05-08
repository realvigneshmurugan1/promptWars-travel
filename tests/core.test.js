import { describe, it, expect } from 'vitest';
import { sanitize, formatPercent } from '../js/utils.js';
import { generateCoaching, getSolarPhase } from '../js/coach.js';

describe('Utils Module', () => {
  it('should sanitize HTML strings to prevent XSS', () => {
    const input = '<img src=x onerror=alert(1)>';
    const output = sanitize(input);
    expect(output).not.toContain('<img');
    expect(output).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('should format numbers as percentages', () => {
    expect(formatPercent(0.85)).toBe('85%');
    expect(formatPercent(0.5)).toBe('50%');
  });
});

describe('Coach Module', () => {
  it('should return correct solar phase for morning', () => {
    const solar = getSolarPhase(8);
    expect(solar.phase).toBe('morning');
    expect(solar.label).toContain('Morning');
  });

  it('should generate valid coaching data', () => {
    const mockLoc = { name: 'Taj Mahal', category: 'heritage', id: '1' };
    const mockWeather = { temp: 25, cloudCover: 20, icon: '☀️' };
    const mockDNA = { aesthetic: 'Moody', metrics: { contrast: 0.7 } };
    
    const coaching = generateCoaching(mockLoc, mockWeather, mockDNA);
    expect(coaching.location).toBe('Taj Mahal');
    expect(coaching.settings).toHaveProperty('iso');
    expect(coaching.camera_coach_config.metadata.location_id).toBe('1');
  });
});
