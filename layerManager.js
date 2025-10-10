// Only rough concepts here. not part of the system yet

/**
 * Offscreen canvas layer system for hex map rendering
 * Separates static content (terrain, buildings, tracks) from dynamic content (trains)
 */

export class LayerManager {
  constructor() {
    this.terrainCanvas = null;
    this.buildingsCanvas = null;
    this.tracksCanvas = null;
    
    this.terrainCtx = null;
    this.buildingsCtx = null;
    this.tracksCtx = null;
    
    this.lastCamera = { x: 0, y: 0 };
    this.lastZoom = 1;
    this.lastSize = 30;
    
    // Track what needs redrawing
    this.dirtyFlags = {
      terrain: true,
      buildings: true,
      tracks: true
    };
  }

  /**
   * Initialize or resize canvases
   */
  initialize(width, height) {
    // Create terrain layer
    if (!this.terrainCanvas) {
      this.terrainCanvas = document.createElement('canvas');
      this.terrainCtx = this.terrainCanvas.getContext('2d');
    }
    this.terrainCanvas.width = width;
    this.terrainCanvas.height = height;

    // Create buildings layer
    if (!this.buildingsCanvas) {
      this.buildingsCanvas = document.createElement('canvas');
      this.buildingsCtx = this.buildingsCanvas.getContext('2d');
    }
    this.buildingsCanvas.width = width;
    this.buildingsCanvas.height = height;

    // Create tracks layer
    if (!this.tracksCanvas) {
      this.tracksCanvas = document.createElement('canvas');
      this.tracksCtx = this.tracksCanvas.getContext('2d');
    }
    this.tracksCanvas.width = width;
    this.tracksCanvas.height = height;

    // Mark all as dirty after resize
    this.markAllDirty();
  }

  /**
   * Check if camera moved significantly (requiring redraw)
   */
  cameraChanged(camera, zoom, size) {
    const moved = 
      Math.abs(camera.x - this.lastCamera.x) > 1 ||
      Math.abs(camera.y - this.lastCamera.y) > 1 ||
      zoom !== this.lastZoom ||
      size !== this.lastSize;

    if (moved) {
      this.lastCamera = { ...camera };
      this.lastZoom = zoom;
      this.lastSize = size;
      return true;
    }
    return false;
  }

  /**
   * Mark specific layer as needing redraw
   */
  markDirty(layer) {
    if (layer === 'all') {
      this.dirtyFlags.terrain = true;
      this.dirtyFlags.buildings = true;
      this.dirtyFlags.tracks = true;
    } else if (this.dirtyFlags.hasOwnProperty(layer)) {
      this.dirtyFlags[layer] = true;
    }
  }

  markAllDirty() {
    this.markDirty('all');
  }

  /**
   * Check if any layer needs redrawing
   */
  isDirty() {
    return this.dirtyFlags.terrain || this.dirtyFlags.buildings || this.dirtyFlags.tracks;
  }

  /**
   * Clear a specific layer
   */
  clearLayer(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /**
   * Composite all layers onto the main canvas
   */
  compositeToMain(mainCtx) {
    mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);
    
    // Draw layers in order (back to front)
    if (this.terrainCanvas) {
      mainCtx.drawImage(this.terrainCanvas, 0, 0);
    }
    if (this.tracksCanvas) {
      mainCtx.drawImage(this.tracksCanvas, 0, 0);
    }
    if (this.buildingsCanvas) {
      mainCtx.drawImage(this.buildingsCanvas, 0, 0);
    }
  }
}

/**
 * Modified draw function using layer system
 */
export function drawWithLayers(mainCtx, params, layerManager) {
  const {
    canvas,
    map,
    placed_tracks,
    placed_buildings,
    trains,
    camera,
    hoveredElement,
    size,
    zoom,
    TERRAIN,
    OBJECT_TYPES,
    tileCountEl,
    zoomLevelEl,
    trackCountEl,
    trainCountEl,
  } = params;

  // Initialize layers if needed
  if (!layerManager.terrainCanvas) {
    layerManager.initialize(canvas.width, canvas.height);
  }

  // Check if camera moved (which means we need to redraw everything)
  const cameraMoved = layerManager.cameraChanged(camera, zoom, size);
  if (cameraMoved) {
    layerManager.markAllDirty();
  }

  const range = getVisibleHexRange(canvas, camera, size);
  const showLabels = zoom > 0.5;

  // Redraw terrain layer if dirty
  if (layerManager.dirtyFlags.terrain) {
    const ctx = layerManager.terrainCtx;
    layerManager.clearLayer(ctx);
    
    // Group hexes by terrain type for batch rendering
    const hexesByTerrain = {};
    let hoveredHex = null;

    for (let col = range.minCol; col <= range.maxCol; col++) {
      for (let row = range.minRow; row <= range.maxRow; row++) {
        const hexKey = `${col},${row}`;
        const hex = map[hexKey];

        if (!hex) continue;

        const pos = hexToPixel(col, row, size);
        const screenX = pos.x + camera.x;
        const screenY = pos.y + camera.y;

        const isHovered =
          hoveredElement &&
          hoveredElement.type === "tile" &&
          hoveredElement.col === col &&
          hoveredElement.row === row;

        if (isHovered) {
          hoveredHex = { screenX, screenY, terrain: hex.terrain, col, row };
        } else {
          const terrainKey = hex.terrain.name;
          if (!hexesByTerrain[terrainKey]) {
            hexesByTerrain[terrainKey] = {
              terrain: hex.terrain,
              hexes: [],
            };
          }
          hexesByTerrain[terrainKey].hexes.push({ screenX, screenY, col, row });
        }
      }
    }

    // Batch draw hexes
    for (const terrainKey in hexesByTerrain) {
      const { terrain, hexes } = hexesByTerrain[terrainKey];
      drawHexBatch(ctx, hexes, terrain, size, zoom, showLabels);
    }

    // Draw hovered hex
    if (hoveredHex) {
      drawHoveredHex(
        ctx,
        hoveredHex.screenX,
        hoveredHex.screenY,
        hoveredHex.terrain,
        hoveredHex.col,
        hoveredHex.row,
        size,
        zoom,
        showLabels
      );
    }

    layerManager.dirtyFlags.terrain = false;
  }

  // Redraw tracks layer if dirty
  if (layerManager.dirtyFlags.tracks) {
    const ctx = layerManager.tracksCtx;
    layerManager.clearLayer(ctx);
    
    let trackCount = 0;
    for (const key in placed_tracks) {
      const obj = placed_tracks[key];

      if (obj.type === OBJECT_TYPES.TRACK) {
        trackCount++;

        const hex1 = obj.hex1;
        const hex2 = obj.hex2;

        const inRange =
          (hex1.col >= range.minCol &&
            hex1.col <= range.maxCol &&
            hex1.row >= range.minRow &&
            hex1.row <= range.maxRow) ||
          (hex2.col >= range.minCol &&
            hex2.col <= range.maxCol &&
            hex2.row >= range.minRow &&
            hex2.row <= range.maxRow);

        if (inRange) {
          drawTrackBetweenHexes(ctx, hex1, hex2, camera, size, zoom);
        }
      }
    }

    if (trackCountEl) {
      trackCountEl.textContent = trackCount;
    }

    layerManager.dirtyFlags.tracks = false;
  }

  // Redraw buildings layer if dirty
  if (layerManager.dirtyFlags.buildings) {
    const ctx = layerManager.buildingsCtx;
    layerManager.clearLayer(ctx);
    
    for (const tileKey in placed_buildings) {
      const building = placed_buildings[tileKey];

      const inRange =
        building.col >= range.minCol &&
        building.col <= range.maxCol &&
        building.row >= range.minRow &&
        building.row <= range.maxRow;

      if (inRange) {
        drawBuilding(
          ctx,
          building.col,
          building.row,
          camera,
          size,
          zoom,
          building
        );
      }
    }

    layerManager.dirtyFlags.buildings = false;
  }

  // Composite static layers onto main canvas
  layerManager.compositeToMain(mainCtx);

  // Draw dynamic content (trains) directly on main canvas
  // This happens every frame
  if (trains) {
    trains.forEach((train) => {
      const hex1 = train.hex1;
      const hex2 = train.hex2;

      const inRange =
        (hex1.col >= range.minCol &&
          hex1.col <= range.maxCol &&
          hex1.row >= range.minRow &&
          hex1.row <= range.maxRow) ||
        (hex2.col >= range.minCol &&
          hex2.col <= range.maxCol &&
          hex2.row >= range.minRow &&
          hex2.row <= range.maxRow);

      if (inRange) {
        drawTrain(
          mainCtx,
          train.hex1,
          train.hex2,
          train.progress,
          train.cargo,
          camera,
          size,
          zoom
        );
      }
    });
  }

  // Draw hover highlights (also dynamic)
  if (hoveredElement) {
    const pos = hexToPixel(hoveredElement.col, hoveredElement.row, size);
    const screenX = pos.x + camera.x;
    const screenY = pos.y + camera.y;

    if (hoveredElement.type === "vertex") {
      const vertices = getHexVertices(screenX, screenY, size);
      const v = vertices[hoveredElement.vertexIndex];
      drawVertexHighlight(mainCtx, v.x, v.y, zoom);
    } else if (hoveredElement.type === "edge") {
      drawEdgeHighlight(
        mainCtx,
        screenX,
        screenY,
        hoveredElement.edgeIndex,
        size,
        zoom
      );
    }
  }

  // Update UI
  if (tileCountEl) tileCountEl.textContent = Object.keys(map).length;
  if (zoomLevelEl) zoomLevelEl.textContent = Math.round(zoom * 100);
  if (trainCountEl && trains) trainCountEl.textContent = trains.length;
}

// Import helper functions (you'll need to import these from your existing code)
import { 
  hexToPixel, 
  getHexVertices, 
  getVisibleHexRange 
} from './hexUtils.js';

import {
  drawHexBatch,
  drawHoveredHex,
  drawTrackBetweenHexes,
  drawBuilding,
  drawTrain,
  drawVertexHighlight,
  drawEdgeHighlight
} from './draw.js';

/**
 * Usage example:
 * 
 * // In your main game file:
 * const layerManager = new LayerManager();
 * 
 * // In your render loop:
 * drawWithLayers(ctx, params, layerManager);
 * 
 * // When you place a building:
 * layerManager.markDirty('buildings');
 * 
 * // When you place a track:
 * layerManager.markDirty('tracks');
 * 
 * // When terrain changes (rare):
 * layerManager.markDirty('terrain');
 */