import type { EventDef } from '../types';

export const EVENT_DB: Record<string, EventDef> = {
  'EV-TRAP-001': {
    id: 'EV-TRAP-001',
    templateName: '鬆動石板陷阱',
    phase: 'EVENT',
    triggerContext: 'REST打斷 / 探索',
    eventType: '陷阱',
    descriptionStub: [
      '地面突然下陷，碎石與機關聲同時響起。',
      '你必須立刻反應，否則將承受損失。',
    ],
    jailbreakDescription: [
      '陷阱觸發，將你推向地面並極力磨蹭你的敏感私處。',
      '機械式的摩擦讓你幾乎要在慘叫中夾雜著嬌喘。',
    ],
    options: [
      {
        id: 'OP-TRAP-001-A',
        label: '迅速後撤（敏捷檢定）',
        requiredCheck: 'AGI檢定 (1D100 <= 50 + AGI*5 + 10)',
        successEffects: 'Upper/Lower耐久 -0；Phase->REST',
        failEffects: 'Upper耐久 -10；HP -8；Phase->REST',
      },
      {
        id: 'OP-TRAP-001-B',
        label: '硬扛通過',
        requiredCheck: '無',
        successEffects: 'HP -3；Upper耐久 -5；Phase->REST',
        failEffects: '無',
      },
    ],
    combatSpawn: null,
    stateChanges: ['HP', 'Upper', 'Phase'],
  },
};

/** Get a random event for current context */
export function getRandomEvent(): EventDef {
  const events = Object.values(EVENT_DB);
  return events[Math.floor(Math.random() * events.length)];
}
