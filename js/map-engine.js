import { GOOGLE_MAPS_API_KEY } from './config.js';
import { sanitize } from './utils.js';

let googleMap = null;
let googleMarkers = [];
let googlePolyline = null;
let userMarker = null;

const MARKER_COLORS = {
  high: '#7c5cfc',
  medium: '#ffb347',
  low: '#ff4757',
};

/**
 * Initialize Google Maps exclusively
 */
export async function initMap(containerId, lat, lon) {
  if (googleMap) {
    googleMap.setCenter({ lat, lng: lon });
    return googleMap;
  }

  // Load Google Maps script if not present
  if (!window.google) {
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&v=beta`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  const { Map } = await google.maps.importLibrary("maps");
  
  googleMap = new Map(document.getElementById(containerId), {
    center: { lat, lng: lon },
    zoom: 15,
    mapId: 'LUMINA_DARK_MAP', // Requires cloud styling for the premium dark look
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      { "elementType": "geometry", "stylers": [{ "color": "#1d1d2b" }] },
      { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
      { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1d1d2b" }] },
      { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#333748" }] },
      { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#64b5f6" }] },
      { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#2c2c3d" }] },
      { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0e0e1a" }] }
    ]
  });

  return googleMap;
}

/**
 * Set the user's location marker
 */
export function setUserMarker(lat, lon) {
  if (!googleMap) return;

  if (userMarker) userMarker.setMap(null);

  userMarker = new google.maps.Marker({
    position: { lat, lng: lon },
    map: googleMap,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: "#00d4aa",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    },
    title: "Your Location",
    zIndex: 1000
  });
}

/**
 * Fetch POIs using Google Places API
 */
export async function fetchRealPOIs(lat, lon, radius = 2000) {
  if (!window.google) return [];

  const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary("places");

  const request = {
    fields: ["displayName", "location", "types", "rating", "userRatingCount"],
    locationRestriction: {
      center: { lat, lng: lon },
      radius: radius,
    },
    includedPrimaryTypes: ["tourist_attraction", "park", "museum", "art_gallery", "point_of_interest"],
    maxResultCount: 20,
    rankPreference: SearchNearbyRankPreference.POPULARITY,
  };

  const { places } = await Place.searchNearby(request);

  return (places || []).map(p => ({
    id: p.id,
    name: p.displayName,
    lat: p.location.lat(),
    lon: p.location.lng(),
    tags: p.types || [],
    source: 'google',
    description: `Highly rated spot (${p.rating || 'N/A'}★) perfect for your aesthetic.`,
    vibeProfile: {
      warmth: 0.5,
      contrast: 0.6,
      texture: 0.4,
      color: 0.5,
      geometry: 0.5
    },
    spectralType: 'urban', // Default for Places
    category: 'architecture' // Default
  }));
}

/**
 * Add scouted location markers to the map
 */
export function addLocationMarkers(locations, onClickCallback) {
  googleMarkers.forEach(m => m.setMap(null));
  googleMarkers = [];

  const bounds = new google.maps.LatLngBounds();
  if (userMarker) bounds.extend(userMarker.getPosition());

  locations.forEach((loc, idx) => {
    const color = loc.vibeMatch >= 80 ? MARKER_COLORS.high
      : loc.vibeMatch >= 60 ? MARKER_COLORS.medium
      : MARKER_COLORS.low;

    const marker = new google.maps.Marker({
      position: { lat: loc.lat, lng: loc.lon },
      map: googleMap,
      icon: {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
        fillColor: color,
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: "#ffffff",
        scale: 1.5,
        anchor: new google.maps.Point(12, 22),
      },
      title: loc.name,
      zIndex: 100 - idx
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="font-family:Inter,sans-serif;padding:8px;color:#000;">
          <div style="font-weight:700;margin-bottom:4px;">${sanitize(loc.name)}</div>
          <div style="font-size:12px;color:#666;">${loc.vibeMatch}% Match</div>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(googleMap, marker);
      if (onClickCallback) onClickCallback(loc, idx);
    });

    googleMarkers.push(marker);
    bounds.extend(marker.getPosition());
  });

  if (locations.length > 0) {
    googleMap.fitBounds(bounds);
  }
}

/**
 * Draw a real street-aware route using Google Directions API
 */
export async function drawRoute(locations) {
  if (!googleMap || locations.length < 2) return;

  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer({
    map: googleMap,
    suppressMarkers: true,
    polylineOptions: {
      strokeColor: MARKER_COLORS.high,
      strokeOpacity: 0.8,
      strokeWeight: 5,
    }
  });

  const origin = { lat: locations[0].lat, lng: locations[0].lon };
  const destination = { lat: locations[locations.length - 1].lat, lng: locations[locations.length - 1].lon };
  const waypoints = locations.slice(1, -1).map(loc => ({
    location: { lat: loc.lat, lng: loc.lon },
    stopover: true
  }));

  directionsService.route({
    origin,
    destination,
    waypoints,
    travelMode: google.maps.TravelMode.WALKING,
  }, (response, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(response);
    } else {
      console.warn('Directions request failed:', status);
    }
  });
}

/**
 * Focus on a specific location
 */
export function focusLocation(lat, lon) {
  if (googleMap) {
    googleMap.panTo({ lat, lng: lon });
    googleMap.setZoom(17);
  }
}

/**
 * Clear all markers
 */
export function clearMarkers() {
  googleMarkers.forEach(m => m.setMap(null));
  googleMarkers = [];
  if (googlePolyline) {
    googlePolyline.setMap(null);
    googlePolyline = null;
  }
}
