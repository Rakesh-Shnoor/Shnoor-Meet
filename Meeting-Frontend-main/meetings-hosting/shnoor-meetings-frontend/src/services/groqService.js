const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export async function transcribeAudioChunk(audioBlob, language = 'en') {
  if (!GROQ_API_KEY) {
    throw new Error('Missing VITE_GROQ_API_KEY');
  }

  const file = new File([audioBlob], 'meeting-audio.webm', { type: 'audio/webm' });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');

  if (language && language !== 'auto') {
    formData.append('language', language);
  }

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Groq transcription failed (${response.status})`);
  }

  return data.text?.trim() || '';
}
