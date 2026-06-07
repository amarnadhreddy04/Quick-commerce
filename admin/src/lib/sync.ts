const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/api$/, '');

export type SyncDomains = 'catalog' | 'orders' | 'settings' | 'users' | 'areas';

export function subscribeSyncEvents(onEvent: (event: { domain?: SyncDomains }) => void) {
  const source = new EventSource(`${API_BASE}/api/sync/events`);

  source.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data);
      if (event.type === 'sync' && event.domain) {
        onEvent(event);
      }
    } catch {
      // Ignore malformed events
    }
  };

  return () => source.close();
}
