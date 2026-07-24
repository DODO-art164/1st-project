(() => {
  let tooltip = null;
  let activeTrigger = null;
  let hideTimer = 0;

  function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.id = 'fashionops-tooltip';
    tooltip.className = 'floating-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function positionTooltip() {
    if (!activeTrigger || !tooltip || tooltip.hidden) return;
    const triggerRect = activeTrigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 10;
    const edge = 8;

    let top = triggerRect.top - tooltipRect.height - gap;
    let placement = 'top';
    if (top < edge) {
      top = triggerRect.bottom + gap;
      placement = 'bottom';
    }

    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(edge, Math.min(left, window.innerWidth - tooltipRect.width - edge));
    top = Math.max(edge, Math.min(top, window.innerHeight - tooltipRect.height - edge));

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.dataset.placement = placement;
  }

  function showTooltip(trigger) {
    const text = trigger?.dataset.tip?.trim();
    if (!text) return;
    clearTimeout(hideTimer);
    const element = ensureTooltip();
    activeTrigger = trigger;
    element.textContent = text;
    element.hidden = false;
    trigger.setAttribute('aria-describedby', element.id);
    requestAnimationFrame(positionTooltip);
  }

  function hideTooltip(trigger = activeTrigger) {
    clearTimeout(hideTimer);
    if (trigger) trigger.removeAttribute('aria-describedby');
    if (tooltip) tooltip.hidden = true;
    activeTrigger = null;
  }

  function scheduleHide(trigger) {
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (document.activeElement !== trigger) hideTooltip(trigger);
    }, 80);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tip[data-tip]').forEach((trigger) => {
      if (!trigger.getAttribute('aria-label')) {
        trigger.setAttribute('aria-label', `도움말: ${trigger.dataset.tip}`);
      }
      trigger.setAttribute('aria-haspopup', 'true');

      trigger.addEventListener('pointerenter', () => showTooltip(trigger));
      trigger.addEventListener('pointerleave', () => scheduleHide(trigger));
      trigger.addEventListener('focus', () => showTooltip(trigger));
      trigger.addEventListener('blur', () => hideTooltip(trigger));
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        if (activeTrigger === trigger && tooltip && !tooltip.hidden) hideTooltip(trigger);
        else showTooltip(trigger);
      });
    });
  });

  document.addEventListener('pointerdown', (event) => {
    if (activeTrigger && !event.target.closest('.tip')) hideTooltip();
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideTooltip();
  });

  window.addEventListener('resize', positionTooltip, { passive: true });
  window.addEventListener('scroll', positionTooltip, { passive: true, capture: true });
})();