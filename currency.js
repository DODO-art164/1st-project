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
      input.inputMode = 'decimal';
    });
    const selector = document.getElementById('fashionops-currency');
    if (selector) selector.value = currentCurrency;
  }

  function setCurrency(nextCurrency) {
    const normalized = String(nextCurrency || '').toUpperCase();
    if (!supportedCodes.has(normalized) || normalized === currentCurrency) return;
    currentCurrency = normalized;
    try { localStorage.setItem(storageKey, currentCurrency); } catch (error) {}
    updateCurrencyUnits();
    window.dispatchEvent(new CustomEvent('fashionops:currencychange', {
      detail: { currency: currentCurrency }
    }));
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

  document.addEventListener('DOMContentLoaded', () => {
    mountCurrencySelector();
    updateCurrencyUnits();
    improveTooltips();
    addEnglishCsvTemplate();

    const tableBody = document.getElementById('product-rows');
    if (tableBody) {
      const rowObserver = new MutationObserver(updateCurrencyUnits);
      rowObserver.observe(tableBody, { childList: true });
    }
  });
})();