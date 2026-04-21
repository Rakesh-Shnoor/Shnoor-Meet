const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const wsBaseUrl = (import.meta.env.VITE_WS_BASE_URL || '').replace(/\/$/, '');

export function buildApiUrl(path) {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with "/": ${path}`);
  }

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

export function buildWebSocketUrl(path) {
  if (!path.startsWith('/')) {
    throw new Error(`WebSocket path must start with "/": ${path}`);
  }

  if (wsBaseUrl) {
    return `${wsBaseUrl}${path}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}
