/**
 * Drawing module for hexagon terrain map
 *
 * Usage:
 * import { draw } from './draw.js';
 *
 * draw(ctx, {
 *   canvas,
 *   map,
 *   objects,
 *   camera,
 *   hoveredElement,
 *   size,
 *   zoom,
 *   TERRAIN,
 *   OBJECT_TYPES,
 *   tileCountEl,
 *   zoomLevelEl,
 *   trackCountEl
 * });
 */

// Lighten a hex color
function lightenColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Convert grid coordinates to pixel coordinates (flat-top)
function hexToPixel(col, row, size) {
  const width = size * 2;
  const height = Math.sqrt(3) * size;
  const x = col * width * 0.75;
  const y = row * height + ((Math.abs(col) % 2) * height) / 2;
  return { x, y };
}

// Convert pixel coordinates to grid coordinates (flat-top)
function pixelToHex(x, y, size) {
  const q = ((2 / 3) * x) / size;
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / size;

  let cubeQ = q;
  let cubeR = r;
  let cubeS = -q - r;

  let rq = Math.round(cubeQ);
  let rr = Math.round(cubeR);
  let rs = Math.round(cubeS);

  const q_diff = Math.abs(rq - cubeQ);
  const r_diff = Math.abs(rr - cubeR);
  const s_diff = Math.abs(rs - cubeS);

  if (q_diff > r_diff && q_diff > s_diff) {
    rq = -rr - rs;
  } else if (r_diff > s_diff) {
    rr = -rq - rs;
  }

  const col = rq;
  const row = rr + Math.floor(rq / 2);

  return { col, row };
}

// Get the 6 vertices of a hex in pixel coordinates
function getHexVertices(centerX, centerY, size) {
  const angles = [0, 60, 120, 180, 240, 300];
  return angles.map((angle) => {
    const angleRad = (Math.PI / 180) * angle;
    return {
      x: centerX + size * Math.cos(angleRad),
      y: centerY + size * Math.sin(angleRad),
    };
  });
}

// Get the neighbor hex for a given side (flat-top orientation)
function getNeighbor(col, row, side) {
  const isEven = col % 2 === 0;

  const neighbors = isEven
    ? [
        [col + 1, row],
        [col, row + 1],
        [col - 1, row],
        [col - 1, row - 1],
        [col, row - 1],
        [col + 1, row - 1],
      ]
    : [
        [col + 1, row + 1],
        [col, row + 1],
        [col - 1, row + 1],
        [col - 1, row],
        [col, row - 1],
        [col + 1, row],
      ];

  return { col: neighbors[side][0], row: neighbors[side][1] };
}

// Draw a flat-top hexagon
function drawHex(
  ctx,
  centerX,
  centerY,
  terrain,
  isHovered,
  col,
  row,
  size,
  zoom
) {
  ctx.beginPath();

  const angles = [0, 60, 120, 180, 240, 300];

  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * angles[i];
    const x = centerX + size * Math.cos(angleRad);
    const y = centerY + size * Math.sin(angleRad);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fillStyle = isHovered ? lightenColor(terrain.color, 30) : terrain.color;
  ctx.fill();
  ctx.strokeStyle = isHovered ? "#ffcc00" : "#333";
  ctx.lineWidth = isHovered ? 2 * zoom : 1 * zoom;
  ctx.stroke();

  // Draw col,row label in the middle
  ctx.fillStyle = "#000";
  ctx.font = `${12 * zoom}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${col},${row}`, centerX, centerY);
}

// Draw hover highlight for vertex
function drawVertexHighlight(ctx, x, y, zoom) {
  ctx.beginPath();
  ctx.arc(x, y, 6 * zoom, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 204, 0, 0.5)";
  ctx.fill();
  ctx.strokeStyle = "#ffcc00";
  ctx.lineWidth = 2 * zoom;
  ctx.stroke();
}

// Draw hover highlight for edge
function drawEdgeHighlight(ctx, centerX, centerY, edgeIndex, size, zoom) {
  const vertices = getHexVertices(centerX, centerY, size);
  const v1 = vertices[edgeIndex];
  const v2 = vertices[(edgeIndex + 1) % 6];

  // Draw thick line for the edge
  ctx.beginPath();
  ctx.moveTo(v1.x, v1.y);
  ctx.lineTo(v2.x, v2.y);
  ctx.strokeStyle = "#ffcc00";
  ctx.lineWidth = 6 * zoom;
  ctx.stroke();

  // Draw dot at midpoint
  const midX = (v1.x + v2.x) / 2;
  const midY = (v1.y + v2.y) / 2;
  ctx.beginPath();
  ctx.arc(midX, midY, 5 * zoom, 0, Math.PI * 2);
  ctx.fillStyle = "#ffcc00";
  ctx.fill();
}

// Draw a train track between two hexes
function drawTrackBetweenHexes(ctx, hex1, hex2, camera, size, zoom) {
  const pos1 = hexToPixel(hex1.col, hex1.row, size);
  const pos2 = hexToPixel(hex2.col, hex2.row, size);

  // Find which edge of hex1 connects to hex2
  let edgeIndex = -1;
  for (let i = 0; i < 6; i++) {
    const neighbor = getNeighbor(hex1.col, hex1.row, i);
    if (neighbor.col === hex2.col && neighbor.row === hex2.row) {
      edgeIndex = i;
      break;
    }
  }

  if (edgeIndex === -1) return;

  const screenX = pos1.x + camera.x;
  const screenY = pos1.y + camera.y;

  const vertices = getHexVertices(screenX, screenY, size);
  const v1 = vertices[edgeIndex];
  const v2 = vertices[(edgeIndex + 1) % 6];

  // Draw railroad ties (sleepers)
  const numTies = 5;
  const tieWidth = size * 0.15;
  const tieThickness = 1.5 * zoom;

  ctx.strokeStyle = "#4a3a2a";
  ctx.lineWidth = tieThickness;

  for (let i = 0; i <= numTies; i++) {
    const t = i / numTies;
    const mx = v1.x + (v2.x - v1.x) * t;
    const my = v1.y + (v2.y - v1.y) * t;

    // Perpendicular direction
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const perpX = (-dy / len) * tieWidth;
    const perpY = (dx / len) * tieWidth;

    ctx.beginPath();
    ctx.moveTo(mx - perpX, my - perpY);
    ctx.lineTo(mx + perpX, my + perpY);
    ctx.stroke();
  }

  // Draw rails
  const railOffset = size * 0.08;
  const railThickness = 2 * zoom;

  ctx.strokeStyle = "#708090";
  ctx.lineWidth = railThickness;

  // Calculate perpendicular offset
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const perpX = (-dy / len) * railOffset;
  const perpY = (dx / len) * railOffset;

  // Rail 1
  ctx.beginPath();
  ctx.moveTo(v1.x - perpX, v1.y - perpY);
  ctx.lineTo(v2.x - perpX, v2.y - perpY);
  ctx.stroke();

  // Rail 2
  ctx.beginPath();
  ctx.moveTo(v1.x + perpX, v1.y + perpY);
  ctx.lineTo(v2.x + perpX, v2.y + perpY);
  ctx.stroke();
}

// Get visible hex range
function getVisibleHexRange(canvas, camera, size) {
  const width = size * 2;
  const height = Math.sqrt(3) * size;
  const margin = 3;

  const topLeft = pixelToHex(
    -camera.x - width * margin,
    -camera.y - height * margin,
    size
  );
  const bottomRight = pixelToHex(
    -camera.x + canvas.width + width * margin,
    -camera.y + canvas.height + height * margin,
    size
  );

  return {
    minCol: topLeft.col - margin,
    maxCol: bottomRight.col + margin,
    minRow: topLeft.row - margin,
    maxRow: bottomRight.row + margin,
  };
}

/**
 * Main draw function
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} params - Drawing parameters
 * @param {HTMLCanvasElement} params.canvas - Canvas element
 * @param {Object} params.map - Map data structure (hex tiles)
 * @param {Object} params.objects - Objects data structure (tracks, etc.)
 * @param {Object} params.camera - Camera position {x, y}
 * @param {Object|null} params.hoveredElement - Currently hovered element
 * @param {number} params.size - Current hex size (affected by zoom)
 * @param {number} params.zoom - Current zoom level
 * @param {Object} params.TERRAIN - Terrain types definition
 * @param {Object} params.OBJECT_TYPES - Object types definition
 * @param {HTMLElement} params.tileCountEl - Element to display tile count
 * @param {HTMLElement} params.zoomLevelEl - Element to display zoom level
 * @param {HTMLElement} params.trackCountEl - Element to display track count
 */
export function draw(ctx, params) {
  const {
    canvas,
    map,
    objects,
    camera,
    hoveredElement,
    size,
    zoom,
    TERRAIN,
    OBJECT_TYPES,
    tileCountEl,
    zoomLevelEl,
    trackCountEl,
  } = params;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const range = getVisibleHexRange(canvas, camera, size);

  // Draw tiles
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

      drawHex(
        ctx,
        screenX,
        screenY,
        hex.terrain,
        isHovered,
        col,
        row,
        size,
        zoom
      );
    }
  }

  // Draw all objects (tracks, etc.)
  let trackCount = 0;
  for (const key in objects) {
    const obj = objects[key];

    if (obj.type === OBJECT_TYPES.TRACK) {
      trackCount++;

      // Check if either hex is in visible range
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

  // Draw hover highlights on top
  if (hoveredElement) {
    const pos = hexToPixel(hoveredElement.col, hoveredElement.row, size);
    const screenX = pos.x + camera.x;
    const screenY = pos.y + camera.y;

    if (hoveredElement.type === "vertex") {
      const vertices = getHexVertices(screenX, screenY, size);
      const v = vertices[hoveredElement.vertexIndex];
      drawVertexHighlight(ctx, v.x, v.y, zoom);
    } else if (hoveredElement.type === "edge") {
      drawEdgeHighlight(
        ctx,
        screenX,
        screenY,
        hoveredElement.edgeIndex,
        size,
        zoom
      );
    }
  }

  // Update UI elements
  tileCountEl.textContent = Object.keys(map).length;
  zoomLevelEl.textContent = Math.round(zoom * 100);
  trackCountEl.textContent = trackCount;
}
