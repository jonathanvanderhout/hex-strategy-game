// ui.js
import { BUILDING_TYPES } from './buildingTypes.js';

export class UIManager {
  constructor(gameState, callbacks) {
    this.gameState = gameState;
    this.callbacks = callbacks;
    this.currentMode = 'place';
    this.selectedBuildingType = 'farm';
    
    this.createBuildingPaletteHTML();
    this.init();
  }
  
  createBuildingPaletteHTML() {
    const controlsDiv = document.getElementById('controls');
    if (!controlsDiv) {
      console.error('Controls div not found!');
      return;
    }
    
    const paletteHTML = `
      <div id="building-palette">
        <div style="font-size: 11px; margin-bottom: 5px; color: #aaa;">
          Select Building:
        </div>
        <div id="building-options"></div>
      </div>
    `;
    
    controlsDiv.insertAdjacentHTML('beforeend', paletteHTML);
    
    if (!document.getElementById('ui-styles')) {
      const style = document.createElement('style');
      style.id = 'ui-styles';
      style.textContent = `
        #building-palette {
          display: none;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #666;
        }
        #building-palette.visible {
          display: block;
        }
        .building-option {
          background: #333;
          color: white;
          border: 2px solid #555;
          padding: 6px 10px;
          margin: 3px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          display: inline-block;
        }
        .building-option.selected {
          background: #4a9eff;
          border-color: #4a9eff;
        }
        .building-option.locked {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .building-option:hover:not(.locked) {
          background: #444;
        }
        .building-option.selected:hover {
          background: #5aaaff;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  init() {
    this.setupModeButtons();
    this.setupBuildingPalette();
  }
  
  setupModeButtons() {
    document.querySelectorAll('.mode-button').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.mode-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        this.currentMode = button.dataset.mode;
        
        const palette = document.getElementById('building-palette');
        if (this.currentMode === 'building') {
          palette.classList.add('visible');
          this.updateBuildingPalette();
        } else {
          palette.classList.remove('visible');
        }
        
        if (this.callbacks.onModeChange) {
          this.callbacks.onModeChange(this.currentMode);
        }
      });
    });
  }
  
  setupBuildingPalette() {
    this.updateBuildingPalette();
  }
  
  updateBuildingPalette() {
    const container = document.getElementById('building-options');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.values(BUILDING_TYPES).forEach(buildingType => {
      const button = document.createElement('button');
      button.className = 'building-option';
      button.dataset.buildingType = buildingType.id;
      button.textContent = `${buildingType.emoji} ${buildingType.name}`;
      
      if (!buildingType.unlocked) {
        button.classList.add('locked');
        button.title = 'Locked - unlock by gathering resources';
      }
      
      if (buildingType.id === this.selectedBuildingType) {
        button.classList.add('selected');
      }
      
      button.addEventListener('click', () => {
        if (buildingType.unlocked) {
          this.selectedBuildingType = buildingType.id;
          this.updateBuildingPalette();
          
          if (this.callbacks.onBuildingSelect) {
            this.callbacks.onBuildingSelect(this.selectedBuildingType);
          }
        }
      });
      
      container.appendChild(button);
    });
  }
  
  getCurrentMode() {
    return this.currentMode;
  }
  
  getSelectedBuilding() {
    return this.selectedBuildingType;
  }
  
  refreshBuildingPalette() {
    if (this.currentMode === 'building') {
      this.updateBuildingPalette();
    }
  }
}