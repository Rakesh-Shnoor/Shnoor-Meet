const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'deepseek/deepseek-r1-distill-qwen-32b';

export async function streamMeetingAssistant(messages, onChunk) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Missing VITE_OPENROUTER_API_KEY');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Shnoor Meetings',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    let message = `OpenRouter request failed (${response.status})`;

    try {
      const data = await response.json();
      message = data.error?.message || message;
    } catch {
      // Keep the fallback message when the error body is not JSON.
    }

    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith('data:')) {
        continue;
      }

      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') {
        continue;
      }

      try {
        const data = JSON.parse(payload);
        const delta = data.choices?.[0]?.delta?.content;
        if (delta) {
          onChunk(delta);
        }
      } catch {
        // Ignore malformed stream chunks from the provider.
      }
    }
  }
}
