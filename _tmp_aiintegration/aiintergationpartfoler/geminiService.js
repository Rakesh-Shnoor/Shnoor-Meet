const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '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';

const MODEL = 'deepseek/deepseek-r1-distill-qwen-32b'; 

export const askGemini = async (prompt, systemContext = "", imagesArray = []) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    
    const messages = [];
    if (systemContext) {
      messages.push({ role: 'system', content: systemContext });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Shnoor Meetings'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
      })
    });

    const data = await response.json();
    clearTimeout(timeoutId);

    if (!response.ok) {
       throw new Error(data.error?.message || `OpenRouter error: ${response.status}`);
    }

    return data.choices?.[0]?.message?.content || 'No response returned.';
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("OpenRouter API Error:", error);
    if (error.name === 'AbortError') throw new Error('API Request timed out. The DeepSeek model cluster might be overloaded right now.');
    throw new Error(error.message || 'Network or API error.');
  }
};
