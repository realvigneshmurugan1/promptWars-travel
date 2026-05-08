/**
 * Visual DNA Extraction Module
 * Analyzes uploaded photos using canvas to extract the user's aesthetic signature.
 */

const AESTHETICS = [
  {
    name: 'Golden Hour',
    icon: '☀️',
    description: 'Warm, amber-lit scenes with soft gradients and long shadows',
    match: (m) => m.warmth > 0.6 && m.brightness > 0.45 && m.saturation > 0.4,
    weight: (m) => m.warmth * 0.5 + m.saturation * 0.3 + m.brightness * 0.2,
  },
  {
    name: 'Brutalist',
    icon: '🏗️',
    description: 'Raw concrete, geometric forms, and stark contrasts',
    match: (m) => m.contrast > 0.55 && m.saturation < 0.35 && m.edgeDensity > 0.4,
    weight: (m) => m.contrast * 0.4 + m.edgeDensity * 0.4 + (1 - m.saturation) * 0.2,
  },
  {
    name: 'Cyberpunk',
    icon: '🌃',
    description: 'Neon-soaked nights, vivid magentas and teals, urban glow',
    match: (m) => m.brightness < 0.4 && m.saturation > 0.5 && m.neonScore > 0.3,
    weight: (m) => m.neonScore * 0.4 + m.saturation * 0.3 + (1 - m.brightness) * 0.3,
  },
  {
    name: 'Minimalist',
    icon: '◻️',
    description: 'Clean lines, negative space, muted tones, and simplicity',
    match: (m) => m.simplicity > 0.5 && m.saturation < 0.3 && m.brightness > 0.5,
    weight: (m) => m.simplicity * 0.5 + (1 - m.saturation) * 0.3 + m.brightness * 0.2,
  },
  {
    name: 'Moody',
    icon: '🌑',
    description: 'Dark, desaturated tones with dramatic shadows and atmosphere',
    match: (m) => m.brightness < 0.35 && m.contrast > 0.4,
    weight: (m) => (1 - m.brightness) * 0.4 + m.contrast * 0.4 + (1 - m.saturation) * 0.2,
  },
  {
    name: 'Verdant',
    icon: '🌿',
    description: 'Lush greens, natural tones, organic textures, earthy warmth',
    match: (m) => m.greenDominance > 0.35 && m.saturation > 0.3,
    weight: (m) => m.greenDominance * 0.5 + m.saturation * 0.3 + m.brightness * 0.2,
  },
];

/**
 * Analyze a single image and return metrics
 */
function analyzeImage(img) {
  const canvas = document.getElementById('analysis-canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const size = 200;
  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(img, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const pixelCount = size * size;
  let totalR = 0, totalG = 0, totalB = 0, totalS = 0, totalL = 0;
  let totalL2 = 0; // For variance
  let neonPixels = 0, edgeCount = 0;
  const colorBuckets = {};

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r8 = data[i], g8 = data[i + 1], b8 = data[i + 2];
      const r = r8 / 255, g = g8 / 255, b = b8 / 255;

      totalR += r; totalG += g; totalB += b;
      
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = max > 0 ? (max - min) / max : 0;
      
      totalL += lum;
      totalL2 += lum * lum;
      totalS += sat;

      // Neon detection
      if (sat > 0.6 && (b8 > r8 || (r8 > 150 && b8 > 100 && g8 < 100))) neonPixels++;

      // Edge detection
      if (x < size - 1 && y < size - 1) {
        const iR = (y * size + x + 1) * 4;
        const iD = ((y + 1) * size + x) * 4;
        const lumR = (0.299 * data[iR] + 0.587 * data[iR + 1] + 0.114 * data[iR + 2]) / 255;
        const lumD = (0.299 * data[iD] + 0.587 * data[iD + 1] + 0.114 * data[iD + 2]) / 255;
        if (Math.abs(lumR - lum) + Math.abs(lumD - lum) > 0.12) edgeCount++;
      }

      // Fast bucket key
      const bK = ((r8 >> 6) << 12) | ((g8 >> 6) << 6) | (b8 >> 6);
      colorBuckets[bK] = (colorBuckets[bK] || 0) + 1;
    }
  }

  const avgR = totalR / pixelCount, avgG = totalG / pixelCount, avgB = totalB / pixelCount;
  const avgL = totalL / pixelCount;
  const avgS = totalS / pixelCount;

  // Contrast via variance formula
  const variance = Math.max(0, (totalL2 / pixelCount) - (avgL * avgL));
  const contrast = Math.min(1, Math.sqrt(variance) * 3.5);
  
  const neonScore = Math.min(1, neonPixels / (pixelCount * 0.1));
  const edgeDensity = Math.min(1, edgeCount / (pixelCount * 0.15));
  const warmth = Math.min(1, Math.max(0, (avgR - avgB) * 2 + 0.5));
  const greenDominance = Math.min(1, Math.max(0, (avgG - Math.max(avgR, avgB)) * 3 + 0.3));

  // Extract colors from numeric buckets
  const sortedBuckets = Object.entries(colorBuckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key]) => {
      const k = parseInt(key);
      const r = (k >> 12) << 6, g = ((k >> 6) & 63) << 6, b = (k & 63) << 6;
      return `rgb(${r},${g},${b})`;
    });

  const simplicity = Math.max(0, 1 - Object.keys(colorBuckets).length / 64);

  return {
    brightness: avgL,
    saturation: avgS,
    contrast,
    edgeDensity,
    warmth,
    neonScore,
    greenDominance,
    simplicity,
    dominantColors: sortedBuckets,
    avgColor: `rgb(${Math.round(avgR * 255)},${Math.round(avgG * 255)},${Math.round(avgB * 255)})`,
  };
}

/**
 * Load an image file and return an Image element
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Analyze multiple photos and return a combined Visual DNA profile
 */
export async function extractVisualDNA(files) {
  // Load all images in parallel — O(1) wait time instead of O(n)
  const images = await Promise.all(files.map(loadImage));
  const allMetrics = images.map(analyzeImage);

  // Average all metrics
  const avg = {};
  const keys = ['brightness', 'saturation', 'contrast', 'edgeDensity', 'warmth', 'neonScore', 'greenDominance', 'simplicity'];
  for (const key of keys) {
    avg[key] = allMetrics.reduce((sum, m) => sum + m[key], 0) / allMetrics.length;
  }

  // Collect all dominant colors
  const allColors = allMetrics.flatMap(m => m.dominantColors);
  const colorFreq = {};
  allColors.forEach(c => { colorFreq[c] = (colorFreq[c] || 0) + 1; });
  const palette = Object.entries(colorFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([c]) => c);

  // Classify aesthetic
  let bestAesthetic = AESTHETICS[0];
  let bestScore = 0;

  for (const aesthetic of AESTHETICS) {
    if (aesthetic.match(avg)) {
      const score = aesthetic.weight(avg);
      if (score > bestScore) {
        bestScore = score;
        bestAesthetic = aesthetic;
      }
    }
  }

  // If no match, pick the one with highest weight
  if (bestScore === 0) {
    for (const aesthetic of AESTHETICS) {
      const score = aesthetic.weight(avg);
      if (score > bestScore) {
        bestScore = score;
        bestAesthetic = aesthetic;
      }
    }
  }

  // Generate traits
  const traits = [];
  if (avg.warmth > 0.55) traits.push('Warm Tones');
  else if (avg.warmth < 0.35) traits.push('Cool Tones');
  if (avg.contrast > 0.5) traits.push('High Contrast');
  if (avg.saturation > 0.5) traits.push('Vivid');
  else if (avg.saturation < 0.25) traits.push('Desaturated');
  if (avg.edgeDensity > 0.5) traits.push('Textured');
  if (avg.simplicity > 0.5) traits.push('Clean');
  if (avg.brightness > 0.6) traits.push('Airy');
  else if (avg.brightness < 0.3) traits.push('Dark');

  return {
    aesthetic: bestAesthetic.name,
    icon: bestAesthetic.icon,
    description: bestAesthetic.description,
    confidence: Math.round(Math.min(98, bestScore * 100 + 40)),
    metrics: avg,
    palette,
    traits,
    photoCount: files.length,
  };
}

export { AESTHETICS };
