// Cross-tab and intra-app synchronization bus for ArcBounty

const CHANNEL_NAME = 'arcbounty_live_sync_bus';
let broadcastChannel = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('[Sync] BroadcastChannel unsupported, falling back to storage events');
}

/**
 * Trigger an immediate sync event across all open windows, tabs, and component trees
 */
export function triggerSync(payload = {}) {
  if (typeof window === 'undefined') return;

  // 1. Same-window custom event
  window.dispatchEvent(new CustomEvent('arcbounty:sync', { detail: payload }));

  // 2. Cross-window broadcast channel
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        timestamp: Date.now(),
        ...payload
      });
    }
  } catch (e) {}

  // 3. Storage event fallback for cross-tab notification
  try {
    const beacon = `${Date.now()}_${Math.random()}`;
    localStorage.setItem('botbounty_sync_beacon', beacon);
    localStorage.setItem('arcbounty_sync_beacon', beacon);
  } catch (e) {}
}

/**
 * Register a listener for synchronization triggers (same-tab, cross-tab, window focus)
 */
export function subscribeToSync(callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }

  // 1. Same-window event listener
  const handleCustomEvent = (e) => {
    callback(e.detail);
  };
  window.addEventListener('arcbounty:sync', handleCustomEvent);

  // 2. BroadcastChannel message listener
  const handleBroadcast = (e) => {
    callback(e.data);
  };
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  // 3. Cross-tab storage listener
  const handleStorage = (e) => {
    if (e.key === 'botbounty_sync_beacon' || e.key === 'botbounty_items_v5' || e.key === 'arcbounty_sync_beacon' || e.key === 'arcbounty_items_v4') {
      callback({ source: 'storage', key: e.key });
    }
  };
  window.addEventListener('storage', handleStorage);

  // 4. Window focus & tab visibility change listener
  const handleFocus = () => {
    callback({ source: 'focus' });
  };
  const handleVisibility = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      callback({ source: 'visibility' });
    }
  };
  window.addEventListener('focus', handleFocus);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibility);
  }

  // Cleanup function
  return () => {
    window.removeEventListener('arcbounty:sync', handleCustomEvent);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('focus', handleFocus);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibility);
    }
  };
}
