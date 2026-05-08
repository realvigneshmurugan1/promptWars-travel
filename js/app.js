/**
 * Lumina App — Main Orchestrator
 * Wires together all modules: Visual DNA, Scout, Map, Coach, Weather, Spectral
 */

import { extractVisualDNA } from './visual-dna.js';
import { scoutLocations, generateScoutAlert, checkTraffic } from './scout.js';
import { fetchWeather, getWeatherAdvice } from './weather.js';
import { generateCoaching } from './coach.js';
import { getSpectralForLocation } from './spectral.js';
import { initMap, setUserMarker, addLocationMarkers, drawRoute, focusLocation, fetchRealPOIs } from './map-engine.js';
import { sanitize } from './utils.js';

// ============ STATE ============
const state = {
  visualDNA: null,
  userLocation: null,
  weather: null,
  traffic: null,
  scoutResult: null,
  selectedLocation: null,
};

// ============ DOM REFS ============
const $ = (id) => document.getElementById(id);

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  // Loading screen
  setTimeout(() => {
    $('loading-screen').classList.add('fade-out');
    setTimeout(() => {
      $('loading-screen').classList.add('hidden');
      $('app').classList.remove('hidden');
    }, 600);
  }, 2200);

  setupNavigation();
  setupUpload();
  requestGeolocation();
});

// ============ NAVIGATION ============
function setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const section = tab.dataset.section;
      switchSection(section);
    });
  });
}

function switchSection(sectionId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  const tab = document.querySelector(`[data-section="${sectionId}"]`);
  const section = $(sectionId);
  if (tab) tab.classList.add('active');
  if (section) section.classList.add('active');

  // Init map when scout tab is opened
  if (sectionId === 'scout-map' && state.userLocation) {
    setTimeout(() => {
      const { lat, lon } = state.userLocation;
      initMap('map', lat, lon);
      setUserMarker(lat, lon);
      if (state.scoutResult) {
        addLocationMarkers(state.scoutResult.locations, onLocationSelect);
      }
    }, 100);
  }
}

// ============ GEOLOCATION ============
function requestGeolocation() {
  if (!navigator.geolocation) {
    updateGPSStatus(false, 'GPS unavailable');
    useDefaultLocation();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      updateGPSStatus(true, `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      loadWeather();
    },
    (err) => {
      console.warn('Geolocation error:', err);
      updateGPSStatus(false, 'Using default');
      useDefaultLocation();
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function useDefaultLocation() {
  // Default to Chennai
  state.userLocation = { lat: 13.0827, lon: 80.2707 };
  loadWeather();
}

function updateGPSStatus(active, text) {
  const dot = $('gps-status');
  const label = $('gps-text');
  if (active) dot.classList.add('active');
  else dot.classList.remove('active');
  label.textContent = text;
}

// ============ WEATHER & LOCATION ============
async function loadWeather() {
  const { lat, lon } = state.userLocation;
  state.weather = await fetchWeather(lat, lon);
  $('weather-temp').textContent = `${state.weather.temp}°`;
  $('weather-badge').querySelector('.weather-icon').textContent = state.weather.icon;

  // Use Google Geocoding to get a nice address
  if (window.google) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng: lon } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const address = results[0].formatted_address.split(',')[0];
        $('gps-text').textContent = address;
      }
    });
  }
}

// ============ PHOTO UPLOAD ============
function setupUpload() {
  const zone = $('upload-zone');
  const input = $('photo-input');
  const browseBtn = $('browse-btn');

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    input.click();
  });

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) handlePhotos(files);
  });

  input.addEventListener('change', () => {
    const files = Array.from(input.files);
    if (files.length > 0) handlePhotos(files);
  });
}

async function handlePhotos(files) {
  const zone = $('upload-zone');
  const preview = $('upload-preview');

  zone.classList.add('has-photos');
  preview.innerHTML = '';

  // Show thumbnails
  for (const file of files) {
    const thumb = document.createElement('div');
    thumb.className = 'preview-thumb';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    thumb.appendChild(img);
    preview.appendChild(thumb);
  }

  // Add analyze button
  const analyzeBtn = document.createElement('button');
  analyzeBtn.className = 'btn btn-primary';
  analyzeBtn.innerHTML = '<span>Analyze Visual DNA</span>';
  analyzeBtn.style.marginTop = '16px';
  analyzeBtn.style.gridColumn = '1 / -1';
  analyzeBtn.addEventListener('click', () => runAnalysis(files));
  preview.appendChild(analyzeBtn);
}

async function runAnalysis(files) {
  const resultsEl = $('dna-results');
  resultsEl.classList.remove('hidden');
  $('profile-aesthetic').textContent = 'Analyzing...';
  $('profile-description').textContent = `Decoding your visual signature from ${files.length} photos`;

  try {
    state.visualDNA = await extractVisualDNA(files);
    renderDNAResults(state.visualDNA);
  } catch (err) {
    console.error('Analysis failed:', err);
    $('profile-aesthetic').textContent = 'Analysis Error';
    $('profile-description').textContent = 'Please try different photos.';
  }
}

function renderDNAResults(dna) {
  $('profile-aesthetic').textContent = `${dna.icon} ${dna.aesthetic}`;
  $('profile-description').textContent = dna.description;
  $('profile-confidence').querySelector('.score-value').textContent = `${dna.confidence}%`;

  // Visual DNA panel — palette + traits
  const visualPanel = $('profile-visual-dna');
  visualPanel.innerHTML = '';

  // Color palette
  const paletteDiv = document.createElement('div');
  paletteDiv.className = 'dna-color-palette';
  dna.palette.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'dna-color';
    swatch.style.background = color;
    swatch.title = color;
    paletteDiv.appendChild(swatch);
  });
  visualPanel.appendChild(paletteDiv);

  // Traits
  dna.traits.forEach(trait => {
    const tag = document.createElement('span');
    tag.className = 'dna-trait';
    tag.textContent = trait;
    visualPanel.appendChild(tag);
  });

  // Metrics
  const metricsEl = $('dna-metrics');
  metricsEl.innerHTML = '';

  const metricDefs = [
    { key: 'brightness', label: 'Brightness', color: '#ffb347' },
    { key: 'contrast', label: 'Contrast', color: '#7c5cfc' },
    { key: 'saturation', label: 'Saturation', color: '#ff6b9d' },
    { key: 'warmth', label: 'Warmth', color: '#ff8c42' },
    { key: 'edgeDensity', label: 'Texture', color: '#00d4aa' },
    { key: 'simplicity', label: 'Simplicity', color: '#64b5f6' },
  ];

  metricDefs.forEach(({ key, label, color }) => {
    const val = Math.round(dna.metrics[key] * 100);
    const card = document.createElement('div');
    card.className = 'metric-card';
    card.innerHTML = `
      <div class="metric-label">${label}</div>
      <div class="metric-value" style="color:${color}">${val}%</div>
      <div class="metric-bar">
        <div class="metric-bar-fill" style="width:0%;background:${color}"></div>
      </div>
    `;
    metricsEl.appendChild(card);

    // Animate bar fill
    requestAnimationFrame(() => {
      setTimeout(() => {
        card.querySelector('.metric-bar-fill').style.width = `${val}%`;
      }, 100);
    });
  });

  // Setup scout button
  $('start-scout-btn').addEventListener('click', launchScout);
}

// ============ SCOUT ============
async function launchScout() {
  if (!state.visualDNA || !state.userLocation) return;

  switchSection('scout-map');

  const { lat, lon } = state.userLocation;
  const alertEl = $('scout-alert');
  alertEl.querySelector('.alert-text').textContent = 'Scanning real-world POIs near your location...';

  // Initialize map
  setTimeout(async () => {
    initMap('map', lat, lon);
    setUserMarker(lat, lon);

    // Fetch REAL POIs using Google Places API
    let realPOIs = [];
    try {
      alertEl.querySelector('.alert-text').textContent = 'Querying Google Places for nearby photogenic spots...';
      realPOIs = await fetchRealPOIs(lat, lon, 2500);
      
      // Real-time traffic check to top pick
      if (realPOIs.length > 0) {
        state.traffic = await checkTraffic(lat, lon, realPOIs[0].lat, realPOIs[0].lon);
        if (state.traffic.level !== 'low') {
          alertEl.querySelector('.alert-text').textContent += ' ' + state.traffic.text;
        }
      }
    } catch (e) {
      console.warn('Scout data fetch failed, using curated data:', e);
    }

    // Merge with curated locations (curated data as fallback/enrichment)
    state.scoutResult = scoutLocations(lat, lon, state.visualDNA);

    // If we got real POIs, add them (with vibe scoring)
    if (realPOIs.length > 0) {
      const scoredRealPOIs = realPOIs.map(poi => {
        const dist = haversineCalc(lat, lon, poi.lat, poi.lon);
        return {
          ...poi,
          distance: dist,
          distanceFormatted: dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`,
          vibeMatch: calculateQuickVibeMatch(state.visualDNA, poi),
        };
      });

      // Combine: prioritize real POIs, backfill with curated
      const allLocations = [...scoredRealPOIs, ...state.scoutResult.locations];
      allLocations.sort((a, b) => b.vibeMatch - a.vibeMatch);
      state.scoutResult.locations = allLocations.slice(0, 8); // Top 8
      state.scoutResult.topPick = state.scoutResult.locations[0];
    }

    // Update alert
    const alert = generateScoutAlert(state.scoutResult, state.visualDNA);
    alertEl.querySelector('.alert-text').textContent = alert;

    // Render location cards
    renderLocationCards(state.scoutResult.locations);

    // Add markers to map
    addLocationMarkers(state.scoutResult.locations, onLocationSelect);

    // Render route & director
    renderRoute(state.scoutResult.locations);
    renderDirector(state.scoutResult.locations);
  }, 200);
}

function haversineCalc(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateQuickVibeMatch(visualDNA, poi) {
  const vibe = poi.vibeProfile;
  const m = visualDNA.metrics;
  const userProfile = {
    warmth: m.warmth, contrast: m.contrast, texture: m.edgeDensity,
    color: m.saturation, geometry: m.edgeDensity * 0.5 + (1 - m.simplicity) * 0.5,
  };
  let total = 0, count = 0;
  for (const key of Object.keys(vibe)) {
    total += 1 - Math.abs((userProfile[key] || 0.5) - vibe[key]);
    count++;
  }
  return Math.min(99, Math.round((total / count) * 100));
}

// ============ RENDER LOCATION CARDS ============
function renderLocationCards(locations) {
  const container = $('scout-locations');
  container.innerHTML = '';

  locations.forEach((loc, idx) => {
    const card = document.createElement('div');
    card.className = 'location-card';
    card.dataset.index = idx;
    card.innerHTML = `
      <div class="location-card-header">
        <span class="location-name">${sanitize(loc.name)}</span>
        <span class="location-distance">${sanitize(loc.distanceFormatted)}</span>
      </div>
      <div class="location-tags">
        ${loc.tags.slice(0, 3).map(t => `<span class="location-tag">${sanitize(t)}</span>`).join('')}
        ${loc.source === 'osm' ? '<span class="location-tag" style="background:rgba(0,212,170,0.15);color:#00d4aa;">LIVE</span>' : ''}
      </div>
      <div class="location-vibe">
        <div class="vibe-bar"><div class="vibe-fill" style="width:${loc.vibeMatch}%"></div></div>
        <span class="vibe-score">${loc.vibeMatch}%</span>
      </div>
      <div class="location-desc">${sanitize(loc.description)}</div>
      <div class="location-actions">
        <button class="btn btn-ghost btn-spectral" data-index="${idx}">👻 Spectral</button>
        <button class="btn btn-ghost btn-focus" data-index="${idx}">📍 Focus</button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn')) return;
      onLocationSelect(loc, idx);
    });

    card.querySelector('.btn-spectral').addEventListener('click', () => showSpectral(loc));
    card.querySelector('.btn-focus').addEventListener('click', () => focusLocation(loc.lat, loc.lon));

    container.appendChild(card);
  });
}

function onLocationSelect(loc, idx) {
  state.selectedLocation = loc;

  // Highlight card
  document.querySelectorAll('.location-card').forEach(c => c.classList.remove('active'));
  const card = document.querySelector(`.location-card[data-index="${idx}"]`);
  if (card) {
    card.classList.add('active');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  focusLocation(loc.lat, loc.lon);
}

// ============ SPECTRAL OVERLAY ============
async function showSpectral(location) {
  const overlay = $('spectral-overlay');
  const spectral = await getSpectralForLocation(location);

  $('spectral-title').textContent = `${spectral.title} — ${sanitize(location.name)}`;
  $('spectral-body').innerHTML = spectral.narrative.split('\n\n').map(p => `<p>${sanitize(p)}</p>`).join('');

  overlay.classList.remove('hidden');

  $('spectral-close').onclick = () => overlay.classList.add('hidden');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
}

// ============ ROUTE ============
function renderRoute(locations) {
  const timeline = $('route-timeline');
  const summary = $('summary-stats');
  timeline.innerHTML = '';

  const sorted = [...locations].sort((a, b) => {
    const timeA = parseInt((a.bestTime || '12:00').split(':')[0]);
    const timeB = parseInt((b.bestTime || '12:00').split(':')[0]);
    return timeA - timeB;
  });

  let totalDist = 0;
  sorted.forEach((loc, idx) => {
    if (idx > 0) {
      totalDist += haversineCalc(sorted[idx - 1].lat, sorted[idx - 1].lon, loc.lat, loc.lon);
    }

    const step = document.createElement('div');
    step.className = 'route-step';
    step.innerHTML = `
      <div class="route-step-header">
        <span class="route-step-name">${sanitize(loc.name)}</span>
        <span class="route-step-time">${sanitize(loc.bestTime || '—')}</span>
      </div>
      <div class="route-step-desc">${sanitize(loc.description)}</div>
      <div class="route-step-meta">
        <span class="route-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg>
          ${sanitize(loc.distanceFormatted)}
        </span>
        <span class="route-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${sanitize(loc.bestTime || 'Flexible')}
        </span>
        <span class="route-meta-item" style="color:${loc.vibeMatch >= 80 ? '#00d4aa' : loc.vibeMatch >= 60 ? '#7c5cfc' : '#ff6b9d'}">
          ◈ ${loc.vibeMatch}% match
        </span>
      </div>
    `;
    timeline.appendChild(step);
  });

  // Summary
  const avgVibe = Math.round(sorted.reduce((s, l) => s + l.vibeMatch, 0) / sorted.length);
  
  // Traffic-aware walking time
  let trafficDelay = 0;
  if (state.traffic) trafficDelay = state.traffic.delay;
  const walkTime = Math.round(totalDist / 80) + trafficDelay;

  summary.innerHTML = `
    <div class="stat-item"><span class="stat-label">Total Stops</span><span class="stat-value">${sorted.length}</span></div>
    <div class="stat-item"><span class="stat-label">Total Distance</span><span class="stat-value">${totalDist < 1000 ? Math.round(totalDist) + 'm' : (totalDist / 1000).toFixed(1) + 'km'}</span></div>
    <div class="stat-item"><span class="stat-label">Est. Time</span><span class="stat-value">${walkTime} min ${trafficDelay > 0 ? `<span style="color:#ff4757;font-size:10px;">(+${trafficDelay}m traffic)</span>` : ''}</span></div>
    <div class="stat-item"><span class="stat-label">Avg Vibe Match</span><span class="stat-value" style="color:#00d4aa">${avgVibe}%</span></div>
    <div class="stat-item"><span class="stat-label">Your Aesthetic</span><span class="stat-value" style="color:#7c5cfc">${state.visualDNA?.aesthetic || '—'}</span></div>
    <div class="stat-item"><span class="stat-label">Weather</span><span class="stat-value">${state.weather?.icon || ''} ${state.weather?.temp || '--'}°</span></div>
  `;

  // Draw route on map
  drawRoute(sorted);
}

// ============ DIRECTOR ============
function renderDirector(locations) {
  const layout = $('director-layout');
  layout.innerHTML = '';

  locations.slice(0, 4).forEach(loc => {
    const coaching = generateCoaching(loc, state.weather || { cloudCover: 30, windSpeed: 10 }, state.visualDNA);

    const card = document.createElement('div');
    card.className = 'director-card';
    card.innerHTML = `
      <div class="director-card-header">
        <div class="director-card-icon" style="background:rgba(124,92,252,0.15);">📷</div>
        <div>
          <div class="director-card-title">${sanitize(loc.name)}</div>
          <div class="director-card-sub">${sanitize(coaching.currentLight.label)} • ${sanitize(coaching.currentLight.quality)}</div>
        </div>
      </div>
      <div class="director-grid">
        <div class="director-item">
          <div class="director-item-label">ISO</div>
          <div class="director-item-value">${sanitize(coaching.settings.iso)}</div>
        </div>
        <div class="director-item">
          <div class="director-item-label">Aperture</div>
          <div class="director-item-value">${sanitize(coaching.settings.aperture)}</div>
        </div>
        <div class="director-item">
          <div class="director-item-label">Shutter</div>
          <div class="director-item-value">${sanitize(coaching.settings.shutter)}</div>
        </div>
        <div class="director-item">
          <div class="director-item-label">White Bal.</div>
          <div class="director-item-value">${sanitize(coaching.settings.wb)}</div>
        </div>
      </div>
      <div class="director-tip">
        <strong>🎯 Composition:</strong> ${sanitize(coaching.composition)}
      </div>
      <div class="director-hero">
        <strong>📸 The Hero Shot:</strong> ${sanitize(coaching.heroShot)}
      </div>
      <div class="director-config">
        <button class="btn btn-ghost btn-sm btn-copy-config" data-idx="${layout.children.length}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy Camera Config
        </button>
      </div>
      ${coaching.isOptimalNow ? '<div style="margin-top:12px;padding:8px 12px;border-radius:8px;background:rgba(0,212,170,0.15);font-size:12px;color:#00d4aa;font-weight:600;">⚡ OPTIMAL TIME — Shoot Now!</div>' : `<div style="margin-top:12px;font-size:12px;color:#55556a;">Best time: ${sanitize(coaching.optimalTime)}</div>`}
    `;

    card.querySelector('.btn-copy-config').onclick = () => {
      navigator.clipboard.writeText(JSON.stringify(coaching.camera_coach_config, null, 2));
      const btn = card.querySelector('.btn-copy-config');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>✅ Copied!</span>';
      setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    };

    layout.appendChild(card);
  });
}
