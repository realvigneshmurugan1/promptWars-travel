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

  let totalR = 0, totalG = 0, totalB = 0;
  let totalH = 0, totalS = 0, totalL = 0;
  const colors = [];
  const colorBuckets = {};

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    totalR += r; totalG += g; totalB += b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let s = 0, h = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    totalH += h; totalS += s; totalL += l;

    // Bucket colors for palette extraction
    const bucketKey = `${Math.round(r * 4) * 64},${Math.round(g * 4) * 64},${Math.round(b * 4) * 64}`;
    colorBuckets[bucketKey] = (colorBuckets[bucketKey] || 0) + 1;
  }

  const avgR = totalR / pixelCount;
  const avgG = totalG / pixelCount;
  const avgB = totalB / pixelCount;
  const avgS = totalS / pixelCount;
  const avgL = totalL / pixelCount;

  // Single second pass: contrast variance + neon score + edge density
  let varianceL = 0, neonPixels = 0, edgeCount = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r8 = data[i], g8 = data[i + 1], b8 = data[i + 2];
      const r = r8 / 255, g = g8 / 255, b = b8 / 255;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Variance (contrast)
      varianceL += (lum - avgL) * (lum - avgL);

      // Neon detection
      const maxC = Math.max(r8, g8, b8), minC = Math.min(r8, g8, b8);
      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
      if (sat > 0.6 && (b8 > r8 || (r8 > 150 && b8 > 100 && g8 < 100))) neonPixels++;

      // Sobel edge detection (skip border pixels)
      if (x > 0 && x < size - 1 && y > 0 && y < size - 1) {
        const iR = (y * size + x + 1) * 4;
        const iD = ((y + 1) * size + x) * 4;
        const lumR = 0.299 * data[iR] / 255 + 0.587 * data[iR + 1] / 255 + 0.114 * data[iR + 2] / 255;
        const lumD = 0.299 * data[iD] / 255 + 0.587 * data[iD + 1] / 255 + 0.114 * data[iD + 2] / 255;
        if (Math.abs(lumR - lum) + Math.abs(lumD - lum) > 30 / 255) edgeCount++;
      }
    }
  }
  const contrast = Math.min(1, Math.sqrt(varianceL / pixelCount) * 3);
  const neonScore = Math.min(1, neonPixels / (pixelCount * 0.1));
  const edgeDensity = Math.min(1, edgeCount / (pixelCount * 0.15));
  const warmth = Math.min(1, Math.max(0, (avgR - avgB) * 2 + 0.5));

  // Green dominance
  const greenDominance = Math.min(1, Math.max(0, (avgG - Math.max(avgR, avgB)) * 3 + 0.3));

  // Simplicity (inverse of color variety)
  const bucketCount = Object.keys(colorBuckets).length;
  const maxBuckets = 125;
  const simplicity = Math.max(0, 1 - bucketCount / maxBuckets);

  // Extract top 5 dominant colors
  const sortedBuckets = Object.entries(colorBuckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key]) => {
      const [r, g, b] = key.split(',').map(Number);
      return `rgb(${r},${g},${b})`;
    });

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
