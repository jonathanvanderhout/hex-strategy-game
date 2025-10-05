// WORLD SEED - Change this number to generate different worlds!
let WORLD_SEED = 12345;
let permutation = [];

// Configuration parameters
let config = {
  seed: 12345,
  scale: 0.08,
  octaves: 4,
  waterThreshold: -0.35,
  sandThreshold: -0.15,
  grassThreshold: 0.15,
  forestThreshold: 0.35,
  mountainThreshold: 0.55
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
  
  return value / maxValue;
}

// Generate terrain for a hex
export function generateTerrain(col, row, TERRAIN) {
  // Get noise value for this hex
  const noiseValue = multiOctaveNoise(col * config.scale, row * config.scale, config.octaves);
  
  // Map noise value to terrain types
  if (noiseValue < config.waterThreshold) return TERRAIN.WATER;
  if (noiseValue < config.sandThreshold) return TERRAIN.SAND;
  if (noiseValue < config.grassThreshold) return TERRAIN.GRASS;
  if (noiseValue < config.forestThreshold) return TERRAIN.FOREST;
  if (noiseValue < config.mountainThreshold) return TERRAIN.MOUNTAIN;
  // Everything above mountain threshold is also mountain (no new terrain type)
  return TERRAIN.MOUNTAIN;
}

// Update configuration and regenerate world
export function updateConfig(newConfig) {
  Object.assign(config, newConfig);
  if (newConfig.seed !== undefined) {
    initPermutation();
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
        max-width: 280px;
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
    
    <div class="control-group">
      <label>Water <span class="control-value" id="water-value">${config.waterThreshold}</span></label>
      <input type="range" id="water-input" min="-1" max="0" step="0.05" value="${config.waterThreshold}" />
    </div>
    
    <div class="control-group">
      <label>Sand <span class="control-value" id="sand-value">${config.sandThreshold}</span></label>
      <input type="range" id="sand-input" min="-1" max="1" step="0.05" value="${config.sandThreshold}" />
    </div>
    
    <div class="control-group">
      <label>Grass <span class="control-value" id="grass-value">${config.grassThreshold}</span></label>
      <input type="range" id="grass-input" min="-1" max="1" step="0.05" value="${config.grassThreshold}" />
    </div>
    
    <div class="control-group">
      <label>Forest <span class="control-value" id="forest-value">${config.forestThreshold}</span></label>
      <input type="range" id="forest-input" min="-1" max="1" step="0.05" value="${config.forestThreshold}" />
    </div>
    
    <div class="control-group">
      <label>Mountain <span class="control-value" id="mountain-value">${config.mountainThreshold}</span></label>
      <input type="range" id="mountain-input" min="-1" max="1" step="0.05" value="${config.mountainThreshold}" />
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
  
  // Attach event listeners
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
  });
  
  document.getElementById('octaves-input').addEventListener('input', (e) => {
    config.octaves = parseInt(e.target.value);
    updateValue('octaves-value', config.octaves);
  });
  
  document.getElementById('water-input').addEventListener('input', (e) => {
    config.waterThreshold = parseFloat(e.target.value);
    updateValue('water-value', config.waterThreshold.toFixed(2));
  });
  
  document.getElementById('sand-input').addEventListener('input', (e) => {
    config.sandThreshold = parseFloat(e.target.value);
    updateValue('sand-value', config.sandThreshold.toFixed(2));
  });
  
  document.getElementById('grass-input').addEventListener('input', (e) => {
    config.grassThreshold = parseFloat(e.target.value);
    updateValue('grass-value', config.grassThreshold.toFixed(2));
  });
  
  document.getElementById('forest-input').addEventListener('input', (e) => {
    config.forestThreshold = parseFloat(e.target.value);
    updateValue('forest-value', config.forestThreshold.toFixed(2));
  });
  
  document.getElementById('mountain-input').addEventListener('input', (e) => {
    config.mountainThreshold = parseFloat(e.target.value);
    updateValue('mountain-value', config.mountainThreshold.toFixed(2));
  });
  
  // Preset buttons
  const presets = {
    archipelago: {
      scale: 0.12,
      octaves: 5,
      waterThreshold: -0.2,
      sandThreshold: -0.05,
      grassThreshold: 0.15,
      forestThreshold: 0.35,
      mountainThreshold: 0.55
    },
    pangaea: {
      scale: 0.05,
      octaves: 3,
      waterThreshold: -0.4,
      sandThreshold: -0.2,
      grassThreshold: 0.2,
      forestThreshold: 0.4,
      mountainThreshold: 0.6
    },
    chaotic: {
      scale: 0.15,
      octaves: 6,
      waterThreshold: -0.35,
      sandThreshold: -0.15,
      grassThreshold: 0.15,
      forestThreshold: 0.35,
      mountainThreshold: 0.55
    },
    forest: {
      scale: 0.08,
      octaves: 4,
      waterThreshold: -0.4,
      sandThreshold: -0.2,
      grassThreshold: 0.3,
      forestThreshold: 0.6,
      mountainThreshold: 0.8
    }
  };
  
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = presets[btn.dataset.preset];
      Object.assign(config, preset);
      
      // Update all UI elements
      document.getElementById('scale-input').value = config.scale;
      updateValue('scale-value', config.scale.toFixed(2));
      
      document.getElementById('octaves-input').value = config.octaves;
      updateValue('octaves-value', config.octaves);
      
      document.getElementById('water-input').value = config.waterThreshold;
      updateValue('water-value', config.waterThreshold.toFixed(2));
      
      document.getElementById('sand-input').value = config.sandThreshold;
      updateValue('sand-value', config.sandThreshold.toFixed(2));
      
      document.getElementById('grass-input').value = config.grassThreshold;
      updateValue('grass-value', config.grassThreshold.toFixed(2));
      
      document.getElementById('forest-input').value = config.forestThreshold;
      updateValue('forest-value', config.forestThreshold.toFixed(2));
      
      document.getElementById('mountain-input').value = config.mountainThreshold;
      updateValue('mountain-value', config.mountainThreshold.toFixed(2));
      
      // Trigger regeneration
      document.getElementById('regenerate-btn').click();
    });
  });
  
  // Regenerate button
  document.getElementById('regenerate-btn').addEventListener('click', () => {
    initPermutation();
    // Dispatch custom event that the main app can listen to
    window.dispatchEvent(new CustomEvent('terrainRegenerate'));
  });
}

// Auto-initialize UI when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createTerrainControls);
} else {
  createTerrainControls();
}