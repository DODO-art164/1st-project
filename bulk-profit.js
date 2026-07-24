const bulkStoreKey = 'fashionops-bulk-profit-v4';
const legacyStoreKeys = ['fashionops-bulk-profit-v3', 'fashionops-bulk-profit-v2'];
const tbody = document.getElementById('product-rows');
const statusElement = document.getElementById('import-status');
const supportedCurrencies = new Set(['KRW', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'SGD']);
let calculationFrame = 0;
let storageTimer = 0;

const currencyCode = () => window.FashionOpsCurrency?.getCurrency?.() || 'KRW';
const money = (value) => window.FashionOpsCurrency?.format?.(value)
  || `${Math.round(value).toLocaleString('ko-KR')}원`;
const number = (value) => Math.max(Number(String(value ?? '').replaceAll(',', '').trim()) || 0, 0);
const rate = (value) => Math.min(number(value) / 100, 0.99);
const moneyStep = () => ['KRW', 'JPY'].includes(currencyCode()) ? '1' : '0.01';
const defaultShipping = () => currencyCode() === 'KRW' ? 3500 : currencyCode() === 'JPY' ? 350 : 3.5;
const blankRow = () => ({ name: '', price: 0, cost: 0, fee: 13.3, ad: 0, shipping: defaultShipping(), returns: 0, units: 0 });

function sampleRows() {
  if (currencyCode() === 'KRW') {
    return [
      { name: '오버핏 티셔츠', price: 49000, cost: 16000, fee: 13.3, ad: 12, shipping: 3500, returns: 7, units: 80 },
      { name: '와이드 데님', price: 89000, cost: 34000, fee: 13.3, ad: 15, shipping: 3500, returns: 10, units: 45 },
      { name: '후드 집업', price: 119000, cost: 47000, fee: 13.3, ad: 18, shipping: 3500, returns: 8, units: 30 }
    ];
  }
  if (currencyCode() === 'JPY') {
    return [
      { name: 'Oversized T-shirt', price: 4900, cost: 1600, fee: 13.3, ad: 12, shipping: 350, returns: 7, units: 80 },
      { name: 'Wide denim', price: 8900, cost: 3400, fee: 13.3, ad: 15, shipping: 350, returns: 10, units: 45 },
      { name: 'Hooded zip-up', price: 11900, cost: 4700, fee: 13.3, ad: 18, shipping: 350, returns: 8, units: 30 }
    ];
  }
  return [
    { name: 'Oversized T-shirt', price: 49, cost: 16, fee: 13.3, ad: 12, shipping: 3.5, returns: 7, units: 80 },
    { name: 'Wide denim', price: 89, cost: 34, fee: 13.3, ad: 15, shipping: 3.5, returns: 10, units: 45 },
    { name: 'Hooded zip-up', price: 119, cost: 47, fee: 13.3, ad: 18, shipping: 3.5, returns: 8, units: 30 }
  ];
}

function setStatus(message = '', type = '') {
  if (!statusElement) return;
  statusElement.textContent = message;
  if (type) statusElement.dataset.type = type;
  else delete statusElement.dataset.type;
}

function escapeAttribute(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function rowTemplate(data = blankRow()) {
  const row = { ...blankRow(), ...data };
  const step = moneyStep();
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="bulk-name" type="text" value="${escapeAttribute(row.name)}" placeholder="상품명" aria-label="상품명"></td>
    <td><input class="bulk-price" type="number" min="0" step="${step}" value="${row.price}" inputmode="decimal" aria-label="판매가"></td>
    <td><input class="bulk-cost" type="number" min="0" step="${step}" value="${row.cost}" inputmode="decimal" aria-label="원가"></td>
    <td><input class="bulk-fee" type="number" min="0" max="99" step="0.1" value="${row.fee}" inputmode="decimal" aria-label="수수료율"></td>
    <td><input class="bulk-ad" type="number" min="0" max="99" step="0.1" value="${row.ad}" inputmode="decimal" aria-label="광고비율"></td>
    <td><input class="bulk-shipping" type="number" min="0" step="${step}" value="${row.shipping}" inputmode="decimal" aria-label="배송 및 포장비"></td>
    <td><input class="bulk-returns" type="number" min="0" max="95" step="0.1" value="${row.returns}" inputmode="decimal" aria-label="반품률"></td>
    <td><input class="bulk-units" type="number" min="0" step="1" value="${row.units}" inputmode="numeric" aria-label="월 판매량"></td>
    <td class="row-profit">-</td>
    <td class="row-margin">-</td>
    <td class="row-monthly">-</td>
    <td><button type="button" class="row-remove" aria-label="이 상품 삭제">×</button></td>`;
  tbody.appendChild(tr);
  return tr;
}

function readRows() {
  if (!tbody) return [];
  return [...tbody.querySelectorAll('tr')].map((tr) => ({
    name: tr.querySelector('.bulk-name').value.trim(),
    price: number(tr.querySelector('.bulk-price').value),
    cost: number(tr.querySelector('.bulk-cost').value),
    fee: number(tr.querySelector('.bulk-fee').value),
    ad: number(tr.querySelector('.bulk-ad').value),
    shipping: number(tr.querySelector('.bulk-shipping').value),
    returns: number(tr.querySelector('.bulk-returns').value),
    units: number(tr.querySelector('.bulk-units').value)
  }));
}

function analyze(row) {
  const hasData = Boolean(row.name || row.price || row.cost || row.units);
  if (!hasData || row.price <= 0) {
    return {
      ...row,
      displayName: row.name || '이름 없는 상품',
      isReady: false,
      expectedRevenue: 0,
      unitProfit: 0,
      margin: 0,
      monthlyRevenue: 0,
      monthlyProfit: 0,
      status: '입력 필요'
    };
  }

  const kept = 1 - rate(row.returns);
  const expectedRevenue = row.price * kept;
  const expectedCost = row.cost * kept;
  const fees = expectedRevenue * rate(row.fee);
  const ads = row.price * rate(row.ad);
  const returnHandling = row.shipping * rate(row.returns) * 2;
  const unitProfit = expectedRevenue - expectedCost - fees - ads - row.shipping - returnHandling;
  const margin = expectedRevenue > 0 ? unitProfit / expectedRevenue * 100 : 0;
  const monthlyRevenue = expectedRevenue * row.units;
  const monthlyProfit = unitProfit * row.units;

  let status = '양호';
  if (unitProfit < 0) status = '적자';
  else if (margin < 10) status = '위험';
  else if (margin < 20) status = '개선';

  return {
    ...row,
    displayName: row.name || '이름 없는 상품',
    isReady: true,
    expectedRevenue,
    unitProfit,
    margin,
    monthlyRevenue,
    monthlyProfit,
    status
  };
}

function persistRows(rows = readRows()) {
  clearTimeout(storageTimer);
  storageTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(bulkStoreKey, JSON.stringify({ currency: currencyCode(), rows }));
    } catch (error) {}
  }, 250);
}

function calculateAll({ persist = true } = {}) {
  const analyses = readRows().map(analyze);
  const ready = analyses.filter((item) => item.isReady);
  let totalRevenue = 0;
  let totalProfit = 0;
  let riskCount = 0;

  analyses.forEach((item, index) => {
    const tr = tbody.children[index];
    if (!tr) return;
    tr.querySelector('.row-profit').textContent = item.isReady ? money(item.unitProfit) : '-';
    tr.querySelector('.row-margin').textContent = item.isReady ? `${item.margin.toFixed(1)}%` : '-';
    tr.querySelector('.row-monthly').textContent = item.isReady ? money(item.monthlyProfit) : '-';
    tr.dataset.status = item.status;

    if (!item.isReady) return;
    totalRevenue += item.monthlyRevenue;
    totalProfit += item.monthlyProfit;
    if (item.status === '적자' || item.status === '위험') riskCount += 1;
  });

  const averageMargin = totalRevenue > 0 ? totalProfit / totalRevenue * 100 : 0;
  document.getElementById('bulk-revenue').textContent = money(totalRevenue);
  document.getElementById('bulk-profit').textContent = money(totalProfit);
  document.getElementById('bulk-margin').textContent = `${averageMargin.toFixed(1)}%`;
  document.getElementById('bulk-risk').textContent = `${riskCount}개`;

  const diagnosis = document.getElementById('bulk-diagnosis');
  if (!ready.length) {
    diagnosis.innerHTML = '<p>상품명과 판매가를 입력하거나 CSV를 불러오면 우선순위를 분석합니다.</p>';
  } else {
    const worst = [...ready].sort((a, b) => a.margin - b.margin)[0];
    const withSales = ready.filter((item) => item.units > 0);
    const best = [...withSales].sort((a, b) => b.monthlyProfit - a.monthlyProfit)[0];
    const actions = [];

    if (worst.unitProfit < 0) {
      actions.push(`<b>${escapeAttribute(worst.displayName)}</b>은 판매 1건당 ${money(Math.abs(worst.unitProfit))} 적자입니다. 광고를 늘리기 전에 가격·원가·수수료를 먼저 조정하세요.`);
    } else if (worst.margin < 10) {
      actions.push(`<b>${escapeAttribute(worst.displayName)}</b>의 순이익률은 ${worst.margin.toFixed(1)}%로 할인과 반품에 취약합니다.`);
    } else {
      actions.push('현재 입력 상품 중 판매 1건 기준 구조적 적자는 없습니다.');
    }

    if (best) {
      actions.push(`월 이익 기여도가 가장 높은 상품은 <b>${escapeAttribute(best.displayName)}</b>이며 예상 월이익은 ${money(best.monthlyProfit)}입니다.`);
    } else {
      actions.push('월 판매량을 입력하면 상품별 월 이익 기여도를 비교할 수 있습니다.');
    }

    if (totalRevenue <= 0) {
      actions.push('월 판매량을 입력해야 전체 월 매출과 평균 순이익률을 계산할 수 있습니다.');
    } else if (averageMargin < 15) {
      actions.push('전체 평균 순이익률이 낮습니다. 매출 확대보다 원가·수수료·광고비 개선이 우선입니다.');
    } else {
      actions.push('전체 평균 순이익률은 비교적 안정적입니다. 이익 기여도가 높은 상품에 예산을 우선 배분하세요.');
    }

    diagnosis.innerHTML = `<ol>${actions.map((action) => `<li>${action}</li>`).join('')}</ol>`;
  }

  if (persist) persistRows();
  return analyses;
}

function scheduleCalculate() {
  if (calculationFrame) return;
  calculationFrame = requestAnimationFrame(() => {
    calculationFrame = 0;
    calculateAll();
  });
}

function addRow(data = blankRow(), focus = false) {
  const row = rowTemplate(data);
  calculateAll();
  if (focus) row.querySelector('.bulk-name')?.focus({ preventScroll: true });
}

function loadSample() {
  tbody.innerHTML = '';
  sampleRows().forEach((row) => rowTemplate(row));
  setStatus(`예시 상품 3개를 ${currencyCode()} 기준으로 불러왔습니다. 실제 값으로 바꿔서 사용하세요.`, 'success');
  calculateAll();
}

function hasMeaningfulRows() {
  return readRows().some((row) => row.name || row.price || row.cost || row.units);
}

function clearRows() {
  if (hasMeaningfulRows() && !window.confirm('입력한 상품을 모두 지울까요?')) return;
  tbody.innerHTML = '';
  rowTemplate(blankRow());
  setStatus('입력값을 모두 초기화했습니다.', 'success');
  calculateAll();
}

function detectDelimiter(text) {
  const firstLine = String(text).split(/\r?\n/, 1)[0] || '';
  const candidates = [',', '\t', ';'];
  return candidates.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
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

function normalizeHeader(value) {
  return String(value || '')
    .replace(/^\ufeff/, '')
    .toLowerCase()
    .replace(/[\s_\-()%/]/g, '');
}

function decodeFile(buffer) {
  const bytes = new Uint8Array(buffer);
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  const replacementCount = (utf8.match(/�/g) || []).length;
  if (replacementCount <= 2) return utf8;
  try { return new TextDecoder('euc-kr').decode(bytes); } catch (error) { return utf8; }
}

async function importCsv(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    setStatus('CSV 파일은 5MB 이하만 불러올 수 있습니다.', 'error');
    return;
  }

  setStatus('파일을 읽는 중입니다.');
  try {
    const rows = parseCsv(decodeFile(await file.arrayBuffer()));
    if (rows.length < 2) throw new Error('데이터 행이 없습니다.');

    const headers = rows[0].map(normalizeHeader);
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
    const indexMap = Object.fromEntries(
      Object.entries(aliases).map(([key, names]) => [key, headers.findIndex((header) => names.includes(header))])
    );

    if (indexMap.name < 0 || indexMap.price < 0 || indexMap.cost < 0) {
      throw new Error('상품명, 판매가, 원가 열은 반드시 필요합니다.');
    }

    const imported = rows.slice(1, 201).map((values) => ({
      name: values[indexMap.name]?.trim() || '',
      price: number(values[indexMap.price]),
      cost: number(values[indexMap.cost]),
      fee: indexMap.fee >= 0 ? number(values[indexMap.fee]) : 13.3,
      ad: indexMap.ad >= 0 ? number(values[indexMap.ad]) : 0,
      shipping: indexMap.shipping >= 0 ? number(values[indexMap.shipping]) : defaultShipping(),
      returns: indexMap.returns >= 0 ? number(values[indexMap.returns]) : 0,
      units: indexMap.units >= 0 ? number(values[indexMap.units]) : 0
    })).filter((item) => item.name || item.price || item.cost || item.units);

    if (!imported.length) throw new Error('불러올 수 있는 상품이 없습니다.');

    if (indexMap.currency >= 0) {
      const importedCurrency = String(rows[1]?.[indexMap.currency] || '').trim().toUpperCase();
      if (supportedCurrencies.has(importedCurrency)) {
        window.FashionOpsCurrency?.setCurrency?.(importedCurrency);
      }
    }

    tbody.innerHTML = '';
    imported.forEach((row) => rowTemplate(row));
    calculateAll();
    const truncated = rows.length - 1 > 200 ? ' 최대 200개까지만 불러왔습니다.' : '';
    setStatus(`${imported.length}개 상품을 불러왔습니다.${truncated}`, 'success');
  } catch (error) {
    setStatus(`CSV를 불러오지 못했습니다: ${error.message}`, 'error');
  }
}

function csvNumber(value) {
  const digits = ['KRW', 'JPY'].includes(currencyCode()) ? 0 : 2;
  return Number(value.toFixed(digits));
}

function exportCsv() {
  const rows = calculateAll({ persist: false }).filter((row) => row.isReady);
  if (!rows.length) {
    setStatus('저장할 상품이 없습니다. 판매가를 입력한 뒤 다시 시도하세요.', 'error');
    return;
  }

  const korean = currencyCode() === 'KRW';
  const header = korean
    ? ['통화', '상품명', '판매가', '원가', '수수료율', '광고비율', '배송비', '반품률', '월판매량', '건당순이익', '순이익률', '반품반영월매출', '월예상순이익', '상태']
    : ['Currency', 'Product name', 'Price', 'Cost', 'Fee rate', 'Ad rate', 'Shipping', 'Return rate', 'Monthly units', 'Unit profit', 'Profit margin', 'Expected monthly revenue', 'Expected monthly profit', 'Status'];
  const statusMap = { 적자: 'Loss', 위험: 'Risk', 개선: 'Improve', 양호: 'Healthy' };
  const lines = rows.map((row) => [
    currencyCode(), row.displayName, row.price, row.cost, row.fee, row.ad, row.shipping, row.returns, row.units,
    csvNumber(row.unitProfit), row.margin.toFixed(1), csvNumber(row.monthlyRevenue), csvNumber(row.monthlyProfit),
    korean ? row.status : statusMap[row.status] || row.status
  ]);
  const csv = '\ufeff' + [header, ...lines]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fashionops-profit-audit-${currencyCode()}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  setStatus(`${rows.length}개 상품의 분석 결과를 ${currencyCode()} 기준으로 저장했습니다.`, 'success');
}

function legacyRowsAreSample(rows) {
  const samples = sampleRows();
  if (!Array.isArray(rows) || rows.length !== samples.length) return false;
  return rows.every((row, index) => ['name', 'price', 'cost', 'fee', 'ad', 'shipping', 'returns', 'units']
    .every((key) => String(row[key]) === String(samples[index][key])));
}

function restoreRows() {
  let savedRows = null;
  try {
    const current = JSON.parse(localStorage.getItem(bulkStoreKey) || 'null');
    if (current?.currency && supportedCurrencies.has(current.currency)) {
      window.FashionOpsCurrency?.setCurrency?.(current.currency);
    }
    if (Array.isArray(current?.rows)) savedRows = current.rows;

    if (!savedRows?.length) {
      for (const key of legacyStoreKeys) {
        const legacy = JSON.parse(localStorage.getItem(key) || 'null');
        const legacyRows = Array.isArray(legacy) ? legacy : legacy?.rows;
        if (Array.isArray(legacyRows) && legacyRows.length && !legacyRowsAreSample(legacyRows)) {
          savedRows = legacyRows;
          break;
        }
      }
    }
  } catch (error) {
    savedRows = null;
  }

  if (Array.isArray(savedRows) && savedRows.length) savedRows.slice(0, 200).forEach((row) => rowTemplate(row));
  else rowTemplate(blankRow());
}

if (tbody) {
  tbody.addEventListener('input', (event) => {
    if (event.target.matches('input')) scheduleCalculate();
  });

  tbody.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.row-remove');
    if (!removeButton) return;
    removeButton.closest('tr')?.remove();
    if (!tbody.children.length) rowTemplate(blankRow());
    calculateAll();
  });

  document.getElementById('add-row')?.addEventListener('click', () => addRow(blankRow(), true));
  document.getElementById('load-sample')?.addEventListener('click', loadSample);
  document.getElementById('clear-rows')?.addEventListener('click', clearRows);
  document.getElementById('export-csv')?.addEventListener('click', exportCsv);
  document.getElementById('import-csv')?.addEventListener('click', () => document.getElementById('csv-file')?.click());
  document.getElementById('csv-file')?.addEventListener('change', async (event) => {
    const [file] = event.target.files;
    await importCsv(file);
    event.target.value = '';
  });

  window.addEventListener('fashionops:currencychange', () => {
    tbody.querySelectorAll('.bulk-price,.bulk-cost,.bulk-shipping').forEach((input) => {
      input.step = moneyStep();
    });
    calculateAll();
  });

  restoreRows();
  calculateAll();
}