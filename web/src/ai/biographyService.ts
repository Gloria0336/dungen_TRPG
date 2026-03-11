import type { PlayerState } from '../types';
import { streamCompletion, type ChatMessage } from './openrouter';
import { NSG_SYSTEM_PROMPT, SFW_SYSTEM_PROMPT } from '../data/nsg';

// ============================================================
// Biography Service - generate background story dynamically
// ============================================================

export interface BioInput {
  race: string;
  age: string;
  appearance: string;
  background: string;
}

export async function* generateBiography(
  apiKey: string,
  modelId: string,
  player1Input: BioInput,
  player2Input: BioInput,
  player1State: Partial<PlayerState>,
  player2State: Partial<PlayerState>,
  nsgEnabled: boolean
): AsyncGenerator<string, void, undefined> {
  
  const basePrompt = nsgEnabled ? NSG_SYSTEM_PROMPT : SFW_SYSTEM_PROMPT;

  const systemContext = `
${basePrompt}

【任務說明】
你現在是遊戲的總導演，需要根據玩家提供的「角色初步設定」，寫出一段充滿沉浸感、適合地牢探索遊戲氛圍的「角色簡歷與開場背景故事」。
這段文字將作為這場冒險的起點，請生動描述她們是誰、長什麼樣、有什麼樣的過往，以及為何「剛踏入地牢入口」。
【重要設定】本作所有玩家角色均明確設定為女性。在描述外貌、姿態與心理時，請展現出女性特有的感官細節與美感。
不要輸出任何遊戲數值或屬性，純敘事文字。

【角色 1 設定】
名稱：${player1State.name}
職業：${player1State.className}
種族：${player1Input.race}
年齡：${player1Input.age}
外貌身材：${player1Input.appearance}
簡單經歷與身分：${player1Input.background}

【角色 2 設定】
名稱：${player2State.name}
職業：${player2State.className}
種族：${player2Input.race}
年齡：${player2Input.age}
外貌身材：${player2Input.appearance}
簡單經歷與身分：${player2Input.background}

請根據上述設定，寫出：
1. 兩人的簡單過往（或他們為何結伴同行）。
2. 在職業特色、種族特性與外貌的襯托下他們的姿態。
3. 他們剛抵達這座潮濕混亂地牢時的心境與場景。
`.trim();

  const messages: ChatMessage[] = [
    { role: 'system', content: basePrompt },
    { role: 'user', content: systemContext }
  ];

  yield* streamCompletion(apiKey, modelId, messages);
}
