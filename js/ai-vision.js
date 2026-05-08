import { GoogleGenerativeAI } from "@google/generative-ai";
import { GOOGLE_AI_API_KEY } from "./config.js";

const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Convert a File object to a Gemini-compatible Part
 */
async function fileToGenerativePart(file) {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

/**
 * Deep Aesthetic Analysis using Google Gemini Vision
 */
export async function analyzeAestheticWithAI(files) {
  if (!GOOGLE_AI_API_KEY || GOOGLE_AI_API_KEY.includes('YOUR_')) {
    throw new Error('Google AI Key missing');
  }

  const imageParts = await Promise.all(files.map(fileToGenerativePart));

  const prompt = `
    Analyze these photography samples and determine the photographer's "Visual DNA".
    Provide the result in the following JSON format:
    {
      "aesthetic": "One word name (e.g. Cyberpunk, Minimalist, Moody)",
      "description": "A poetic 2-sentence description of their style",
      "metrics": {
        "warmth": 0.0-1.0,
        "contrast": 0.0-1.0,
        "saturation": 0.0-1.0,
        "edgeDensity": 0.0-1.0,
        "simplicity": 0.0-1.0
      },
      "palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
      "icon": "A relevant emoji",
      "confidence": 0-100
    }
    Only return valid JSON. No other text.
  `;

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from potential markdown code blocks
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Gemini AI Analysis failed:", err);
    throw err;
  }
}
