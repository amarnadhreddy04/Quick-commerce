const SYNC_URL = process.env.SYNC_SERVICE_URL || 'http://localhost:3018';

export async function publishSyncEvent(event) {
  try {
    await fetch(`${SYNC_URL}/internal/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.warn(`[sync] Failed to publish event: ${error.message}`);
  }
}
