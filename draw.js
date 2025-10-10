/**
 * Optimized drawing module for hexagon terrain map
 * Performance improvements:
 * - Batch rendering by terrain type
 * - Conditional text rendering based on zoom
 * - Cached hex path for reuse
 * - Reduced overdraw with smarter culling
 */

import {
  hexToPixel,
  pixelToHex,
  getHexVertices,
  getNeighbor,
} from "./hexUtils.js";

function lightenColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Create a reusable hex path
function createHexPath(size) {
  const path = new Path2D();
  const angles = [0, 60, 120, 180, 240, 300];

  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * angles[i];
    const x = size * Math.cos(angleRad);
    const y = size * Math.sin(angleRad);

    if (i === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  path.closePath();
  return path;
}

// Batch draw hexes of the same terrain type
function drawHexBatch(ctx, hexes, terrain, size, zoom, showLabels) {
  if (hexes.length === 0) return;

  // Create hex path once
  const hexPath = createHexPath(size);

  // Draw all fills
  ctx.fillStyle = terrain.color;
  hexes.forEach(({ screenX, screenY }) => {
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.fill(hexPath);
    ctx.restore();
  });

  // Draw all strokes
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1 * zoom;
  hexes.forEach(({ screenX, screenY }) => {
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.stroke(hexPath);
    ctx.restore();
  });

  // Draw labels only if zoomed in enough
  if (showLabels) {
    ctx.fillStyle = "#000";
    ctx.font = `${12 * zoom}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    hexes.forEach(({ screenX, screenY, col, row }) => {
      ctx.fillText(`${col},${row}`, screenX, screenY);
    });
  }
}

// Draw hovered hex separately
function drawHoveredHex(
  ctx,
  centerX,
  centerY,
  terrain,
  col,
  row,
  size,
  zoom,
  showLabels
) {
  const hexPath = createHexPath(size);

  ctx.save();
  ctx.translate(centerX, centerY);

  ctx.fillStyle = lightenColor(terrain.color, 30);
  ctx.fill(hexPath);

  ctx.strokeStyle = "#ffcc00";
  ctx.lineWidth = 2 * zoom;
  ctx.stroke(hexPath);

  ctx.restore();

  // Draw label
  if (showLabels) {
    ctx.fillStyle = "#000";
    ctx.font = `${12 * zoom}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${col},${row}`, centerX, centerY);
  }
}

function drawVertexHighlight(ctx, x, y, zoom) {
  ctx.beginPath();
  ctx.arc(x, y, 6 * zoom, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 204, 0, 0.5)";
  ctx.fill();
  ctx.strokeStyle = "#ffcc00";
  ctx.lineWidth = 2 * zoom;
  ctx.stroke();
}

function drawEdgeHighlight(ctx, centerX, centerY, edgeIndex, size, zoom) {
  const vertices = getHexVertices(centerX, centerY, size);
  const v1 = vertices[edgeIndex];
  const v2 = vertices[(edgeIndex + 1) % 6];

  ctx.beginPath();
  ctx.moveTo(v1.x, v1.y);
  ctx.lineTo(v2.x, v2.y);
  ctx.strokeStyle = "#ffcc00";
  ctx.lineWidth = 6 * zoom;
  ctx.stroke();

  const midX = (v1.x + v2.x) / 2;
  const midY = (v1.y + v2.y) / 2;
  ctx.beginPath();
  ctx.arc(midX, midY, 5 * zoom, 0, Math.PI * 2);
  ctx.fillStyle = "#ffcc00";
  ctx.fill();
}

function drawBuilding(ctx, col, row, camera, size, zoom, building) {
  const pos = hexToPixel(col, row, size);
  const screenX = pos.x + camera.x;
  const screenY = pos.y + camera.y;
  switch (building.type) {
    case "lumberyard":
      drawLumberyard(ctx, col, row, camera, size, zoom);
      break;
    case "hub":
      drawHub(ctx, col, row, camera, size, zoom);
      break;
    case "farm":
      drawFarm(ctx, col, row, camera, size, zoom);
      break;
  }

  drawInventoryStacks(ctx, screenX, screenY, building.inventory, size, zoom);
}

/**
 * Draw inventory stacks around a building
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} centerX - Building center X position (screen space)
 * @param {number} centerY - Building center Y position (screen space)
 * @param {Object} inventory - Inventory object with inputs/outputs
 * @param {number} size - Hex size
 * @param {number} zoom - Current zoom level
 */
function drawInventoryStacks(ctx, centerX, centerY, inventory, size, zoom) {
  // Resource visual configurations
  const resourceStyles = {
    wood: {
      color: "#8B4513",
      highlightColor: "#A0522D",
      shape: "logs", // stacked logs
      stackHeight: 3,
    },
    iron_ore: {
      color: "#696969",
      highlightColor: "#808080",
      shape: "pile", // pile of rocks
      stackHeight: 2,
    },
    coal: {
      color: "#1a1a1a",
      highlightColor: "#333333",
      shape: "pile",
      stackHeight: 2,
    },
    iron_ingot: {
      color: "#B0C4DE",
      highlightColor: "#D3D3D3",
      shape: "bars", // metal bars
      stackHeight: 4,
    },
    steel: {
      color: "#4682B4",
      highlightColor: "#5F9EA0",
      shape: "bars",
      stackHeight: 4,
    },
  };

  // Collect all resources from inputs and outputs
  const allResources = [];

  if (inventory.inputs) {
    for (const [type, amount] of Object.entries(inventory.inputs)) {
      if (amount > 0) {
        allResources.push({ type, amount, category: "input" });
      }
    }
  }

  if (inventory.outputs) {
    for (const [type, amount] of Object.entries(inventory.outputs)) {
      if (amount > 0) {
        allResources.push({ type, amount, category: "output" });
      }
    }
  }

  if (allResources.length === 0) return;

  // Calculate positions around the building
  const stackDistance = size * 0.4; // Distance from building center
  const baseStackSize = size * 0.12; // Base size of each stack

  // Distribute resources around the building
  allResources.forEach((resource, index) => {
    const angle = (index / allResources.length) * Math.PI * 2 - Math.PI / 2;
    const stackX = centerX + Math.cos(angle) * stackDistance;
    const stackY = centerY + Math.sin(angle) * stackDistance;

    const style = resourceStyles[resource.type] || {
      color: "#888888",
      highlightColor: "#aaaaaa",
      shape: "pile",
      stackHeight: 2,
    };

    // Calculate number of visible stacks (max 5 visual stacks)
    const visualStacks = Math.min(
      5,
      Math.ceil(resource.amount / style.stackHeight)
    );

    ctx.save();

    // Draw based on shape type
    switch (style.shape) {
      case "logs":
        drawLogStack(
          ctx,
          stackX,
          stackY,
          visualStacks,
          baseStackSize,
          style,
          zoom
        );
        break;
      case "bars":
        drawBarStack(
          ctx,
          stackX,
          stackY,
          visualStacks,
          baseStackSize,
          style,
          zoom
        );
        break;
      case "pile":
      default:
        drawPileStack(
          ctx,
          stackX,
          stackY,
          visualStacks,
          baseStackSize,
          style,
          zoom
        );
        break;
    }

    // Draw amount label if zoomed in
    if (zoom > 0.6) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.font = `bold ${10 * zoom}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const labelY = stackY - baseStackSize * 1.5;
      ctx.strokeText(resource.amount, stackX, labelY);
      ctx.fillText(resource.amount, stackX, labelY);
    }

    ctx.restore();
  });
}

/**
 * Draw stacked logs
 */
function drawLogStack(ctx, x, y, count, baseSize, style, zoom) {
  const logWidth = baseSize * 1.5;
  const logHeight = baseSize * 0.4;

  for (let i = 0; i < count; i++) {
    const offsetY = y + baseSize - i * logHeight * 0.7;

    // Main log body
    ctx.fillStyle = style.color;
    ctx.fillRect(
      x - logWidth / 2,
      offsetY - logHeight / 2,
      logWidth,
      logHeight
    );

    // Wood grain lines
    ctx.strokeStyle = style.highlightColor;
    ctx.lineWidth = 1 * zoom;
    for (let j = 0; j < 3; j++) {
      const lineX = x - logWidth / 2 + (logWidth / 4) * (j + 0.5);
      ctx.beginPath();
      ctx.moveTo(lineX, offsetY - logHeight / 2);
      ctx.lineTo(lineX, offsetY + logHeight / 2);
      ctx.stroke();
    }

    // End caps (circular)
    ctx.fillStyle = style.highlightColor;
    ctx.beginPath();
    ctx.arc(x - logWidth / 2, offsetY, logHeight / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + logWidth / 2, offsetY, logHeight / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw metal bars
 */
function drawBarStack(ctx, x, y, count, baseSize, style, zoom) {
  const barWidth = baseSize * 0.3;
  const barLength = baseSize * 1.8;

  for (let i = 0; i < count; i++) {
    const offsetX = x + (i - count / 2) * barWidth * 0.8;

    // Main bar
    ctx.fillStyle = style.color;
    ctx.fillRect(
      offsetX - barWidth / 2,
      y - barLength / 2,
      barWidth,
      barLength
    );

    // Highlight edge
    ctx.fillStyle = style.highlightColor;
    ctx.fillRect(
      offsetX - barWidth / 2,
      y - barLength / 2,
      barWidth * 0.3,
      barLength
    );

    // Border
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 0.5 * zoom;
    ctx.strokeRect(
      offsetX - barWidth / 2,
      y - barLength / 2,
      barWidth,
      barLength
    );
  }
}

/**
 * Draw pile of resources (ore, coal, etc)
 */
function drawPileStack(ctx, x, y, count, baseSize, style, zoom) {
  const pileWidth = baseSize * 1.2;
  const pileHeight = baseSize * 0.8;

  for (let i = 0; i < count; i++) {
    const offsetY = y + baseSize * 0.5 - i * pileHeight * 0.5;
    const width = pileWidth * (1 - i * 0.1); // Taper as stacks go up

    // Draw pile as irregular mound
    ctx.fillStyle = style.color;
    ctx.beginPath();
    ctx.ellipse(x, offsetY, width / 2, pileHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add some texture with smaller chunks
    ctx.fillStyle = style.highlightColor;
    for (let j = 0; j < 4; j++) {
      const chunkX = x + (Math.random() - 0.5) * width * 0.6;
      const chunkY = offsetY + (Math.random() - 0.5) * pileHeight * 0.4;
      const chunkSize = baseSize * 0.15;

      ctx.beginPath();
      ctx.arc(chunkX, chunkY, chunkSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outline
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 0.5 * zoom;
    ctx.beginPath();
    ctx.ellipse(x, offsetY, width / 2, pileHeight / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}
function drawFarm(ctx, col, row, camera, size, zoom) {
  const pos = hexToPixel(col, row, size);
  const screenX = pos.x + camera.x;
  const screenY = pos.y + camera.y;
  const buildingSize = size * 0.7;

  ctx.save();

  // Barn
  ctx.fillStyle = "#8b0000";
  ctx.fillRect(
    screenX - buildingSize / 3,
    screenY - buildingSize / 4,
    buildingSize * 0.4,
    buildingSize * 0.35
  );

  // Barn roof
  ctx.fillStyle = "#654321";
  ctx.beginPath();
  ctx.moveTo(screenX - buildingSize / 3 - 5, screenY - buildingSize / 4);
  ctx.lineTo(
    screenX - buildingSize / 3 + buildingSize * 0.2,
    screenY - buildingSize / 4 - buildingSize * 0.2
  );
  ctx.lineTo(
    screenX - buildingSize / 3 + buildingSize * 0.4 + 5,
    screenY - buildingSize / 4
  );
  ctx.closePath();
  ctx.fill();

  // Barn door
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(
    screenX - buildingSize / 6,
    screenY,
    buildingSize * 0.12,
    buildingSize * 0.11
  );

  // Fence
  ctx.strokeStyle = "#8b4513";
  ctx.lineWidth = 2 * zoom;
  for (let i = 0; i < 5; i++) {
    const x = screenX + buildingSize / 6 + i * (buildingSize * 0.12);
    ctx.beginPath();
    ctx.moveTo(x, screenY - buildingSize / 8);
    ctx.lineTo(x, screenY + buildingSize / 8);
    ctx.stroke();
  }

  // Horizontal fence rails
  ctx.beginPath();
  ctx.moveTo(screenX + buildingSize / 6, screenY - buildingSize / 16);
  ctx.lineTo(
    screenX + buildingSize / 6 + buildingSize * 0.48,
    screenY - buildingSize / 16
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(screenX + buildingSize / 6, screenY + buildingSize / 16);
  ctx.lineTo(
    screenX + buildingSize / 6 + buildingSize * 0.48,
    screenY + buildingSize / 16
  );
  ctx.stroke();

  // Hay bales
  ctx.fillStyle = "#daa520";
  ctx.fillRect(
    screenX - buildingSize / 2.5,
    screenY + buildingSize / 8,
    buildingSize * 0.15,
    buildingSize * 0.12
  );
  ctx.fillRect(
    screenX - buildingSize / 6,
    screenY + buildingSize / 6,
    buildingSize * 0.15,
    buildingSize * 0.12
  );

  // Hay texture
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 1 * zoom;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(
      screenX - buildingSize / 2.5,
      screenY + buildingSize / 8 + i * 5
    );
    ctx.lineTo(
      screenX - buildingSize / 2.5 + buildingSize * 0.15,
      screenY + buildingSize / 8 + i * 5
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawHub(ctx, col, row, camera, size, zoom) {
  const pos = hexToPixel(col, row, size);
  const screenX = pos.x + camera.x;
  const screenY = pos.y + camera.y;
  const buildingSize = size * 0.8;

  ctx.save();

  const mainSize = buildingSize * 0.5;

  ctx.fillStyle = "#8b9dc3";
  ctx.fillRect(
    screenX - mainSize / 2,
    screenY - mainSize / 2,
    mainSize,
    mainSize
  );

  ctx.fillStyle = "#6a7ba3";
  ctx.fillRect(screenX - mainSize / 2, screenY - mainSize / 2 - 8, mainSize, 8);

  ctx.fillStyle = "#9fafc9";
  ctx.fillRect(
    screenX - mainSize / 2 - mainSize * 0.3,
    screenY - mainSize / 4,
    mainSize * 0.3,
    mainSize / 2
  );
  ctx.fillRect(
    screenX + mainSize / 2,
    screenY - mainSize / 4,
    mainSize * 0.3,
    mainSize / 2
  );

  ctx.fillStyle = "#ffeb99";
  const windowSize = mainSize * 0.12;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillRect(
        screenX - mainSize / 3 + col * mainSize * 0.4,
        screenY - mainSize / 4 + row * mainSize * 0.35,
        windowSize,
        windowSize
      );
    }
  }

  ctx.fillStyle = "#4a5568";
  ctx.fillRect(
    screenX - mainSize / 6,
    screenY + mainSize / 4,
    mainSize / 3,
    mainSize / 4
  );

  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = ((Math.PI * 2) / 5) * i - Math.PI / 2;
    const x = screenX + Math.cos(angle) * mainSize * 0.15;
    const y = screenY - mainSize / 2 - 15 + Math.sin(angle) * mainSize * 0.15;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawLumberyard(ctx, col, row, camera, size, zoom) {
  const pos = hexToPixel(col, row, size);
  const screenX = pos.x + camera.x;
  const screenY = pos.y + camera.y;
  const buildingSize = size * 0.6;

  ctx.save();

  const roofHeight = buildingSize * 0.4;

  ctx.fillStyle = "#888888";
  ctx.fillRect(
    screenX - buildingSize / 2,
    screenY + buildingSize / 4,
    buildingSize,
    buildingSize * 0.15
  );

  ctx.fillStyle = "#a0826d";
  ctx.fillRect(
    screenX - buildingSize / 2,
    screenY - buildingSize / 4,
    buildingSize,
    buildingSize / 2
  );

  ctx.strokeStyle = "#8b6f47";
  ctx.lineWidth = 2 * zoom;
  for (let i = 0; i <= 6; i++) {
    const x = screenX - buildingSize / 2 + (buildingSize / 6) * i;
    ctx.beginPath();
    ctx.moveTo(x, screenY - buildingSize / 4);
    ctx.lineTo(x, screenY + buildingSize / 4);
    ctx.stroke();
  }

  ctx.fillStyle = "#704214";
  ctx.beginPath();
  ctx.moveTo(screenX - buildingSize / 2 - 5, screenY - buildingSize / 4);
  ctx.lineTo(screenX, screenY - buildingSize / 4 - roofHeight);
  ctx.lineTo(screenX + buildingSize / 2 + 5, screenY - buildingSize / 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#a0522d";
  ctx.fillRect(
    screenX + buildingSize / 4,
    screenY - buildingSize / 4 - roofHeight + 5,
    buildingSize * 0.12,
    roofHeight * 0.6
  );

  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(
    screenX - buildingSize / 3,
    screenY - buildingSize / 8,
    buildingSize * 0.15,
    buildingSize * 0.15
  );
  ctx.fillRect(
    screenX + buildingSize / 6,
    screenY - buildingSize / 8,
    buildingSize * 0.15,
    buildingSize * 0.15
  );

  ctx.restore();
}

function drawTrackBetweenHexes(ctx, hex1, hex2, camera, size, zoom) {
  const pos1 = hexToPixel(hex1.col, hex1.row, size);
  const pos2 = hexToPixel(hex2.col, hex2.row, size);

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

  const numTies = 5;
  const tieWidth = size * 0.15;
  const tieThickness = 1.5 * zoom;

  ctx.strokeStyle = "#4a3a2a";
  ctx.lineWidth = tieThickness;

  for (let i = 0; i <= numTies; i++) {
    const t = i / numTies;
    const mx = v1.x + (v2.x - v1.x) * t;
    const my = v1.y + (v2.y - v1.y) * t;

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

  const railOffset = size * 0.08;
  const railThickness = 2 * zoom;

  ctx.strokeStyle = "#708090";
  ctx.lineWidth = railThickness;

  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const perpX = (-dy / len) * railOffset;
  const perpY = (dx / len) * railOffset;

  ctx.beginPath();
  ctx.moveTo(v1.x - perpX, v1.y - perpY);
  ctx.lineTo(v2.x - perpX, v2.y - perpY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(v1.x + perpX, v1.y + perpY);
  ctx.lineTo(v2.x + perpX, v2.y + perpY);
  ctx.stroke();
}

function drawTrain(ctx, hex1, hex2, progress, cargo, camera, size, zoom) {
  const pos1 = hexToPixel(hex1.col, hex1.row, size);

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

  const trainX = v1.x + (v2.x - v1.x) * progress;
  const trainY = v1.y + (v2.y - v1.y) * progress;

  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const angle = Math.atan2(dy, dx);

  const trainLength = size * 0.3;
  const trainWidth = size * 0.15;

  ctx.save();
  ctx.translate(trainX, trainY);
  ctx.rotate(angle);

  ctx.fillStyle = "#c41e3a";
  ctx.fillRect(-trainLength / 2, -trainWidth / 2, trainLength, trainWidth);
  ctx.strokeStyle = "#8b0000";
  ctx.lineWidth = 1.5 * zoom;
  ctx.strokeRect(-trainLength / 2, -trainWidth / 2, trainLength, trainWidth);

  ctx.fillStyle = "#ffeb3b";
  const windowWidth = trainLength * 0.25;
  const windowHeight = trainWidth * 0.5;
  const windowSpacing = trainLength * 0.15;

  ctx.fillRect(
    -windowSpacing - windowWidth / 2,
    -windowHeight / 2,
    windowWidth,
    windowHeight
  );
  ctx.fillRect(
    windowSpacing - windowWidth / 2,
    -windowHeight / 2,
    windowWidth,
    windowHeight
  );

  ctx.restore();
  drawInventoryStacks(ctx, trainX, trainY, { inputs: cargo }, size, zoom);
}

function getVisibleHexRange(canvas, camera, size) {
  const width = size * 2;
  const height = Math.sqrt(3) * size;
  const margin = 2; // Reduced margin

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
 * Main optimized draw function
 */
export function draw(ctx, params) {
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

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const range = getVisibleHexRange(canvas, camera, size);

  // Only show labels when zoomed in (zoom > 0.5)
  const showLabels = zoom > 0.5;

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

  // Batch draw hexes by terrain type
  for (const terrainKey in hexesByTerrain) {
    const { terrain, hexes } = hexesByTerrain[terrainKey];
    drawHexBatch(ctx, hexes, terrain, size, zoom, showLabels);
  }

  // Draw hovered hex on top
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

  // Draw tracks
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

  // Draw buildings
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

  // Draw trains
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
          ctx,
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

  // Draw hover highlights
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

  // Update UI
  tileCountEl.textContent = Object.keys(map).length;
  zoomLevelEl.textContent = Math.round(zoom * 100);
  trackCountEl.textContent = trackCount;
  if (trainCountEl && trains) {
    trainCountEl.textContent = trains.length;
  }
}
