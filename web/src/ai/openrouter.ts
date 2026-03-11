import type { ModelInfo } from '../types';

// ============================================================
// OpenRouter API Service
// ============================================================

const API_BASE = 'https://openrouter.ai/api/v1';

export const RECOMMENDED_MODELS: ModelInfo[] = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', contextLength: 200000 },
  { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro', contextLength: 1048576 },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextLength: 1048576 },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', contextLength: 200000 },
  { id: 'openai/gpt-4o', name: 'GPT-4o', contextLength: 128000 },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', contextLength: 128000 },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', contextLength: 65536 },
];

export const NSFW_MODELS: ModelInfo[] = [
  { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', contextLength: 200000 },
  { id: 'x-ai/grok-3', name: 'Grok 3', contextLength: 131072 },
];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function* streamCompletion(
  apiKey: string,
  modelId: string,
  messages: ChatMessage[]
): AsyncGenerator<string, void, undefined> {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Dungen TRPG',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
      temperature: 0.85,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch { /* skip parse errors */ }
    }
  }
}

export async function getCompletion(
  apiKey: string,
  modelId: string,
  messages: ChatMessage[]
): Promise<string> {
  let result = '';
  for await (const chunk of streamCompletion(apiKey, modelId, messages)) {
    result += chunk;
  }
  return result;
}
