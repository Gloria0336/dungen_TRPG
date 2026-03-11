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

  // Add phase and DES context matrix
  if (state.players && state.players.length === 2) {
    const totalDes = state.players[0].des + state.players[1].des;
    context += '\n【動態敘事矩陣】\n';
    context += `- ${getPhaseFocusPrompt(state)}\n`;
    context += `- ${getDesTierPrompt(totalDes, state.nsgEnabled)}\n`;
  }

  // Strict combat narrative constraints
  if (state.phase === 'COMBAT') {
    context += '\n【戰鬥敘事鐵則 — 絕對禁止違反】\n';
    context += '1. 你絕對不可以描述任何目標死亡，除非系統資料明確標示「已擊殺」。即使造成大量傷害，只要目標 HP > 0，就必須描述其仍然存活（受傷、搖搖欲墜等皆可，但不可死亡）。\n';
    context += '2. 你必須嚴格按照 [本回合事件] 中的「對 XXX」來決定攻擊對象。絕對不可將攻擊對象替換成其他敵人或角色。\n';
    context += '3. 如果系統標示「目標已擊殺」，你才可以描述該敵人的死亡場景。\n';
    context += '4. 每段敘事的描述不可與 [敵人] 的 HP 資訊矛盾。\n';
  }

  return context;
}

function getPhaseFocusPrompt(state: GameState): string {
  if (state.phase === 'COMBAT') {
    const isBoss = state.enemies.some(e => e.tier === 'A');
    if (isBoss) {
      return '【階段敘事焦點：Boss戰鬥】放大強敵帶來的絕望感、體型差距、威壓，以及生死交關的壓迫感。';
    }
  }

  switch (state.phase) {
    case 'INIT': return '【階段敘事焦點：開局】描述剛踏入新環境時的冰冷感、未知的氣味，以及兩人的初次互動與姿態。';
    case 'EXPLORE': return '【階段敘事焦點：探索】描述他們推進地圖的過程，腳下的觸感、走廊的壓迫感以及四周的微小動靜。';
    case 'EVENT': return '【階段敘事焦點：事件】描述觸發機關、打開寶箱或遭遇突發狀況時的瞬間反應與後果。';
    case 'COMBAT': return '【階段敘事焦點：一般戰鬥】快速的交鋒與體感。描述他們如何應對敵人的攻擊，以及自身的動作發力點。';
    case 'REST': return '【階段敘事焦點：休息】描述兩人在安全區或營火旁的短暫停留與喘息時間，檢視自身狀態、整理裝備，或針對剛才發生的狀況進行低語交流。';
    case 'SHOP': return '【階段敘事焦點：商人】遭遇地牢中的神秘商人，進行交易或討價還價的互動與心理博弈。';
    case 'SPECIAL': return '【階段敘事焦點：特殊局】強調環境機制的壓迫感，如時間流逝、迫近的異象或特殊的劇本氛圍。';
    case 'END': return '【階段敘事焦點：終局】收束整場遊戲的命運，展示無可挽回的結果與終局畫面。';
    case 'CUSTOM': default: return '【階段敘事焦點：自訂】靈活應對未定劇本。以當下情境為主進行合理延伸。';
  }
}

function getDesTierPrompt(totalDes: number, nsgEnabled: boolean): string {
  if (!nsgEnabled) {
    if (totalDes <= 50) return '【狀態輔助：理智期】請強調角色的警戒心與戰鬥技巧，專注於推進地下城。';
    if (totalDes <= 100) return '【狀態輔助：動搖期】請加入疲勞感與壓迫感。角色的理智開始動搖，環境讓他們感到極大的心理壓力。';
    if (totalDes <= 150) return '【狀態輔助：崩潰邊緣】請放大角色內心的恐懼與絕望感。極限狀態下他們的意志瀕臨崩潰。';
    return '【狀態輔助：徹底絕望】請以極度沉重的史詩悲劇感為主，角色徹底被強敵與絕望吞噬，生存意志微弱。';
  }

  if (totalDes <= 50) {
    return '【狀態輔助：理智期】請強調角色的警戒心、戰鬥技巧與對環境的敏銳度。保持理智與專業，對誘惑或輕微觸碰心生警惕不為所動。';
  }
  if (totalDes <= 100) {
    return '【狀態輔助：動搖期】請加入疲勞感與微弱的情慾錯覺。理智開始鬆動，皮膚摩擦或敵人的氣味讓他們感到不自然的燥熱與分心，對痛楚的反應開始帶有些微麻癢。';
  }
  if (totalDes <= 150) {
    return '【狀態輔助：沉淪邊緣】請放大角色內心的矛盾與羞恥感。肉體開始背叛大腦，一舉一動帶著色氣的喘息，努力壓抑理智卻無法控制地對敵人的觸碰產生依賴與屈服感。';
  }
  return '【狀態輔助：完全墮落】請以極致的感官描寫為主，角色已徹底被慾望與本能吞噬。不再在乎生存，所有的行為、攻擊與事件都被視為帶來快感與凌辱的恩賜，充滿露骨與渴求的墮落氣息。';
}

/** Build scene summary from game state and combat results */
export function buildSceneSummary(
  state: GameState,
  combatResults?: CombatTurnResult[],
  extraContext?: string
): string {
  let summary = '【敘事要求】請以沉浸式小說筆法描述下方場景與事件。絕對不可輸出任何系統數值、屬性或判定結果。\n';
  summary += '【嚴格限制】絕對不可在故事中描寫角色去使用、食用或掏出不存在於下方[背包]清單中的任何道具、藥水或物資！必須百分之百忠於當前持有的實際物品紀錄。純敘事文字。\n\n';

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

  // Current Event
  if (state.phase === 'EVENT' && state.currentEvent) {
    summary += `[當前事件] ${state.currentEvent.templateName}\n`;
    const eventDesc = state.nsgEnabled && state.currentEvent.jailbreakDescription
      ? state.currentEvent.jailbreakDescription.join(' ')
      : state.currentEvent.descriptionStub.join(' ');
    summary += `事件描述: ${eventDesc}\n`;
    summary += `選項: ${state.currentEvent.options.map(o => o.label).join('、')}\n`;
  }

  // Combat results
  if (combatResults && combatResults.length > 0) {
    summary += '[本回合事件]\n';
    for (const r of combatResults) {
      summary += `- ${r.actorName} 使用「${r.action}」對 ${r.targetName || '未知目標'} → `;
      if (r.diceResults.length > 0) {
        const d = r.diceResults[0];
        summary += `1D100=${d.roll}, ${d.success ? '命中' : '未命中'}(門檻${d.threshold}%) `;
      }
      if (r.damageDealt > 0) summary += `→ 造成${r.damageDealt}點傷害 `;
      if (r.controlApplied) summary += `→ 施加控制${r.controlDuration}回合 `;
      if (r.upperChange) summary += `上衣耐久${r.upperChange} `;
      if (r.lowerChange) summary += `下衣耐久${r.lowerChange} `;

      // Append target current HP and alive status
      if (r.targetName && state.enemies.length > 0) {
        const targetEnemy = state.enemies.find(e => e.templateName === r.targetName);
        if (targetEnemy) {
          if (targetEnemy.isAlive) {
            summary += `[結果: ${r.targetName} 剩餘 HP ${targetEnemy.hp}/${targetEnemy.maxHp}, 尚未死亡]`;
          } else {
            summary += `[目標已擊殺]`;
          }
        }
      }
      // Check if target is a player (for healing/self-targeting skills)
      if (r.targetName && state.players) {
        const targetPlayer = state.players.find(p => r.targetName.includes(p.name));
        if (targetPlayer) {
          summary += `[${targetPlayer.name} 目前 HP ${targetPlayer.hp}/${targetPlayer.maxHp}]`;
        }
      }

      summary += '\n';
    }
  }

  // Inventory
  summary += `[背包] 金幣:${state.gold}`;
  if (state.inventory.length > 0) {
    summary += ` 物品:${state.inventory.map(i => `${i.name}x${i.quantity}`).join('、')}`;
  } else {
    summary += ` 物品:無`;
  }
  summary += '\n';

  if (extraContext) summary += `[額外] ${extraContext}\n`;

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

  // Add compressed narrative history (sliding window)
  const recentHistory = state.narrativeHistory.slice(-MAX_HISTORY);
  let userContent = '';

  if (recentHistory.length > 0) {
    const historyText = recentHistory
      .map((h) => `[第${h.floor}層 ${h.phase}] ${h.summary}`)
      .join('\n');
    userContent += `【前情提要】\n${historyText}\n\n---\n（請延續上述前情的氛圍，並根據下列最新場景進行後續敘事）\n\n`;
  }

  userContent += `【最新場景與狀態】\n${sceneSummary}`;

  // Build messages
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent }
  ];

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
