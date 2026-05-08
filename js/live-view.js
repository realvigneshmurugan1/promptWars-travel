import { generateCoaching } from './coach.js';

let stream = null;
let isActive = false;
let animationId = null;

/**
 * Initialize and start the Live Director
 */
export async function startLiveDirector(containerId, videoId, canvasId, state) {
  const container = document.getElementById(containerId);
  const video = document.getElementById(videoId);
  const canvas = document.getElementById(canvasId);
  const stats = document.getElementById('live-stats');
  const tip = document.getElementById('live-tip');

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    
    video.srcObject = stream;
    container.classList.remove('hidden');
    isActive = true;

    // Start analysis loop
    runLiveAnalysis(video, canvas, stats, tip, state);
  } catch (err) {
    console.error('Camera access failed:', err);
    alert('Camera access denied. Please enable camera permissions.');
  }
}

/**
 * Stop the Live Director
 */
export function stopLiveDirector(containerId) {
  isActive = false;
  if (animationId) cancelAnimationFrame(animationId);
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  document.getElementById(containerId).classList.add('hidden');
}

/**
 * Live analysis loop
 */
function runLiveAnalysis(video, canvas, statsEl, tipEl, state) {
  if (!isActive) return;

  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Run analysis every 30 frames to save battery
  let frameCount = 0;

  function loop() {
    if (!isActive) return;

    if (frameCount % 30 === 0) {
      // Get live coaching based on current context
      const currentLoc = state.selectedLocation || { name: 'Current Scene', category: 'street' };
      const weather = state.weather || { temp: 25, cloudCover: 20, icon: '☀️' };
      const dna = state.visualDNA || { aesthetic: 'Golden Hour', metrics: { contrast: 0.5 } };
      
      const coach = generateCoaching(currentLoc, weather, dna);
      
      // Update UI
      statsEl.textContent = `${coach.settings.iso} ISO • ${coach.settings.aperture} • ${coach.settings.shutter}s`;
      tipEl.textContent = coach.composition;

      // Draw AR overlays (grid lines)
      drawAROverlay(ctx, canvas.width, canvas.height);
    }

    frameCount++;
    animationId = requestAnimationFrame(loop);
  }

  loop();
}

function drawAROverlay(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  
  // Rule of Thirds Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;

  // Verticals
  ctx.beginPath();
  ctx.moveTo(w / 3, 0); ctx.lineTo(w / 3, h);
  ctx.moveTo((w / 3) * 2, 0); ctx.lineTo((w / 3) * 2, h);
  // Horizontals
  ctx.moveTo(0, h / 3); ctx.lineTo(w, h / 3);
  ctx.moveTo(0, (h / 3) * 2); ctx.lineTo(w, (h / 3) * 2);
  ctx.stroke();

  // Center focus point
  ctx.strokeStyle = 'rgba(0, 212, 170, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(w / 2 - 20, h / 2 - 20, 40, 40);
}
