import { create } from "zustand";
import {
  DEFAULT_MODIFIERS,
  type Augment,
  type DungeonState,
  type GamePhase,
  type Modifiers,
  type PlayerProfile,
} from "./types";
import {
  ROWS,
  COLS,
  createInitialGrid,
  spawnRow,
  applyGravity,
  calcDropInterval,
} from "./engine/grid";
import { triggerExplosion } from "./engine/solver";
import { rollAugmentChoices } from "./data/augments";

const STORAGE_KEY = "chain-break-profile";

function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        currency: typeof parsed.currency === "number" ? parsed.currency : 0,
        persistentStats: {
          attackPower: parsed.persistentStats?.attackPower ?? 1.0,
          comboBonus: parsed.persistentStats?.comboBonus ?? 0.1,
          luck: parsed.persistentStats?.luck ?? 0,
          maxHP: parsed.persistentStats?.maxHP ?? 100,
        },
      };
    }
  } catch {
    /* ignore corrupt data */
  }
  return {
    currency: 0,
    persistentStats: { attackPower: 1.0, comboBonus: 0.1, luck: 0, maxHP: 100 },
  };
}

function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore storage errors */
  }
}

function applyModifier(
  modifiers: Modifiers,
  stat: string,
  value: number,
): void {
  switch (stat) {
    case "explosionRange":
      modifiers.explosionRange += value;
      break;
    case "energyMultiplier":
      modifiers.energyMultiplier *= value;
      break;
    case "dropSpeedMultiplier":
      modifiers.dropSpeedMultiplier *= value;
      break;
    case "comboBonusMultiplier":
      modifiers.comboBonusMultiplier *= value;
      break;
    case "minComboForEnergy":
      modifiers.minComboForEnergy = Math.max(
        modifiers.minComboForEnergy,
        value,
      );
      break;
    case "extraColors":
      modifiers.extraColors += value;
      break;
    case "tilePowerBonus":
      modifiers.tilePowerBonus += value;
      break;
    case "hpDrainPerSec":
      modifiers.hpDrainPerSec += value;
      break;
  }
}

interface GameStore {
  phase: GamePhase;
  profile: PlayerProfile;
  dungeon: DungeonState | null;
  augmentChoices: Augment[];
  explosionCounter: number;
  lastDestroyedCount: number;

  startRun: () => void;
  clickTile: (row: number, col: number) => void;
  dropNewRow: () => void;
  tickHP: (deltaMs: number) => void;
  selectAugment: (augment: Augment) => void;
  skipAugment: () => void;
  continueToMenu: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "MENU",
  profile: loadProfile(),
  dungeon: null,
  augmentChoices: [],
  explosionCounter: 0,
  lastDestroyedCount: 0,

  startRun: () => {
    const { profile } = get();
    const floor = 1;
    const maxHP = profile.persistentStats.maxHP;
    set({
      phase: "COMBAT",
      dungeon: {
        floor,
        hp: maxHP,
        maxHP,
        energy: 0,
        totalEnergy: 0,
        comboCount: 0,
        augments: [],
        grid: createInitialGrid(floor),
        dropInterval: calcDropInterval(floor, 1),
        nextAugmentAt: 50,
        modifiers: { ...DEFAULT_MODIFIERS },
      },
      augmentChoices: [],
      explosionCounter: 0,
      lastDestroyedCount: 0,
    });
  },

  clickTile: (row, col) => {
    const state = get();
    if (!state.dungeon || state.phase !== "COMBAT") return;
    const { dungeon, profile } = state;

    const result = triggerExplosion(
      dungeon.grid,
      row,
      col,
      ROWS,
      COLS,
      dungeon.modifiers.explosionRange,
    );
    if (result.destroyed === 0) return;

    const gridAfterGravity = applyGravity(result.grid);
    const comboCount = dungeon.comboCount + 1;
    const comboBonus =
      profile.persistentStats.comboBonus *
      dungeon.modifiers.comboBonusMultiplier;

    let energyGain =
      result.totalPower *
      profile.persistentStats.attackPower *
      (1 + comboCount * comboBonus);
    energyGain *= dungeon.modifiers.energyMultiplier;

    if (comboCount < dungeon.modifiers.minComboForEnergy) {
      energyGain = 0;
    }

    energyGain = Math.round(energyGain);
    const newEnergy = dungeon.energy + energyGain;
    const newTotalEnergy = dungeon.totalEnergy + energyGain;
    const shouldAugment = newEnergy >= dungeon.nextAugmentAt;

    const updatedDungeon: DungeonState = {
      ...dungeon,
      grid: gridAfterGravity,
      comboCount,
      energy: newEnergy,
      totalEnergy: newTotalEnergy,
      nextAugmentAt: shouldAugment
        ? dungeon.nextAugmentAt + 50
        : dungeon.nextAugmentAt,
    };

    if (shouldAugment) {
      set({
        dungeon: updatedDungeon,
        phase: "AUGMENT_SELECT",
        augmentChoices: rollAugmentChoices(profile.persistentStats.luck),
        explosionCounter: state.explosionCounter + 1,
        lastDestroyedCount: result.destroyed,
      });
    } else {
      set({
        dungeon: updatedDungeon,
        explosionCounter: state.explosionCounter + 1,
        lastDestroyedCount: result.destroyed,
      });
    }
  },

  dropNewRow: () => {
    const { dungeon, phase, profile } = get();
    if (!dungeon || phase !== "COMBAT") return;

    const { newGrid, overflowDamage } = spawnRow(
      dungeon.grid,
      dungeon.floor,
      dungeon.modifiers,
    );
    const gridAfterGravity = applyGravity(newGrid);
    const newHP = Math.max(dungeon.hp - overflowDamage, 0);

    if (newHP <= 0) {
      const earned = Math.floor(dungeon.totalEnergy * 0.1);
      const newProfile = { ...profile, currency: profile.currency + earned };
      saveProfile(newProfile);
      set({
        dungeon: { ...dungeon, grid: gridAfterGravity, hp: 0 },
        phase: "RESULT",
        profile: newProfile,
      });
    } else {
      set({
        dungeon: {
          ...dungeon,
          grid: gridAfterGravity,
          hp: newHP,
          comboCount: 0,
        },
      });
    }
  },

  tickHP: (deltaMs) => {
    const { dungeon, phase, profile } = get();
    if (!dungeon || phase !== "COMBAT") return;
    if (dungeon.modifiers.hpDrainPerSec <= 0) return;

    const drain = dungeon.modifiers.hpDrainPerSec * (deltaMs / 1000);
    const newHP = Math.max(dungeon.hp - drain, 0);

    if (newHP <= 0) {
      const earned = Math.floor(dungeon.totalEnergy * 0.1);
      const newProfile = { ...profile, currency: profile.currency + earned };
      saveProfile(newProfile);
      set({
        dungeon: { ...dungeon, hp: 0 },
        phase: "RESULT",
        profile: newProfile,
      });
    } else {
      set({ dungeon: { ...dungeon, hp: newHP } });
    }
  },

  selectAugment: (augment) => {
    const { dungeon } = get();
    if (!dungeon) return;

    const newModifiers = { ...dungeon.modifiers };
    applyModifier(newModifiers, augment.benefit.stat, augment.benefit.value);
    applyModifier(newModifiers, augment.penalty.stat, augment.penalty.value);

    let newGrid = dungeon.grid;
    if (augment.benefit.stat === "tilePowerBonus") {
      const bonus = augment.benefit.value;
      newGrid = dungeon.grid.map((row) =>
        row.map((tile) =>
          tile ? { ...tile, power: tile.power + bonus } : null,
        ),
      );
    }

    let newMaxHP = dungeon.maxHP;
    let newHP = dungeon.hp;
    if (augment.penalty.stat === "maxHP") {
      newMaxHP = Math.max(newMaxHP + augment.penalty.value, 10);
      newHP = Math.min(newHP, newMaxHP);
    }

    const newFloor = dungeon.floor + 1;
    set({
      phase: "COMBAT",
      dungeon: {
        ...dungeon,
        floor: newFloor,
        hp: newHP,
        maxHP: newMaxHP,
        grid: newGrid,
        dropInterval: calcDropInterval(
          newFloor,
          newModifiers.dropSpeedMultiplier,
        ),
        modifiers: newModifiers,
        augments: [...dungeon.augments, augment],
      },
      augmentChoices: [],
    });
  },

  skipAugment: () => {
    set({ phase: "COMBAT", augmentChoices: [] });
  },

  continueToMenu: () => {
    set({ phase: "MENU", dungeon: null });
  },
}));
