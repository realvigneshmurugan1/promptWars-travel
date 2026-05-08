/**
 * Lumina — Google API Configuration
 * 
 * To use the full features of Lumina, replace the placeholders below with your API keys.
 * 
 * Google Cloud Console (Maps, Places, Directions, Distance Matrix): 
 * https://console.cloud.google.com/
 * 
 * Google AI Studio (Gemini AI for historical narratives):
 * https://aistudio.google.com/
 */

export const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';
export const GOOGLE_AI_API_KEY = 'YOUR_GOOGLE_AI_API_KEY';

// Feature flags based on key presence
export const USE_GOOGLE_MAPS = GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY';
export const USE_GOOGLE_AI = GOOGLE_AI_API_KEY !== 'YOUR_GOOGLE_AI_API_KEY';
