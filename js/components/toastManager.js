/**
 * RailRadar Toast Notification Manager
 * Floating sleek notifications with support for interactive clicks and alert variants.
 */

export class ToastManager {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  show(message, icon = '✨', durationMs = 3000, onClick = null, variant = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${variant} ${onClick ? 'toast-clickable' : ''}`;
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      ${onClick ? `<span class="toast-action-hint">View ➔</span>` : ''}
    `;

    if (onClick) {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', () => {
        onClick();
        toast.remove();
      });
    }

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }
}

export const toast = new ToastManager();

