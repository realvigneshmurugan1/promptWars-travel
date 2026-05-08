/**
 * Lumina — Google API Configuration
 */

// Google Maps Platform Key (Maps, Places, Directions, Distance Matrix)
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Google AI Studio Key (Gemini AI for narratives)
export const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';

// Feature flags based on key presence
export const USE_GOOGLE_MAPS = GOOGLE_MAPS_API_KEY && !GOOGLE_MAPS_API_KEY.includes('YOUR_');
export const USE_GOOGLE_AI = GOOGLE_AI_API_KEY && !GOOGLE_AI_API_KEY.includes('YOUR_');
