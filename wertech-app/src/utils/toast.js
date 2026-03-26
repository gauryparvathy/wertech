export function showToast(message, type = 'info', duration = 3000) {
  if (!message) return;
  window.dispatchEvent(
    new CustomEvent('app-toast', {
      detail: { message, type, duration }
    })
  );
}

