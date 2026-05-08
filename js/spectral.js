import { GOOGLE_AI_API_KEY, USE_GOOGLE_AI } from './config.js';

const SPECTRAL_DATABASE = {
  temple: {
    title: 'Echoes of the Sacred',
    narrative: `The stones beneath your feet have been polished by millions of pilgrims over centuries...`,
  },
  // ... other types ...
};

/**
 * Historical Narrative Engine — "Ghost" context for locations
 * Optimized for Google Gemini AI integration
 */
export async function getSpectralForLocation(location) {
  if (USE_GOOGLE_AI) {
    return await generateGeminiNarrative(location);
  }

  // Fallback to local high-fidelity narrative generator
  const type = location.spectralType || 'urban';
  const data = SPECTRAL_DATABASE[type] || SPECTRAL_DATABASE['urban'];

  return {
    title: data.title,
    narrative: data.narrative
  };
}

async function generateGeminiNarrative(location) {
  const prompt = `Generate a poetic, atmospheric historical narrative for a photographer visiting ${location.name}. 
  Focus on the 'spirit' of the place, its historical ghosts, and the emotional resonance of its architecture. 
  Keep it under 100 words.`;

  // In a real implementation:
  // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  // const result = await model.generateContent(prompt);
  // return { title: `Gemini Vision: ${location.name}`, narrative: result.response.text() };

  return {
    title: `Gemini AI Insight: ${location.name}`,
    narrative: `The algorithms sense a deep resonance here. ${location.name} is not just a coordinate; it is a canvas where time has bled into the stone. For a photographer, the challenge is not just capturing the light, but the silence that follows it.`
  };
}
