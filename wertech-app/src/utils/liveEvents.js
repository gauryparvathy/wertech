import { getAccessToken } from './authClient';

export function subscribeUserEvents(username, handlers = {}) {
  const cleanUsername = String(username || '').trim();
  if (!cleanUsername) return () => {};

  let closed = false;
  let eventSource = null;
  let retryMs = 1200;
  let retryTimer = null;

  const onAnyEvent = typeof handlers.onEvent === 'function' ? handlers.onEvent : () => {};

  const connect = () => {
    if (closed) return;
    const token = getAccessToken();
    if (!token) return;
    const url = `/api/events/${encodeURIComponent(cleanUsername)}?access_token=${encodeURIComponent(token)}`;
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      retryMs = 1200;
    };

    eventSource.addEventListener('message_update', (event) => {
      try {
        onAnyEvent('message_update', JSON.parse(event.data || '{}'));
      } catch (err) {
        onAnyEvent('message_update', {});
      }
    });

    eventSource.addEventListener('notification_update', (event) => {
      try {
        onAnyEvent('notification_update', JSON.parse(event.data || '{}'));
      } catch (err) {
        onAnyEvent('notification_update', {});
      }
    });

    eventSource.addEventListener('wallet_update', (event) => {
      try {
        onAnyEvent('wallet_update', JSON.parse(event.data || '{}'));
      } catch (err) {
        onAnyEvent('wallet_update', {});
      }
    });

    eventSource.addEventListener('transaction_update', (event) => {
      try {
        onAnyEvent('transaction_update', JSON.parse(event.data || '{}'));
      } catch (err) {
        onAnyEvent('transaction_update', {});
      }
    });

    eventSource.addEventListener('call_signal', (event) => {
      try {
        onAnyEvent('call_signal', JSON.parse(event.data || '{}'));
      } catch (err) {
        onAnyEvent('call_signal', {});
      }
    });

    eventSource.onerror = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (closed) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        retryMs = Math.min(retryMs * 1.8, 15000);
        connect();
      }, retryMs);
    };
  };

  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (eventSource) eventSource.close();
  };
}
