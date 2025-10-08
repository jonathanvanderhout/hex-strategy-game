// buildingTypes.js

export const BUILDING_TYPES = {
  // Tier 1 - Resource Gatherers (no inputs)
  FARM: {
    id: 'farm',
    name: 'Farm',
    emoji: '🌾',
    allowedTerrain: ['GRASS'],
    produces: { type: 'food', amount: 1 },
    consumes: [],
    productionSpeed: 0.003, // progress per frame (smaller = slower)
    unlocked: true,
  },
  
  LUMBERYARD: {
    id: 'lumberyard',
    name: 'Lumberyard',
    emoji: '🪵',
    allowedTerrain: ['FOREST'],
    produces: { type: 'wood', amount: 1 },
    consumes: [],
    productionSpeed: 0.005,
    unlocked: true,
  },
  
  MINE: {
    id: 'mine',
    name: 'Mine',
    emoji: '⛏️',
    allowedTerrain: ['MOUNTAIN'],
    produces: { type: 'ore', amount: 1 },
    consumes: [],
    productionSpeed: 0.0025,
    unlocked: false,
  },
  
  QUARRY: {
    id: 'quarry',
    name: 'Quarry',
    emoji: '🪨',
    allowedTerrain: ['MOUNTAIN'],
    produces: { type: 'stone', amount: 1 },
    consumes: [],
    productionSpeed: 0.003,
    unlocked: false,
  },
  
  // Tier 2 - Processors (need inputs)
  SAWMILL: {
    id: 'sawmill',
    name: 'Sawmill',
    emoji: '🏭',
    allowedTerrain: ['GRASS', 'SAND', 'FOREST'],
    produces: { type: 'planks', amount: 1 },
    consumes: [{ type: 'wood', amount: 2 }],
    productionSpeed: 0.002,
    unlocked: false,
  },
  
  SMELTER: {
    id: 'smelter',
    name: 'Smelter',
    emoji: '🔥',
    allowedTerrain: ['GRASS', 'SAND', 'MOUNTAIN'],
    produces: { type: 'metal', amount: 1 },
    consumes: [{ type: 'ore', amount: 2 }],
    productionSpeed: 0.0015,
    unlocked: false,
  },
  
  // Special buildings
  HUB: {
    id: 'hub',
    name: 'Hub',
    emoji: '🏛️',
    allowedTerrain: ['GRASS'],
    produces: null,
    consumes: [],
    productionSpeed: 0,
    unlocked: true,
    isHub: true,
  },
};

// Helper function to get building type by id
export function getBuildingType(id) {
  return Object.values(BUILDING_TYPES).find(type => type.id === id);
}

// Helper function to check if building can be placed on terrain
export function canPlaceBuilding(buildingTypeId, terrainType) {
  const buildingType = getBuildingType(buildingTypeId);
  if (!buildingType) return false;
  return buildingType.allowedTerrain.includes(terrainType);
}