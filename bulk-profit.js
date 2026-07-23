const bulkStoreKey = 'fashionops-bulk-profit-v2';
const tbody = document.getElementById('product-rows');
const money = (value) => `${Math.round(value).toLocaleString('ko-KR')}원`;
const number = (value) => Math.max(Number(String(value).replaceAll(',', '').trim()) || 0, 0);
const rate = (value) => Math.min(number(value) / 100, 0.99);

const sampleRows = [
  { name: '오버핏 티셔츠', price: 49000, cost: 16000, fee: 13.3, ad: 12, shipping: 3500, returns: 7, units: 80 },
  { name: '와이드 데님', price: 89000, cost: 34000, fee: 13.3, ad: 15, shipping: 3500, returns: 10, units: 45 },
  { name: '후드 집업', price: 119000, cost: 47000, fee: 13.3, ad: 18, shipping: 3500, returns: 8, units: 30 }
];

function escapeAttribute(value) {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function rowTemplate(data = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="bulk-name" type="text" value="${escapeAttribute(data.name)}" placeholder="상품명"></td>
    <td><input class="bulk-price" type="number" min="0" value="${data.price ?? 69000}"></td>
    <td><input class="bulk-cost" type="number" min="0" value="${data.cost ?? 26000}"></td>
    <td><input class="bulk-fee" type="number" min="0" max="99" step="0.1" value="${data.fee ?? 13.3}"></td>
    <td><input class="bulk-ad" type="number" min="0" max="99" step="0.1" value="${data.ad ?? 12}"></td>
    <td><input class="bulk-shipping" type="number" min="0" value="${data.shipping ?? 3500}"></td>
    <td><input class="bulk-returns" type="number" min="0" max="95" step="0.1" value="${data.returns ?? 7}"></td>
    <td><input class="bulk-units" type="number" min="0" value="${data.units ?? 30}"></td>
    <td class="row-profit">-</td>
    <td class="row-margin">-</td>
    <td class="row-monthly">-</td>
    <td><button type="button" class="row-remove" aria-label="상품 삭제">×</button></td>`;
  tr.querySelectorAll('input').forEach((input) => input.addEventListener('input', calculateAll));
  tr.querySelector('.row-remove').addEventListener('click', () => {
    tr.remove();
    if (!tbody.children.length) addRow();
    calculateAll();
  });
  tbody.appendChild(tr);
}

function readRows() {
  return [...tbody.querySelectorAll('tr')].map((tr) => ({
    name: tr.querySelector('.bulk-name').value.trim() || '이름 없는 상품',
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
  const kept = 1 - rate(row.returns);
  const expectedRevenue = row.price * kept;
  const expectedCost = row.cost * kept;
  const fees = expectedRevenue * rate(row.fee);
  const ads = row.price * rate(row.ad);
  const returnHandling = row.shipping * rate(row.returns) * 2;
  const unitProfit = expectedRevenue - expectedCost - fees - ads - row.shipping - returnHandling;
  const margin = row.price > 0 ? unitProfit / row.price * 100 : 0;
  const monthlyRevenue = row.price * row.units;
  const monthlyProfit = unitProfit * row.units;
  let status = '양호';
  if (unitProfit < 0) status = '적자';
  else if (margin < 10) status = '위험';
  else if (margin < 20) status = '개선';
  return { ...row, unitProfit, margin, monthlyRevenue, monthlyProfit, status };
}

function calculateAll() {
  const analyses = readRows().map(analyze);
  let totalRevenue = 0;
  let totalProfit = 0;
  let weightedUnits = 0;
  let weightedMargin = 0;
  let riskCount = 0;

  analyses.forEach((item, index) => {
    const tr = tbody.children[index];
    tr.querySelector('.row-profit').textContent = money(item.unitProfit);
    tr.querySelector('.row-margin').textContent = `${item.margin.toFixed(1)}%`;
    tr.querySelector('.row-monthly').textContent = money(item.monthlyProfit);
    tr.dataset.status = item.status;
    totalRevenue += item.monthlyRevenue;
    totalProfit += item.monthlyProfit;
    weightedUnits += item.units;
    weightedMargin += item.margin * item.units;
    if (item.status === '적자' || item.status === '위험') riskCount += 1;
  });

  const averageMargin = weightedUnits > 0 ? weightedMargin / weightedUnits : 0;
  document.getElementById('bulk-revenue').textContent = money(totalRevenue);
  document.getElementById('bulk-profit').textContent = money(totalProfit);
  document.getElementById('bulk-margin').textContent = `${averageMargin.toFixed(1)}%`;
  document.getElementById('bulk-risk').textContent = `${riskCount}개`;

  const sorted = [...analyses].sort((a, b) => a.margin - b.margin);
  const diagnosis = document.getElementById('bulk-diagnosis');
  const worst = sorted[0];
  const best = [...analyses].sort((a, b) => b.monthlyProfit - a.monthlyProfit)[0];
  const actions = [];

  if (!analyses.length) {
    diagnosis.innerHTML = '<p>상품을 추가하면 우선순위를 분석합니다.</p>';
  } else {
    if (worst.unitProfit < 0) actions.push(`<b>${escapeAttribute(worst.name)}</b>은 판매 1건당 ${money(Math.abs(worst.unitProfit))} 적자입니다. 광고를 중지하고 가격·원가를 먼저 조정하세요.`);
    else if (worst.margin < 10) actions.push(`<b>${escapeAttribute(worst.name)}</b>의 순이익률은 ${worst.margin.toFixed(1)}%로 할인과 반품에 취약합니다.`);
    else actions.push('현재 입력 상품 중 구조적 적자는 없습니다.');
    if (best) actions.push(`월 이익 기여도가 가장 높은 상품은 <b>${escapeAttribute(best.name)}</b>이며 예상 월이익은 ${money(best.monthlyProfit)}입니다.`);
    if (averageMargin < 15) actions.push('전체 평균 마진이 낮습니다. 매출 확대보다 원가·수수료·광고비 개선이 우선입니다.');
    else actions.push('평균 마진은 운영 가능한 범위입니다. 상품별 광고비를 분리해 성과가 좋은 상품에 예산을 집중하세요.');
    diagnosis.innerHTML = `<ol>${actions.map((action) => `<li>${action}</li>`).join('')}</ol>`;
  }

  try { localStorage.setItem(bulkStoreKey, JSON.stringify(readRows())); } catch (error) {}
  return analyses;
}

function addRow(data) {
  rowTemplate(data);
  calculateAll();
}

function loadSample() {
  tbody.innerHTML = '';
  sampleRows.forEach(rowTemplate);
  calculateAll();
}

function clearRows() {
  tbody.innerHTML = '';
  addRow({ name: '', price: 69000, cost: 26000, fee: 13.3, ad: 12, shipping: 3500, returns: 7, units: 30 });
}

function parseCsv(text) {
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
    } else if (char === ',' && !quoted) {
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
  return String(value || '').replace(/^\ufeff/, '').toLowerCase().replaceAll(' ', '').replaceAll('_', '').replaceAll('%', '');
}

function importCsv(file) {
  const status = document.getElementById('import-status');
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(String(reader.result || ''));
      if (rows.length < 2) throw new Error('데이터 행이 없습니다.');
      const headers = rows[0].map(normalizeHeader);
      const aliases = {
        name: ['상품명','제품명','name','product','productname'],
        price: ['판매가','가격','price','saleprice'],
        cost: ['원가','상품원가','cost','cogs'],
        fee: ['수수료율','수수료','fee','feerate'],
        ad: ['광고비율','광고비','ad','adrate','advertising'],
        shipping: ['배송비','포장배송비','shipping','shippingcost'],
        returns: ['반품률','반품','returnrate','returns'],
        units: ['월판매량','판매량','units','monthlyunits','quantity']
      };
      const indexMap = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, headers.findIndex((header) => names.includes(header))]));
      if (indexMap.name < 0 || indexMap.price < 0 || indexMap.cost < 0) throw new Error('상품명, 판매가, 원가 열은 반드시 필요합니다.');
      const imported = rows.slice(1, 201).map((values) => ({
        name: values[indexMap.name] || '이름 없는 상품',
        price: number(values[indexMap.price]),
        cost: number(values[indexMap.cost]),
        fee: indexMap.fee >= 0 ? number(values[indexMap.fee]) : 13.3,
        ad: indexMap.ad >= 0 ? number(values[indexMap.ad]) : 12,
        shipping: indexMap.shipping >= 0 ? number(values[indexMap.shipping]) : 3500,
        returns: indexMap.returns >= 0 ? number(values[indexMap.returns]) : 7,
        units: indexMap.units >= 0 ? number(values[indexMap.units]) : 0
      })).filter((item) => item.name || item.price || item.cost);
      if (!imported.length) throw new Error('불러올 수 있는 상품이 없습니다.');
      tbody.innerHTML = '';
      imported.forEach(rowTemplate);
      calculateAll();
      status.textContent = `${imported.length}개 상품을 불러왔습니다.`;
      status.dataset.type = 'success';
    } catch (error) {
      status.textContent = `CSV를 불러오지 못했습니다: ${error.message}`;
      status.dataset.type = 'error';
    }
  };
  reader.onerror = () => {
    status.textContent = '파일을 읽지 못했습니다.';
    status.dataset.type = 'error';
  };
  reader.readAsText(file, 'utf-8');
}

function exportCsv() {
  const rows = calculateAll();
  const header = ['상품명','판매가','원가','수수료율','광고비율','배송비','반품률','월판매량','건당순이익','순이익률','월예상매출','월예상순이익','상태'];
  const lines = rows.map((row) => [row.name,row.price,row.cost,row.fee,row.ad,row.shipping,row.returns,row.units,Math.round(row.unitProfit),row.margin.toFixed(1),Math.round(row.monthlyRevenue),Math.round(row.monthlyProfit),row.status]);
  const csv = '\ufeff' + [header, ...lines].map((line) => line.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fashionops-profit-audit-${new Date().toISOString().slice(0,10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

document.getElementById('add-row').addEventListener('click', () => addRow());
document.getElementById('load-sample').addEventListener('click', loadSample);
document.getElementById('clear-rows').addEventListener('click', clearRows);
document.getElementById('export-csv').addEventListener('click', exportCsv);
document.getElementById('import-csv').addEventListener('click', () => document.getElementById('csv-file').click());
document.getElementById('csv-file').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) importCsv(file);
  event.target.value = '';
});

try {
  const stored = JSON.parse(localStorage.getItem(bulkStoreKey) || 'null');
  if (Array.isArray(stored) && stored.length) stored.forEach(rowTemplate);
  else sampleRows.forEach(rowTemplate);
} catch (error) {
  sampleRows.forEach(rowTemplate);
}
calculateAll();
