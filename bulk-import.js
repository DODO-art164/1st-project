(() => {
  const supportedCurrencies = new Set(['KRW', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'SGD']);

  function setStatus(message, type = '') {
    const status = document.getElementById('import-status');
    if (!status) return;
    status.textContent = message;
    if (type) status.dataset.type = type;
    else delete status.dataset.type;
  }

  function parseNumber(value) {
    let text = String(value ?? '').trim().replace(/\s/g, '').replace(/[^0-9.,-]/g, '');
    if (!text) return 0;
    const comma = text.lastIndexOf(',');
    const dot = text.lastIndexOf('.');
    if (comma >= 0 && dot >= 0) {
      text = comma > dot ? text.replaceAll('.', '').replace(',', '.') : text.replaceAll(',', '');
    } else if (comma >= 0) {
      const decimalLength = text.length - comma - 1;
      text = decimalLength > 0 && decimalLength <= 2 ? text.replace(',', '.') : text.replaceAll(',', '');
    }
    return Math.max(Number(text) || 0, 0);
  }

  function detectDelimiter(text) {
    const firstLine = String(text).split(/\r?\n/, 1)[0] || '';
    return [',', '\t', ';'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  }

  function parseCsv(text) {
    const delimiter = detectDelimiter(text);
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') index += 1;
        row.push(cell.trim());
        if (row.some((value) => value !== '')) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    if (row.some((value) => value !== '')) rows.push(row);
    return rows;
  }

  function decodeFile(buffer) {
    const bytes = new Uint8Array(buffer);
    const utf8 = new TextDecoder('utf-8').decode(bytes);
    if ((utf8.match(/�/g) || []).length <= 2) return utf8;
    try { return new TextDecoder('euc-kr').decode(bytes); } catch (error) { return utf8; }
  }

  function normalizeHeader(value) {
    return String(value || '').replace(/^\ufeff/, '').toLowerCase().replace(/[\s_\-()%/]/g, '');
  }

  function findIndexes(headers) {
    const aliases = {
      currency: ['통화', 'currency', 'currencycode'],
      name: ['상품명', '제품명', '품명', 'name', 'product', 'productname'],
      price: ['판매가', '가격', '정상가', 'price', 'saleprice'],
      cost: ['원가', '상품원가', '매입가', 'cost', 'cogs'],
      fee: ['수수료율', '수수료', 'fee', 'feerate'],
      ad: ['광고비율', '광고비', '광고비율매출대비', 'ad', 'adrate', 'advertising'],
      shipping: ['배송비', '포장배송비', '배송포장비', 'shipping', 'shippingcost'],
      returns: ['반품률', '반품', 'returnrate', 'returns'],
      units: ['월판매량', '판매량', '수량', 'units', 'monthlyunits', 'quantity']
    };
    return Object.fromEntries(Object.entries(aliases).map(([key, names]) => [
      key,
      headers.findIndex((header) => names.includes(header))
    ]));
  }

  function detectCurrency(rows, index) {
    if (index < 0) return null;
    const codes = new Set(rows.slice(1, 201)
      .map((values) => String(values[index] || '').trim().toUpperCase())
      .filter(Boolean));
    const invalid = [...codes].filter((code) => !supportedCurrencies.has(code));
    if (invalid.length) throw new Error(`지원하지 않는 통화 코드: ${invalid.join(', ')}`);
    if (codes.size > 1) throw new Error('한 CSV 파일에는 하나의 통화만 사용해 주세요.');
    return [...codes][0] || null;
  }

  function defaultShipping(currency) {
    if (currency === 'KRW') return 3500;
    if (currency === 'JPY') return 350;
    return 3.5;
  }

  function escapeAttribute(value) {
    return String(value || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }

  function createRow(item, currency) {
    const step = ['KRW', 'JPY'].includes(currency) ? '1' : '0.01';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="bulk-name" type="text" value="${escapeAttribute(item.name)}" placeholder="상품명" aria-label="상품명"></td>
      <td><input class="bulk-price" type="number" min="0" step="${step}" value="${item.price}" inputmode="decimal" aria-label="판매가"></td>
      <td><input class="bulk-cost" type="number" min="0" step="${step}" value="${item.cost}" inputmode="decimal" aria-label="원가"></td>
      <td><input class="bulk-fee" type="number" min="0" max="99" step="0.1" value="${item.fee}" inputmode="decimal" aria-label="수수료율"></td>
      <td><input class="bulk-ad" type="number" min="0" max="99" step="0.1" value="${item.ad}" inputmode="decimal" aria-label="광고비율"></td>
      <td><input class="bulk-shipping" type="number" min="0" step="${step}" value="${item.shipping}" inputmode="decimal" aria-label="배송 및 포장비"></td>
      <td><input class="bulk-returns" type="number" min="0" max="95" step="0.1" value="${item.returns}" inputmode="decimal" aria-label="반품률"></td>
      <td><input class="bulk-units" type="number" min="0" step="1" value="${item.units}" inputmode="numeric" aria-label="월 판매량"></td>
      <td class="row-profit">-</td><td class="row-margin">-</td><td class="row-monthly">-</td>
      <td><button type="button" class="row-remove" aria-label="이 상품 삭제">×</button></td>`;
    return tr;
  }

  async function importFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) throw new Error('CSV 파일은 5MB 이하만 불러올 수 있습니다.');
    const rows = parseCsv(decodeFile(await file.arrayBuffer()));
    if (rows.length < 2) throw new Error('데이터 행이 없습니다.');

    const indexes = findIndexes(rows[0].map(normalizeHeader));
    if (indexes.name < 0 || indexes.price < 0 || indexes.cost < 0) {
      throw new Error('상품명, 판매가, 원가 열은 반드시 필요합니다.');
    }

    const importedCurrency = detectCurrency(rows, indexes.currency);
    if (importedCurrency) window.FashionOpsCurrency?.setCurrency?.(importedCurrency);
    const currency = importedCurrency || window.FashionOpsCurrency?.getCurrency?.() || 'KRW';

    const items = rows.slice(1, 201).map((values) => ({
      name: values[indexes.name]?.trim() || '',
      price: parseNumber(values[indexes.price]),
      cost: parseNumber(values[indexes.cost]),
      fee: indexes.fee >= 0 ? Math.min(parseNumber(values[indexes.fee]), 99) : 13.3,
      ad: indexes.ad >= 0 ? Math.min(parseNumber(values[indexes.ad]), 99) : 0,
      shipping: indexes.shipping >= 0 ? parseNumber(values[indexes.shipping]) : defaultShipping(currency),
      returns: indexes.returns >= 0 ? Math.min(parseNumber(values[indexes.returns]), 95) : 0,
      units: indexes.units >= 0 ? Math.floor(parseNumber(values[indexes.units])) : 0
    })).filter((item) => item.name || item.price || item.cost || item.units);

    if (!items.length) throw new Error('불러올 수 있는 상품이 없습니다.');
    const fragment = document.createDocumentFragment();
    items.forEach((item) => fragment.appendChild(createRow(item, currency)));
    document.getElementById('product-rows').replaceChildren(fragment);
    window.calculateAll?.();
    const truncated = rows.length - 1 > 200 ? ' 최대 200개까지만 불러왔습니다.' : '';
    setStatus(`${items.length}개 상품을 ${currency} 기준으로 불러왔습니다.${truncated}`, 'success');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('csv-file');
    if (!fileInput) return;
    fileInput.addEventListener('change', async (event) => {
      event.stopImmediatePropagation();
      const [file] = event.target.files;
      setStatus('파일을 읽는 중입니다.');
      try {
        await importFile(file);
      } catch (error) {
        setStatus(`CSV를 불러오지 못했습니다: ${error.message}`, 'error');
      } finally {
        event.target.value = '';
      }
    }, true);
  });
})();