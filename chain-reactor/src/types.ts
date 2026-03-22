export type TileColor = "R" | "G" | "B" | "Y" | "P";
export type TileType = "basic" | "power" | "volatile";

export interface Tile {
  type: TileType;
  color: TileColor;
  power: number;
}

export interface Augment {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "legendary";
  benefit: { stat: string; value: number };
  penalty: { stat: string; value: number };
}

export interface PlayerProfile {
  currency: number;
  persistentStats: {
    attackPower: number;
    comboBonus: number;
    luck: number;
    maxHP: number;
  };
}

export type GamePhase = "MENU" | "COMBAT" | "AUGMENT_SELECT" | "RESULT";

export interface Modifiers {
  explosionRange: number;
  energyMultiplier: number;
  dropSpeedMultiplier: number;
  comboBonusMultiplier: number;
  minComboForEnergy: number;
  extraColors: number;
  tilePowerBonus: number;
  hpDrainPerSec: number;
}

export const DEFAULT_MODIFIERS: Modifiers = {
  explosionRange: 0,
  energyMultiplier: 1,
  dropSpeedMultiplier: 1,
  comboBonusMultiplier: 1,
  minComboForEnergy: 0,
  extraColors: 0,
  tilePowerBonus: 0,
  hpDrainPerSec: 0,
};

export interface DungeonState {
  floor: number;
  hp: number;
  maxHP: number;
  energy: number;
  totalEnergy: number;
  comboCount: number;
  augments: Augment[];
  grid: (Tile | null)[][];
  dropInterval: number;
  nextAugmentAt: number;
  modifiers: Modifiers;
}
