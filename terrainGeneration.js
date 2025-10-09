// WORLD SEED - Change this number to generate different worlds!
let WORLD_SEED = 12345;
let permutation = [];

// Configuration parameters (internal values still use -1 to 1 range)
let config = {
  seed: 12345,
  scale: 0.08,
  octaves: 4,
  waterPercent: 32.5,      // % of world that is water
  sandPercent: 25,         // % of world that is sand
  grassPercent: 10,        // % of world that is grass
  forestPercent: 10,       // % of world that is forest
  mountainPercent: 22.5    // % of world that is mountain
};

// Seeded random number generator
function seededRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// Generate permutation table for noise
function generatePermutationTable(seed) {
  const rng = seededRandom(seed);
  const p = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  
  // Fisher-Yates shuffle with seeded random
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  
  // Duplicate for easy wrapping
  return [...p, ...p];
}

// Initialize permutation table
function initPermutation() {
  WORLD_SEED = config.seed;
  permutation = generatePermutationTable(WORLD_SEED);
  calculateThresholdsFromPercentages();
}

initPermutation();

// Fade function for smooth interpolation
function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Linear interpolation
function lerp(t, a, b) {
  return a + t * (b - a);
}

// Gradient function
function grad(hash, x, y) {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

// 2D Perlin noise
function perlin2D(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  
  x -= Math.floor(x);
  y -= Math.floor(y);
  
  const u = fade(x);
  const v = fade(y);
  
  const a = permutation[X] + Y;
  const aa = permutation[a];
  const ab = permutation[a + 1];
  const b = permutation[X + 1] + Y;
  const ba = permutation[b];
  const bb = permutation[b + 1];
  
  return lerp(v,
    lerp(u, grad(permutation[aa], x, y), grad(permutation[ba], x - 1, y)),
    lerp(u, grad(permutation[ab], x, y - 1), grad(permutation[bb], x - 1, y - 1))
  );
}

// Multi-octave noise for more detail
function multiOctaveNoise(x, y, octaves = 4) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += perlin2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  const normalized = value / maxValue;
  const stretched = Math.max(-1, Math.min(1, normalized / 0.7));
  
  return stretched;
}

// Sample noise to build distribution
function sampleNoiseDistribution(samples = 10000) {
  const noiseValues = [];
  const rng = seededRandom(WORLD_SEED); // Add offset to avoid interfering with permutation
  
  for (let i = 0; i < samples; i++) {
    const x = rng() * 100;
    const y = rng() * 100;
    const noise = multiOctaveNoise(x * config.scale, y * config.scale, config.octaves);
    noiseValues.push(noise);
  }
  
  noiseValues.sort((a, b) => a - b);
  return noiseValues;
}

// Calculate thresholds based on desired percentages
function calculateThresholdsFromPercentages() {
  const noiseValues = sampleNoiseDistribution();
  const total = noiseValues.length;
  
  // Calculate cumulative percentages
  const waterEnd = config.waterPercent / 100;
  const sandEnd = waterEnd + (config.sandPercent / 100);
  const grassEnd = sandEnd + (config.grassPercent / 100);
  const forestEnd = grassEnd + (config.forestPercent / 100);
  
  // Find thresholds at these percentiles
  config.sandThreshold = noiseValues[Math.floor(waterEnd * total)];
  config.grassThreshold = noiseValues[Math.floor(sandEnd * total)];
  config.forestThreshold = noiseValues[Math.floor(grassEnd * total)];
  config.mountainThreshold = noiseValues[Math.floor(forestEnd * total)];
}

// Generate terrain for a hex
export function generateTerrain(col, row, TERRAIN) {
  const noiseValue = multiOctaveNoise(col * config.scale, row * config.scale, config.octaves);
  
  if (noiseValue < config.sandThreshold) return TERRAIN.WATER;
  if (noiseValue < config.grassThreshold) return TERRAIN.SAND;
  if (noiseValue < config.forestThreshold) return TERRAIN.GRASS;
  if (noiseValue < config.mountainThreshold) return TERRAIN.FOREST;
  return TERRAIN.MOUNTAIN;
}

// Update configuration and regenerate world
export function updateConfig(newConfig) {
  Object.assign(config, newConfig);
  if (newConfig.seed !== undefined) {
    initPermutation();
  } else {
    calculateThresholdsFromPercentages();
  }
}

// Get current configuration
export function getConfig() {
  return { ...config };
}

// Create and attach UI controls
function createTerrainControls() {
  const controlsDiv = document.createElement('div');
  controlsDiv.id = 'terrain-controls';
  controlsDiv.innerHTML = `
    <style>
      #terrain-controls {
        position: absolute;
        bottom: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-size: 12px;
        max-width: 320px;
        font-family: Arial, sans-serif;
      }
      #terrain-controls h3 {
        margin: 0 0 10px 0;
        font-size: 14px;
        border-bottom: 1px solid #666;
        padding-bottom: 5px;
      }
      .control-group {
        margin: 8px 0;
      }
      .control-group label {
        display: block;
        margin-bottom: 3px;
        font-size: 11px;
        color: #ccc;
      }
      .control-group input[type="range"] {
        width: 100%;
        margin: 3px 0;
      }
      .control-group input[type="number"] {
        width: 100%;
        padding: 4px;
        background: #333;
        border: 1px solid #666;
        color: white;
        border-radius: 3px;
      }
      .control-value {
        display: inline-block;
        float: right;
        color: #ffcc00;
        font-weight: bold;
      }
      
      /* Multi-handle slider */
      .multi-slider-container {
        margin: 20px 0;
        padding: 10px 0;
      }
      .multi-slider-label {
        font-size: 11px;
        color: #ccc;
        margin-bottom: 8px;
      }
      .multi-slider {
        position: relative;
        height: 40px;
        background: linear-gradient(to right, 
          #1e3a8a 0%, 
          #1e3a8a 32.5%,
          #d4a574 32.5%,
          #d4a574 57.5%,
          #4ade80 57.5%,
          #4ade80 67.5%,
          #22c55e 67.5%,
          #22c55e 77.5%,
          #78716c 77.5%,
          #78716c 100%
        );
        border-radius: 5px;
        margin-bottom: 30px;
      }
      .slider-handle {
        position: absolute;
        top: -5px;
        width: 3px;
        height: 50px;
        background: white;
        cursor: ew-resize;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
        z-index: 10;
      }
      .slider-handle:hover {
        background: #ffcc00;
      }
      .slider-handle.dragging {
        background: #ffd700;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
      }
      .slider-label {
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 9px;
        white-space: nowrap;
        color: #aaa;
      }
      .terrain-legend {
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        margin-top: 5px;
        color: #aaa;
      }
      
      .preset-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 5px;
        margin: 10px 0;
      }
      .preset-btn {
        background: #444;
        color: white;
        border: 1px solid #666;
        padding: 6px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }
      .preset-btn:hover {
        background: #555;
      }
      .regenerate-btn {
        width: 100%;
        background: #ffcc00;
        color: #000;
        border: none;
        padding: 8px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        margin-top: 10px;
      }
      .regenerate-btn:hover {
        background: #ffd700;
      }
    </style>
    
    <h3>🌍 Terrain Generator</h3>
    
    <div class="control-group">
      <label>Seed <span class="control-value" id="seed-value">${config.seed}</span></label>
      <input type="number" id="seed-input" value="${config.seed}" />
    </div>
    
    <div class="control-group">
      <label>Scale <span class="control-value" id="scale-value">${config.scale}</span></label>
      <input type="range" id="scale-input" min="0.02" max="0.2" step="0.01" value="${config.scale}" />
    </div>
    
    <div class="control-group">
      <label>Detail (Octaves) <span class="control-value" id="octaves-value">${config.octaves}</span></label>
      <input type="range" id="octaves-input" min="1" max="8" step="1" value="${config.octaves}" />
    </div>
    
    <div class="multi-slider-container">
      <div class="multi-slider-label">
        Terrain Distribution
      </div>
      <div class="multi-slider" id="multi-slider">
        <div class="slider-handle" data-terrain="sand" style="left: ${config.waterPercent}%">
          <div class="slider-label">🏖️ ${config.waterPercent}%</div>
        </div>
        <div class="slider-handle" data-terrain="grass" style="left: ${config.waterPercent + config.sandPercent}%">
          <div class="slider-label">🌱 ${config.waterPercent + config.sandPercent}%</div>
        </div>
        <div class="slider-handle" data-terrain="forest" style="left: ${config.waterPercent + config.sandPercent + config.grassPercent}%">
          <div class="slider-label">🌲 ${config.waterPercent + config.sandPercent + config.grassPercent}%</div>
        </div>
        <div class="slider-handle" data-terrain="mountain" style="left: ${config.waterPercent + config.sandPercent + config.grassPercent + config.forestPercent}%">
          <div class="slider-label">⛰️ ${config.waterPercent + config.sandPercent + config.grassPercent + config.forestPercent}%</div>
        </div>
      </div>
      <div class="terrain-legend">
        <span>💧 Water</span>
        <span>🏖️ Sand</span>
        <span>🌱 Grass</span>
        <span>🌲 Forest</span>
        <span>⛰️ Mountain</span>
      </div>
    </div>
    
    <div class="preset-buttons">
      <button class="preset-btn" data-preset="archipelago">🏝️ Islands</button>
      <button class="preset-btn" data-preset="pangaea">🌎 Continent</button>
      <button class="preset-btn" data-preset="chaotic">🌋 Chaotic</button>
      <button class="preset-btn" data-preset="forest">🌲 Forested</button>
    </div>
    
    <button class="regenerate-btn" id="regenerate-btn">🔄 Regenerate World</button>
  `;
  
  document.body.appendChild(controlsDiv);
  
  // Multi-slider functionality
  const slider = document.getElementById('multi-slider');
  const handles = slider.querySelectorAll('.slider-handle');
  let draggingHandle = null;
  
  const terrainOrder = ['sand', 'grass', 'forest', 'mountain'];
  
  function updateSliderGradient() {
    const p1 = config.waterPercent;
    const p2 = p1 + config.sandPercent;
    const p3 = p2 + config.grassPercent;
    const p4 = p3 + config.forestPercent;
    
    slider.style.background = `linear-gradient(to right, 
      #1e3a8a 0%, 
      #1e3a8a ${p1}%,
      #d4a574 ${p1}%,
      #d4a574 ${p2}%,
      #4ade80 ${p2}%,
      #4ade80 ${p3}%,
      #22c55e ${p3}%,
      #22c55e ${p4}%,
      #78716c ${p4}%,
      #78716c 100%
    )`;
  }
  
  function updateAllHandlePositions() {
    // Update all handle positions based on config
    const sandHandle = slider.querySelector('[data-terrain="sand"]');
    const grassHandle = slider.querySelector('[data-terrain="grass"]');
    const forestHandle = slider.querySelector('[data-terrain="forest"]');
    const mountainHandle = slider.querySelector('[data-terrain="mountain"]');
    
    const p1 = config.waterPercent;
    const p2 = p1 + config.sandPercent;
    const p3 = p2 + config.grassPercent;
    const p4 = p3 + config.forestPercent;
    
    sandHandle.style.left = p1 + '%';
    sandHandle.querySelector('.slider-label').textContent = '🏖️ ' + Math.round(p1) + '%';
    
    grassHandle.style.left = p2 + '%';
    grassHandle.querySelector('.slider-label').textContent = '🌱 ' + Math.round(p2) + '%';
    
    forestHandle.style.left = p3 + '%';
    forestHandle.querySelector('.slider-label').textContent = '🌲 ' + Math.round(p3) + '%';
    
    mountainHandle.style.left = p4 + '%';
    mountainHandle.querySelector('.slider-label').textContent = '⛰️ ' + Math.round(p4) + '%';
  }
  
  function setHandlePosition(handle, position) {
    const terrain = handle.getAttribute('data-terrain');
    
    // Get current cumulative positions
    const sandPos = parseFloat(slider.querySelector('[data-terrain="sand"]').style.left);
    const grassPos = parseFloat(slider.querySelector('[data-terrain="grass"]').style.left);
    const forestPos = parseFloat(slider.querySelector('[data-terrain="forest"]').style.left);
    const mountainPos = parseFloat(slider.querySelector('[data-terrain="mountain"]').style.left);
    
    // Update config based on which handle moved
    switch(terrain) {
      case 'sand':
        config.waterPercent = position;
        config.sandPercent = grassPos - position;
        break;
      case 'grass':
        config.sandPercent = position - sandPos;
        config.grassPercent = forestPos - position;
        break;
      case 'forest':
        config.grassPercent = position - grassPos;
        config.forestPercent = mountainPos - position;
        break;
      case 'mountain':
        config.forestPercent = position - forestPos;
        break;
    }
    
    // Mountain percentage is whatever's left
    const usedPercent = config.waterPercent + config.sandPercent + config.grassPercent + config.forestPercent;
    config.mountainPercent = 100 - usedPercent;
    
    // Update all handle positions to reflect new config
    updateAllHandlePositions();
    updateSliderGradient();
    calculateThresholdsFromPercentages();
  }
  
  handles.forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      draggingHandle = handle;
      handle.classList.add('dragging');
    });
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!draggingHandle) return;
    
    const sliderRect = slider.getBoundingClientRect();
    let position = ((e.clientX - sliderRect.left) / sliderRect.width) * 100;
    position = Math.max(0, Math.min(100, position));
    
    // Get current positions of all handles
    const sandPos = parseFloat(slider.querySelector('[data-terrain="sand"]').style.left);
    const grassPos = parseFloat(slider.querySelector('[data-terrain="grass"]').style.left);
    const forestPos = parseFloat(slider.querySelector('[data-terrain="forest"]').style.left);
    const mountainPos = parseFloat(slider.querySelector('[data-terrain="mountain"]').style.left);
    
    // Get constraints based on adjacent handles
    const terrain = draggingHandle.getAttribute('data-terrain');
    
    let minPos = 1;
    let maxPos = 99;
    
    switch(terrain) {
      case 'sand':
        maxPos = grassPos - 1;
        break;
      case 'grass':
        minPos = sandPos + 1;
        maxPos = forestPos - 1;
        break;
      case 'forest':
        minPos = grassPos + 1;
        maxPos = mountainPos - 1;
        break;
      case 'mountain':
        minPos = forestPos + 1;
        break;
    }
    
    position = Math.max(minPos, Math.min(maxPos, position));
    setHandlePosition(draggingHandle, position);
  });
  
  document.addEventListener('mouseup', () => {
    if (draggingHandle) {
      draggingHandle.classList.remove('dragging');
      draggingHandle = null;
    }
  });
  
  // Regular controls
  const updateValue = (id, value) => {
    document.getElementById(id).textContent = value;
  };
  
  document.getElementById('seed-input').addEventListener('input', (e) => {
    config.seed = parseInt(e.target.value);
    updateValue('seed-value', config.seed);
  });
  
  document.getElementById('scale-input').addEventListener('input', (e) => {
    config.scale = parseFloat(e.target.value);
    updateValue('scale-value', config.scale.toFixed(2));
    calculateThresholdsFromPercentages();
  });
  
  document.getElementById('octaves-input').addEventListener('input', (e) => {
    config.octaves = parseInt(e.target.value);
    updateValue('octaves-value', config.octaves);
    calculateThresholdsFromPercentages();
  });
  
  // Preset buttons
  const presets = {
    archipelago: {
      scale: 0.12,
      octaves: 5,
      waterPercent: 45,
      sandPercent: 15,
      grassPercent: 15,
      forestPercent: 15,
      mountainPercent: 10
    },
    pangaea: {
      scale: 0.05,
      octaves: 3,
      waterPercent: 25,
      sandPercent: 20,
      grassPercent: 25,
      forestPercent: 20,
      mountainPercent: 10
    },
    chaotic: {
      scale: 0.15,
      octaves: 6,
      waterPercent: 30,
      sandPercent: 20,
      grassPercent: 20,
      forestPercent: 15,
      mountainPercent: 15
    },
    forest: {
      scale: 0.08,
      octaves: 4,
      waterPercent: 20,
      sandPercent: 10,
      grassPercent: 15,
      forestPercent: 40,
      mountainPercent: 15
    }
  };
  
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = presets[btn.dataset.preset];
      Object.assign(config, preset);
      
      // Update regular controls
      document.getElementById('scale-input').value = config.scale;
      updateValue('scale-value', config.scale.toFixed(2));
      
      document.getElementById('octaves-input').value = config.octaves;
      updateValue('octaves-value', config.octaves);
      
      // Update slider handles
      updateAllHandlePositions();
      updateSliderGradient();
      
      // Trigger regeneration
      document.getElementById('regenerate-btn').click();
    });
  });
  
  // Regenerate button
  document.getElementById('regenerate-btn').addEventListener('click', () => {
    initPermutation();
    window.dispatchEvent(new CustomEvent('terrainRegenerate'));
  });
}

// Auto-initialize UI when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createTerrainControls);
} else {
  createTerrainControls();
}