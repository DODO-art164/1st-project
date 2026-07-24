(() => {
  const currencies = [
    ['KRW', 'KRW · 대한민국 원'],
    ['USD', 'USD · US Dollar'],
    ['EUR', 'EUR · Euro'],
    ['GBP', 'GBP · British Pound'],
    ['JPY', 'JPY · Japanese Yen'],
    ['CNY', 'CNY · Chinese Yuan'],
    ['AUD', 'AUD · Australian Dollar'],
    ['CAD', 'CAD · Canadian Dollar'],
    ['SGD', 'SGD · Singapore Dollar']
  ];
  const zeroDecimalCurrencies = new Set(['KRW', 'JPY']);
  const storageKey = 'fashionops-currency-v1';
  const supportedCodes = new Set(currencies.map(([code]) => code));
  let currentCurrency = 'KRW';

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && supportedCodes.has(saved)) currentCurrency = saved;
  } catch (error) {}

  function fractionDigits() {
    return zeroDecimalCurrencies.has(currentCurrency) ? 0 : 2;
  }

  function format(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '-';
    try {
      return new Intl.NumberFormat(navigator.language || 'en-US', {
        style: 'currency',
        currency: currentCurrency,
        minimumFractionDigits: fractionDigits(),
        maximumFractionDigits: fractionDigits()
      }).format(numeric);
    } catch (error) {
      return `${numeric.toLocaleString()} ${currentCurrency}`;
    }
  }

  function getCurrency() {
    return currentCurrency;
  }

  function setCurrency(nextCurrency) {
    const normalized = String(nextCurrency || '').toUpperCase();
    if (!supportedCodes.has(normalized) || normalized === currentCurrency) return;
    currentCurrency = normalized;
    try { localStorage.setItem(storageKey, currentCurrency); } catch (error) {}
    updateCurrencyUnits();
    refreshCalculators();
    window.dispatchEvent(new CustomEvent('fashionops:currencychange', { detail: { currency: currentCurrency } }));
  }

  window.FashionOpsCurrency = { format, getCurrency, setCurrency, currencies: currencies.map(([code]) => code) };

  function markCurrencyInputs() {
    document.querySelectorAll('.input-wrap i').forEach((unit) => {
      const text = unit.textContent.trim();
      if (text === '원' || unit.dataset.currencyUnit === 'true') {
        unit.dataset.currencyUnit = 'true';
        const input = unit.parentElement?.querySelector('input');
        if (input) input.dataset.currencyInput = 'true';
      }
    });
    document.querySelectorAll('.bulk-price,.bulk-cost,.bulk-shipping').forEach((input) => {
      input.dataset.currencyInput = 'true';
    });
  }

  function updateCurrencyUnits() {
    markCurrencyInputs();
    document.querySelectorAll('[data-currency-unit="true"]').forEach((unit) => {
      unit.textContent = currentCurrency;
    });
    const step = zeroDecimalCurrencies.has(currentCurrency) ? '1' : '0.01';
    document.querySelectorAll('[data-currency-input="true"]').forEach((input) => {
      input.step = step;
    });
    const selector = document.getElementById('fashionops-currency');
    if (selector) selector.value = currentCurrency;
  }

  function refreshCalculators() {
    const inputs = [...document.querySelectorAll('[data-currency-input="true"]')];
    const dispatched = new Set();
    inputs.forEach((input) => {
      const scope = input.closest('form, tr, .calculator-card') || input;
      if (dispatched.has(scope)) return;
      dispatched.add(scope);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    requestAnimationFrame(localizeMoneyOutputs);
  }

  function replaceWonText(text) {
    return text.replace(/(-?[0-9][0-9,]*(?:\.[0-9]+)?)원/g, (_, raw) => {
      const value = Number(raw.replaceAll(',', ''));
      return format(value);
    });
  }

  function localizeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue?.includes('원')) node.nodeValue = replaceWonText(node.nodeValue);
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.matches('script,style,input,textarea,option')) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((textNode) => {
      if (textNode.nodeValue?.includes('원')) textNode.nodeValue = replaceWonText(textNode.nodeValue);
    });
  }

  function localizeMoneyOutputs() {
    const selectors = [
      '.result-panel', '.audit-summary', '.audit-table .row-profit', '.audit-table .row-monthly',
      '.audit-diagnosis', '.cost-breakdown', '.diagnosis'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(localizeNode);
  }

  function mountCurrencySelector() {
    const hasMoneyCalculator = [...document.querySelectorAll('.input-wrap i')].some((unit) => unit.textContent.trim() === '원')
      || Boolean(document.querySelector('.bulk-price'));
    if (!hasMoneyCalculator || document.getElementById('fashionops-currency')) return;

    const target = document.querySelector('.workspace-section .container, #audit .container, .tools-section .container');
    if (!target) return;

    const bar = document.createElement('div');
    bar.className = 'currency-bar';
    bar.innerHTML = `
      <label for="fashionops-currency">
        <span>통화 / Currency</span>
        <select id="fashionops-currency" aria-label="계산에 사용할 통화 선택">
          ${currencies.map(([code, label]) => `<option value="${code}">${label}</option>`).join('')}
        </select>
      </label>
      <p>모든 금액을 선택한 통화 단위로 입력하세요. 환율 변환은 하지 않습니다. / No exchange-rate conversion.</p>`;
    target.prepend(bar);

    const selector = bar.querySelector('select');
    selector.value = currentCurrency;
    selector.addEventListener('change', () => setCurrency(selector.value));
  }

  function improveTooltips() {
    document.querySelectorAll('.tip[data-tip]').forEach((tip) => {
      if (!tip.getAttribute('aria-label')) tip.setAttribute('aria-label', `도움말: ${tip.dataset.tip}`);
    });
    document.addEventListener('pointerdown', (event) => {
      const active = document.activeElement;
      if (active?.classList?.contains('tip') && !event.target.closest('.tip')) active.blur();
    });
  }

  function addEnglishCsvTemplate() {
    const koreanTemplate = document.querySelector('a[href="profit-audit-template.csv"]');
    if (!koreanTemplate || document.querySelector('a[href="profit-audit-template-en.csv"]')) return;
    koreanTemplate.textContent = '한국어 CSV 양식';
    const englishTemplate = document.createElement('a');
    englishTemplate.className = koreanTemplate.className;
    englishTemplate.href = 'profit-audit-template-en.csv';
    englishTemplate.download = '';
    englishTemplate.textContent = 'English CSV template';
    koreanTemplate.insertAdjacentElement('afterend', englishTemplate);
  }

  function installBulkExportOverride() {
    const exportButton = document.getElementById('export-csv');
    const body = document.getElementById('product-rows');
    if (!exportButton || !body) return;

    exportButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const rows = [...body.querySelectorAll('tr')].map((row) => {
        const read = (selector) => Number(row.querySelector(selector)?.value || 0);
        const name = row.querySelector('.bulk-name')?.value.trim() || 'Unnamed product';
        const price = read('.bulk-price');
        const cost = read('.bulk-cost');
        const fee = read('.bulk-fee');
        const ad = read('.bulk-ad');
        const shipping = read('.bulk-shipping');
        const returns = read('.bulk-returns');
        const units = read('.bulk-units');
        if (price <= 0) return null;
        const kept = 1 - Math.min(Math.max(returns / 100, 0), 0.99);
        const expectedRevenue = price * kept;
        const expectedCost = cost * kept;
        const fees = expectedRevenue * Math.min(Math.max(fee / 100, 0), 0.99);
        const ads = price * Math.min(Math.max(ad / 100, 0), 0.99);
        const returnHandling = shipping * Math.min(Math.max(returns / 100, 0), 0.99) * 2;
        const unitProfit = expectedRevenue - expectedCost - fees - ads - shipping - returnHandling;
        const margin = expectedRevenue > 0 ? unitProfit / expectedRevenue * 100 : 0;
        const monthlyRevenue = expectedRevenue * units;
        const monthlyProfit = unitProfit * units;
        const status = unitProfit < 0 ? 'Loss' : margin < 10 ? 'Risk' : margin < 20 ? 'Improve' : 'Healthy';
        return [currentCurrency, name, price, cost, fee, ad, shipping, returns, units, Math.round(unitProfit * 100) / 100, margin.toFixed(1), Math.round(monthlyRevenue * 100) / 100, Math.round(monthlyProfit * 100) / 100, status];
      }).filter(Boolean);

      const status = document.getElementById('import-status');
      if (!rows.length) {
        if (status) {
          status.textContent = '저장할 상품이 없습니다. 판매가를 입력한 뒤 다시 시도하세요.';
          status.dataset.type = 'error';
        }
        return;
      }

      const header = ['Currency','Product name','Price','Cost','Fee rate','Ad rate','Shipping','Return rate','Monthly units','Unit profit','Profit margin','Expected monthly revenue','Expected monthly profit','Status'];
      const csv = '\ufeff' + [header, ...rows]
        .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `fashionops-profit-audit-${currentCurrency}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      if (status) {
        status.textContent = `${rows.length}개 상품의 분석 결과를 ${currentCurrency} 기준으로 저장했습니다.`;
        status.dataset.type = 'success';
      }
    }, true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    mountCurrencySelector();
    markCurrencyInputs();
    updateCurrencyUnits();
    improveTooltips();
    addEnglishCsvTemplate();
    installBulkExportOverride();
    localizeMoneyOutputs();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') localizeNode(mutation.target);
        mutation.addedNodes.forEach(localizeNode);
      });
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  });
})();