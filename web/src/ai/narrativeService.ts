import type { GameState, CombatTurnResult } from '../types';
import { NSG_SYSTEM_PROMPT, SFW_SYSTEM_PROMPT, CLASS_NARRATIVE_HINTS } from '../data/nsg';
import { MONSTER_DB } from '../data/monsters';
import { streamCompletion, type ChatMessage } from './openrouter';

// ============================================================
// Narrative Service - builds context & requests AI narrative
// ============================================================

const MAX_HISTORY = 10;
const MAX_SUMMARY_LEN = 200;

/** Build system prompt based on current context (minimal, ~5KB max) */
export function buildSystemPrompt(state: GameState): string {
  const base = state.nsgEnabled ? NSG_SYSTEM_PROMPT : SFW_SYSTEM_PROMPT;

  let context = base + '\n\n';

  // Add class narrative hints for current players
  if (state.players) {
    context += '【當前角色敘事提示】\n';
    for (const p of state.players) {
      const hint = CLASS_NARRATIVE_HINTS[p.className];
      if (hint) context += `- ${p.name}（${p.className}）：${hint}\n`;
    }
  }

  // Add current enemy descriptions
  if (state.enemies.length > 0 && state.phase === 'COMBAT') {
    context += '\n【場上敵人】\n';
    for (const e of state.enemies) {
      const def = MONSTER_DB[e.defId];
      if (def) {
        const behavior = state.nsgEnabled
          ? def.jailbreakBehavior?.join('；') ?? def.behaviorRules.join('；')
          : def.behaviorRules.join('；');
        context += `- ${e.templateName}(${e.familyTag}): ${behavior}\n`;
      }
    }
  }

  return context;
}

/** Build scene summary from game state and combat results */
export function buildSceneSummary(
  state: GameState,
  combatResults?: CombatTurnResult[],
  extraContext?: string
): string {
  let summary = '';

  // Basic scene info
  summary += `[場景] 第${state.floor}層/${state.maxFloor} ${state.phase}階段\n`;

  // Player status
  if (state.players) {
    for (let i = 0; i < 2; i++) {
      const p = state.players[i];
      summary += `[角色${i + 1}] ${p.name}(${p.className}) HP:${p.hp}/${p.maxHp} SP:${p.sp}/${p.maxSp} DES:${p.des}`;
      if (p.isControlled) summary += ' 【被控制中】';
      if (p.isBD) summary += ' 【BD狀態】';
      summary += ` 上衣耐久:${p.upperDurability} 下衣耐久:${p.lowerDurability} DR:${p.drPercent}%\n`;
    }
  }

  // Enemies
  if (state.enemies.length > 0) {
    for (const e of state.enemies) {
      if (e.isAlive) {
        summary += `[敵人] ${e.templateName}(${e.tier}類) HP:${e.hp}/${e.maxHp}`;
        if (e.isControlled) summary += ' 被控制';
        summary += '\n';
      }
    }
  }

  // Combat results
  if (combatResults && combatResults.length > 0) {
    summary += '[本回合事件]\n';
    for (const r of combatResults) {
      summary += `- ${r.actorName} 使用「${r.action}」→ `;
      if (r.diceResults.length > 0) {
        const d = r.diceResults[0];
        summary += `1D100=${d.roll}, ${d.success ? '命中' : '未命中'}(門檻${d.threshold}%) `;
      }
      if (r.damageDealt > 0) summary += `→ 造成${r.damageDealt}點傷害 `;
      if (r.controlApplied) summary += `→ 施加控制${r.controlDuration}回合 `;
      if (r.upperChange) summary += `上衣耐久${r.upperChange} `;
      if (r.lowerChange) summary += `下衣耐久${r.lowerChange} `;
      summary += '\n';
    }
  }

  // Inventory
  summary += `[背包] 金幣:${state.gold}`;
  if (state.inventory.length > 0) {
    summary += ` 物品:${state.inventory.map(i => `${i.name}x${i.quantity}`).join('、')}`;
  }
  summary += '\n';

  if (extraContext) summary += `[額外] ${extraContext}\n`;

  summary += '\n請以沉浸式敘事描述上述場景，不要輸出任何數值或判定結果，純敘事文字。';

  return summary;
}

/** Request narrative from AI with sliding window context */
export async function* requestNarrative(
  apiKey: string,
  modelId: string,
  state: GameState,
  combatResults?: CombatTurnResult[],
  extraContext?: string
): AsyncGenerator<string, void, undefined> {
  const systemPrompt = buildSystemPrompt(state);
  const sceneSummary = buildSceneSummary(state, combatResults, extraContext);

  // Build messages with sliding window
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add compressed narrative history (sliding window)
  const recentHistory = state.narrativeHistory.slice(-MAX_HISTORY);
  if (recentHistory.length > 0) {
    const historyText = recentHistory
      .map((h) => `[第${h.floor}層 ${h.phase}] ${h.summary}`)
      .join('\n');
    messages.push({
      role: 'user',
      content: `【前情提要】\n${historyText}\n\n---\n以上是前情提要，請據此維持敘事連貫性。`,
    });
    messages.push({
      role: 'assistant',
      content: '（已理解前情，將據此繼續敘事。）',
    });
  }

  // Current scene
  messages.push({ role: 'user', content: sceneSummary });

  // Stream response
  yield* streamCompletion(apiKey, modelId, messages);
}

/** Compress a full narrative text into a short summary */
export function compressNarrative(fullText: string): string {
  // Take first 200 chars as summary
  const cleaned = fullText.replace(/\n/g, ' ').trim();
  if (cleaned.length <= MAX_SUMMARY_LEN) return cleaned;
  return cleaned.slice(0, MAX_SUMMARY_LEN) + '...';
}

/** Add narrative to history */
export function addNarrativeToHistory(
  state: GameState,
  fullText: string
): void {
  state.narrativeHistory.push({
    timestamp: Date.now(),
    phase: state.phase,
    floor: state.floor,
    summary: compressNarrative(fullText),
    fullText,
  });

  // Keep only recent entries
  if (state.narrativeHistory.length > MAX_HISTORY * 2) {
    state.narrativeHistory = state.narrativeHistory.slice(-MAX_HISTORY);
  }
}
