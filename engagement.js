(() => {
  const SCENARIO_STORE = 'fashionops-saved-scenarios-v1';
  const LAST_STORE = 'fashionops-last-tool-v1';
  const MAIN_TOOLS = new Set(['profit', 'price', 'bep', 'inventory']);
  const toolMeta = {
    profit: { label: '실제 순이익', path: '/', hash: 'profit-calculator', next: [['할인 손익', '/discount-profit-calculator.html'], ['광고 ROAS', '/roas-calculator.html'], ['여러 상품 비교', '/profit-audit.html']] },
    price: { label: '목표 판매가', path: '/', hash: 'price-calculator', next: [['실제 순이익', '/#profit-calculator'], ['할인 손익', '/discount-profit-calculator.html']] },
    bep: { label: '손익분기점', path: '/', hash: 'bep-calculator', next: [['재고·발주', '/#inventory-calculator'], ['여러 상품 비교', '/profit-audit.html']] },
    inventory: { label: '재고·발주', path: '/', hash: 'inventory-calculator', next: [['재고관리 가이드', '/fashion-inventory-guide.html'], ['주간 운영 점검', '/weekly-profit-check.html']] },
    startup: { label: '브랜드 창업비용', path: '/startup-cost-calculator.html', next: [['의류 제작 원가', '/clothing-cost-calculator.html'], ['주간 운영 점검', '/weekly-profit-check.html']] },
    cost: { label: '의류 제작 원가', path: '/clothing-cost-calculator.html', next: [['목표 판매가', '/#price-calculator'], ['할인 손익', '/discount-profit-calculator.html']] },
    discount: { label: '할인 손익', path: '/discount-profit-calculator.html', next: [['실제 순이익', '/#profit-calculator'], ['플랫폼 수익', '/marketplace-profit-calculator.html']] },
    roas: { label: '광고 ROAS', path: '/roas-calculator.html', next: [['실제 순이익', '/#profit-calculator'], ['여러 상품 비교', '/profit-audit.html']] },
    marketplace: { label: '플랫폼 판매 수익', path: '/marketplace-profit-calculator.html', next: [['할인 손익', '/discount-profit-calculator.html'], ['여러 상품 비교', '/profit-audit.html']] }
  };

  let toastTimer = 0;
  let deferredInstallPrompt = null;
  let lastSaveTimer = 0;

  function showToast(message) {
    let toast = document.getElementById('engagement-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'engagement-toast';
      toast.className = 'engagement-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.dataset.show = 'true';
    toastTimer = window.setTimeout(() => { toast.dataset.show = 'false'; }, 2400);
  }

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function currentTool() {
    if (toolMeta[document.body.dataset.tool]) return document.body.dataset.tool;
    const visible = document.querySelector('[data-calculator-panel]:not([hidden])');
    if (visible?.dataset.calculatorPanel) return visible.dataset.calculatorPanel;
    const hashTool = Object.entries(toolMeta).find(([, meta]) => meta.hash === location.hash.slice(1));
    return hashTool?.[0] || null;
  }

  function scopeForTool(tool) {
    if (MAIN_TOOLS.has(tool)) return document.getElementById(toolMeta[tool].hash);
    return document.querySelector('[data-calculator-form]') || document.body;
  }

  function collectInputs(tool) {
    const scope = scopeForTool(tool);
    if (!scope) return {};
    return Object.fromEntries([...scope.querySelectorAll('input[id]')]
      .slice(0, 40)
      .map((input) => [input.id, input.value]));
  }

  function buildState(tool = currentTool()) {
    if (!tool || !toolMeta[tool]) return null;
    return {
      v: 1,
      tool,
      currency: window.FashionOpsCurrency?.getCurrency?.() || 'KRW',
      inputs: collectInputs(tool)
    };
  }

  function encodeState(state) {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
  }

  function decodeState(value) {
    try {
      const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const state = JSON.parse(new TextDecoder().decode(bytes));
      if (state?.v !== 1 || !toolMeta[state.tool] || typeof state.inputs !== 'object') return null;
      return state;
    } catch (error) {
      return null;
    }
  }

  const sharedState = decodeState(new URLSearchParams(location.search).get('fo') || '');
  if (sharedState && MAIN_TOOLS.has(sharedState.tool) && (location.pathname === '/' || location.pathname.endsWith('/index.html'))) {
    const hash = toolMeta[sharedState.tool].hash;
    if (location.hash.slice(1) !== hash) {
      history.replaceState(null, '', `${location.pathname}${location.search}#${hash}`);
    }
  }

  function stateUrl(state) {
    const meta = toolMeta[state.tool];
    const url = new URL(meta.path, location.origin);
    url.searchParams.set('fo', encodeState(state));
    if (meta.hash) url.hash = meta.hash;
    return url.href;
  }

  function applySharedState() {
    if (!sharedState) return;
    window.FashionOpsCurrency?.setCurrency?.(sharedState.currency);
    Object.entries(sharedState.inputs).slice(0, 40).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.value = String(value).slice(0, 40);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    showToast('공유된 계산값을 불러왔습니다. 입력값을 확인해 주세요.');
  }

  function resultPanelForTool(tool) {
    if (MAIN_TOOLS.has(tool)) return document.getElementById(`${tool}-result`);
    return document.querySelector('.result-panel');
  }

  function resultSummary(tool) {
    const panel = resultPanelForTool(tool);
    const primary = panel?.querySelector('.result-main strong')?.textContent?.trim();
    const badge = panel?.querySelector('.result-badge')?.textContent?.trim();
    return [primary, badge].filter(Boolean).join(' · ').slice(0, 100);
  }

  function saveScenario(tool) {
    const state = buildState(tool);
    if (!state) return;
    const scenarios = readJson(SCENARIO_STORE, []);
    const item = {
      id: `${Date.now()}-${tool}`,
      tool,
      label: toolMeta[tool].label,
      summary: resultSummary(tool),
      savedAt: new Date().toISOString(),
      state
    };
    const next = [item, ...scenarios.filter((scenario) => scenario.tool !== tool)].slice(0, 8);
    writeJson(SCENARIO_STORE, next);
    rememberLast(tool);
    showToast('계산을 이 브라우저에 저장했습니다.');
    mountRecentSection(true);
    mountSavedManager(true);
  }

  async function shareScenario(tool) {
    const state = buildState(tool);
    if (!state) return;
    const url = stateUrl(state);
    const title = `FashionOps ${toolMeta[tool].label} 계산`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: '입력값이 포함된 계산 링크입니다.', url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('입력값이 포함된 공유 링크를 복사했습니다.');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('공유 링크를 만들지 못했습니다.');
    }
  }

  function mountResultActions() {
    Object.keys(toolMeta).forEach((tool) => {
      const panel = resultPanelForTool(tool);
      if (!panel || panel.querySelector(`[data-engagement-tool="${tool}"]`)) return;
      if (MAIN_TOOLS.has(tool) && !document.getElementById(toolMeta[tool].hash)) return;
      if (!MAIN_TOOLS.has(tool) && document.body.dataset.tool !== tool) return;

      const actions = document.createElement('div');
      actions.className = 'engagement-actions';
      actions.dataset.engagementTool = tool;
      actions.innerHTML = `
        <button class="copy-button" type="button" data-save-scenario="${tool}">계산 저장</button>
        <button class="copy-button" type="button" data-share-scenario="${tool}">공유 링크</button>`;
      panel.appendChild(actions);

      const next = toolMeta[tool].next || [];
      if (next.length) {
        const box = document.createElement('div');
        box.className = 'next-tool-box';
        box.innerHTML = `<span>이어서 확인하면 좋은 항목</span><div class="next-tool-links">${next.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div>`;
        panel.appendChild(box);
      }
    });

    document.addEventListener('click', (event) => {
      const saveButton = event.target.closest('[data-save-scenario]');
      if (saveButton) saveScenario(saveButton.dataset.saveScenario);
      const shareButton = event.target.closest('[data-share-scenario]');
      if (shareButton) shareScenario(shareButton.dataset.shareScenario);
    });
  }

  function rememberLast(tool = currentTool()) {
    if (!tool || !toolMeta[tool]) return;
    clearTimeout(lastSaveTimer);
    lastSaveTimer = window.setTimeout(() => {
      writeJson(LAST_STORE, { tool, at: new Date().toISOString() });
    }, 250);
  }

  function recentItems() {
    const scenarios = readJson(SCENARIO_STORE, []).filter((scenario) => toolMeta[scenario.tool]).slice(0, 3);
    if (scenarios.length) return scenarios.map((scenario) => ({
      label: scenario.label,
      summary: scenario.summary || '저장한 입력값',
      href: stateUrl(scenario.state)
    }));
    const last = readJson(LAST_STORE, null);
    if (last?.tool && toolMeta[last.tool]) {
      const meta = toolMeta[last.tool];
      return [{ label: meta.label, summary: '마지막 입력값 이어서 확인', href: `${meta.path}${meta.hash ? `#${meta.hash}` : ''}` }];
    }
    return [];
  }

  function mountRecentSection(force = false) {
    if (!(location.pathname === '/' || location.pathname.endsWith('/index.html'))) return;
    const existing = document.getElementById('resume-section');
    if (existing && !force) return;
    existing?.remove();
    const items = recentItems();
    if (!items.length) return;
    const workspace = document.querySelector('.workspace-section');
    if (!workspace) return;
    const section = document.createElement('section');
    section.id = 'resume-section';
    section.className = 'resume-section';
    section.innerHTML = `
      <div class="container">
        <div class="resume-shell">
          <div class="resume-copy">
            <span>다시 방문하셨네요</span>
            <h2>최근 계산을 이어서 확인하세요</h2>
            <p>저장된 값은 현재 브라우저에만 보관됩니다.</p>
            <div class="resume-items">${items.map((item) => `<a class="resume-item" href="${item.href}"><b>${item.label}</b><small>${item.summary}</small></a>`).join('')}</div>
          </div>
          <a class="button secondary" href="/weekly-profit-check.html">이번 주 운영 점검</a>
        </div>
      </div>`;
    workspace.before(section);
  }

  function mountSavedManager(force = false) {
    if (!location.pathname.endsWith('/resources.html')) return;
    const existing = document.getElementById('saved-manager');
    if (existing && !force) return;
    existing?.remove();
    const scenarios = readJson(SCENARIO_STORE, []).filter((scenario) => toolMeta[scenario.tool]);
    if (!scenarios.length) return;
    const primary = document.querySelector('.primary-tools');
    if (!primary) return;
    const manager = document.createElement('section');
    manager.id = 'saved-manager';
    manager.className = 'saved-manager';
    manager.innerHTML = `
      <div class="saved-manager-head"><h2>저장한 계산</h2><button class="button secondary" type="button" id="clear-saved-scenarios">전체 삭제</button></div>
      <div class="saved-list">${scenarios.map((scenario) => `<div class="saved-row"><a href="${stateUrl(scenario.state)}">${scenario.label}<small>${scenario.summary || '저장한 입력값'}</small></a><button type="button" data-delete-scenario="${scenario.id}">삭제</button></div>`).join('')}</div>`;
    primary.after(manager);

    manager.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-delete-scenario]');
      if (remove) {
        writeJson(SCENARIO_STORE, scenarios.filter((scenario) => scenario.id !== remove.dataset.deleteScenario));
        mountSavedManager(true);
      }
      if (event.target.id === 'clear-saved-scenarios' && window.confirm('저장한 계산을 모두 삭제할까요?')) {
        writeJson(SCENARIO_STORE, []);
        mountSavedManager(true);
      }
    });
  }

  function mountWeeklyCard() {
    const grid = document.querySelector('.quick-next-grid');
    if (!grid || grid.querySelector('[data-weekly-card]')) return;
    const card = document.createElement('article');
    card.className = 'quick-next-card';
    card.dataset.weeklyCard = 'true';
    card.innerHTML = `<div><span class="section-kicker">매주 숫자를 확인한다면</span><h3>주간 운영 체크리스트</h3><p>매출·광고·반품·재고를 같은 순서로 점검하고 이번 주 진행률을 저장합니다.</p></div><a class="button secondary" href="weekly-profit-check.html">주간 점검 시작</a>`;
    grid.appendChild(card);
  }

  function mountInstallButton() {
    if (!deferredInstallPrompt || document.querySelector('.install-button')) return;
    const actions = document.querySelector('.app-hero .hero-actions');
    if (!actions) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button secondary install-button';
    button.textContent = '홈 화면에 설치';
    button.addEventListener('click', async () => {
      const prompt = deferredInstallPrompt;
      if (!prompt) return;
      prompt.prompt();
      const choice = await prompt.userChoice;
      deferredInstallPrompt = null;
      button.remove();
      if (choice.outcome === 'accepted') showToast('FashionOps를 홈 화면에 설치했습니다.');
    });
    actions.appendChild(button);
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    mountInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    document.querySelector('.install-button')?.remove();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    applySharedState();
    mountResultActions();
    mountRecentSection();
    mountSavedManager();
    mountWeeklyCard();
    mountInstallButton();

    document.addEventListener('input', (event) => {
      if (event.target.matches('input[id]')) rememberLast();
    }, { passive: true });
    document.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-calculator-tab]');
      if (tab) rememberLast(tab.dataset.calculatorTab);
    });
  });
})();