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
  const supportedCodes = new Set(currencies.map(([code]) => code));
  const storageKey = 'fashionops-currency-v2';
  const formatterCache = new Map();
  let currentCurrency = 'KRW';
  let localizationFrame = 0;
  let calculatorPage = false;

  try {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem('fashionops-currency-v1');
    if (saved && supportedCodes.has(saved)) currentCurrency = saved;
  } catch (error) {}

  function fractionDigits(currency = currentCurrency) {
    return zeroDecimalCurrencies.has(currency) ? 0 : 2;
  }

  function getFormatter(currency = currentCurrency) {
    const locale = navigator.language || 'en-US';
    const key = `${locale}:${currency}`;
    if (!formatterCache.has(key)) {
      formatterCache.set(key, new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: fractionDigits(currency),
        maximumFractionDigits: fractionDigits(currency)
      }));
    }
    return formatterCache.get(key);
  }

  function format(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '-';
    try {
      return getFormatter().format(numeric);
    } catch (error) {
      return `${numeric.toLocaleString()} ${currentCurrency}`;
    }
  }

  function getCurrency() {
    return currentCurrency;
  }

  function markCurrencyInputs() {
    document.querySelectorAll('.input-wrap i').forEach((unit) => {
      const text = unit.textContent.trim();
      if (text === '원' || supportedCodes.has(text) || unit.dataset.currencyUnit === 'true') {
        unit.dataset.currencyUnit = 'true';
        unit.parentElement?.querySelector('input')?.setAttribute('data-currency-input', 'true');
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

  function replaceWonText(text) {
    return String(text).replace(/(-?[0-9][0-9,]*(?:\.[0-9]+)?)원/g, (_, raw) => {
      const value = Number(raw.replaceAll(',', ''));
      return format(value);
    });
  }

  function localizeElement(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      if (root.nodeValue?.includes('원')) root.nodeValue = replaceWonText(root.nodeValue);
      return;
    }
    if (!(root instanceof Element) || root.matches('script,style,input,textarea,option')) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeValue?.includes('원')) node.nodeValue = replaceWonText(node.nodeValue);
    }
  }

  function localizeMoneyOutputs() {
    if (!calculatorPage) return;
    const selectors = [
      '.result-panel',
      '.audit-summary',
      '.audit-table .row-profit',
      '.audit-table .row-monthly',
      '.audit-diagnosis',
      '.cost-breakdown',
      '.diagnosis'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(localizeElement);
  }

  function scheduleLocalization() {
    if (!calculatorPage || localizationFrame) return;
    localizationFrame = requestAnimationFrame(() => {
      localizationFrame = 0;
      localizeMoneyOutputs();
    });
  }

  function recalculatePageOnce() {
    if (document.getElementById('product-rows') && typeof window.calculateAll === 'function') {
      window.calculateAll();
      return;
    }

    const mainCalculators = ['calculateProfit', 'calculatePrice', 'calculateBreakEven', 'calculateInventory'];
    let mainFound = false;
    mainCalculators.forEach((name) => {
      if (typeof window[name] === 'function') {
        window[name]();
        mainFound = true;
      }
    });
    if (mainFound) return;

    const specialByTool = {
      startup: 'calcStartup',
      cost: 'calcClothingCost',
      discount: 'calcDiscount',
      roas: 'calcRoas',
      marketplace: 'calcMarketplace'
    };
    const functionName = specialByTool[document.body.dataset.tool];
    if (functionName && typeof window[functionName] === 'function') window[functionName]();
  }

  function setCurrency(nextCurrency) {
    const normalized = String(nextCurrency || '').toUpperCase();
    if (!supportedCodes.has(normalized) || normalized === currentCurrency) return;
    currentCurrency = normalized;
    try { localStorage.setItem(storageKey, currentCurrency); } catch (error) {}
    updateCurrencyUnits();
    recalculatePageOnce();
    scheduleLocalization();
    window.dispatchEvent(new CustomEvent('fashionops:currencychange', { detail: { currency: currentCurrency } }));
  }

  window.FashionOpsCurrency = {
    format,
    getCurrency,
    setCurrency,
    currencies: currencies.map(([code]) => code)
  };

  function mountCurrencySelector() {
    const hasMoneyCalculator = [...document.querySelectorAll('.input-wrap i')]
      .some((unit) => unit.textContent.trim() === '원' || supportedCodes.has(unit.textContent.trim()))
      || Boolean(document.querySelector('.bulk-price'));
    calculatorPage = hasMoneyCalculator;
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
      <p>금액을 선택한 통화 단위로 입력하세요. 환율은 자동 변환하지 않습니다. / Enter all values in the selected currency.</p>`;
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
    }, { passive: true });
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
        return [currentCurrency, name, price, cost, fee, ad, shipping, returns, units, unitProfit, margin.toFixed(1), monthlyRevenue, monthlyProfit, status];
      }).filter(Boolean);

      const status = document.getElementById('import-status');
      if (!rows.length) {
        if (status) {
          status.textContent = '저장할 상품이 없습니다. 판매가를 입력한 뒤 다시 시도하세요.';
          status.dataset.type = 'error';
        }
        return;
      }

      const header = ['Currency', 'Product name', 'Price', 'Cost', 'Fee rate', 'Ad rate', 'Shipping', 'Return rate', 'Monthly units', 'Unit profit', 'Profit margin', 'Expected monthly revenue', 'Expected monthly profit', 'Status'];
      const csv = '\ufeff' + [header, ...rows]
        .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
        .join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `fashionops-profit-audit-${currentCurrency}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
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
    scheduleLocalization();

    document.addEventListener('input', (event) => {
      if (event.target.matches('[data-currency-input="true"], .bulk-price, .bulk-cost, .bulk-shipping')) {
        scheduleLocalization();
      }
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('#add-row, #load-sample, #clear-rows')) {
        requestAnimationFrame(() => {
          updateCurrencyUnits();
          scheduleLocalization();
        });
      }
    });

    const tableBody = document.getElementById('product-rows');
    if (tableBody) {
      const rowObserver = new MutationObserver(() => {
        updateCurrencyUnits();
        scheduleLocalization();
      });
      rowObserver.observe(tableBody, { childList: true });
    }
  });
})();