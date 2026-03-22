import type { Augment } from "../types";

export const AUGMENT_POOL: Augment[] = [
  {
    id: "overload",
    name: "과부하",
    description: "폭발 시 십자 1칸 추가 폭발 | 최대 HP -20",
    rarity: "common",
    benefit: { stat: "explosionRange", value: 1 },
    penalty: { stat: "maxHP", value: -20 },
  },
  {
    id: "accelerator",
    name: "가속기",
    description: "에너지 획득량 ×1.5 | 타일 하강 속도 ×1.3",
    rarity: "common",
    benefit: { stat: "energyMultiplier", value: 1.5 },
    penalty: { stat: "dropSpeedMultiplier", value: 1.3 },
  },
  {
    id: "gambler",
    name: "도박꾼",
    description: "콤보 보너스 ×2 | 3콤보 미만 시 에너지 0",
    rarity: "rare",
    benefit: { stat: "comboBonusMultiplier", value: 2 },
    penalty: { stat: "minComboForEnergy", value: 3 },
  },
  {
    id: "purist",
    name: "순수주의",
    description: "에너지 획득량 ×3 | 색상 종류 +1 (5색)",
    rarity: "rare",
    benefit: { stat: "energyMultiplier", value: 3 },
    penalty: { stat: "extraColors", value: 1 },
  },
  {
    id: "rampage",
    name: "폭주",
    description: "모든 타일 power +2 | HP가 초당 1씩 감소",
    rarity: "legendary",
    benefit: { stat: "tilePowerBonus", value: 2 },
    penalty: { stat: "hpDrainPerSec", value: 1 },
  },
];

export function rollAugmentChoices(luck: number): Augment[] {
  const choices: Augment[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < 3; i++) {
    const roll = Math.random();
    const legendaryThreshold = 0.05 + luck;
    const rareThreshold = legendaryThreshold + 0.25;

    let targetRarity: Augment["rarity"];
    if (roll < legendaryThreshold) targetRarity = "legendary";
    else if (roll < rareThreshold) targetRarity = "rare";
    else targetRarity = "common";

    let pool = AUGMENT_POOL.filter(
      (a) => a.rarity === targetRarity && !usedIds.has(a.id),
    );
    if (pool.length === 0)
      pool = AUGMENT_POOL.filter((a) => !usedIds.has(a.id));
    if (pool.length === 0) pool = [...AUGMENT_POOL];

    const choice = pool[Math.floor(Math.random() * pool.length)];
    choices.push(choice);
    usedIds.add(choice.id);
  }

  return choices;
}
