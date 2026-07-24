const money = (value) => `${Math.round(value).toLocaleString('ko-KR')}원`;
const percent = (value) => `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;

function numberValue(id) {
  const element = document.getElementById(id);
  return element ? Math.max(Number(element.value) || 0, 0) : 0;
}

function safeRate(value) {
  return Math.min(Math.max(value / 100, 0), 0.99);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setBadge(element, type, text) {
  if (!element) return;
  element.className = `result-badge ${type}`;
  element.textContent = text;
}

function setDiagnosis(id, label, text) {
  const element = document.getElementById(id);
  if (element) element.innerHTML = `<span>${label}</span><p>${text}</p>`;
}

function calculateProfit() {
  const price = numberValue('profit-price');
  const cost = numberValue('profit-cost');
  const packaging = numberValue('profit-pack');
  const shipping = numberValue('profit-ship');
  const feeRate = safeRate(numberValue('profit-platform') + numberValue('profit-payment'));
  const adRate = safeRate(numberValue('profit-ad'));
  const returnRate = safeRate(numberValue('profit-return'));
  const returnLoss = numberValue('profit-return-loss');

  const keptRate = 1 - returnRate;
  const expectedRevenue = price * keptRate;
  const expectedProductCost = cost * keptRate;
  const expectedFees = expectedRevenue * feeRate;
  const expectedAdCost = price * adRate;
  const expectedReturnLoss = returnRate * returnLoss;
  const expectedProfit = expectedRevenue - expectedProductCost - packaging - shipping - expectedFees - expectedAdCost - expectedReturnLoss;
  const margin = price > 0 ? expectedProfit / price * 100 : 0;
  const costRate = price > 0 ? expectedProductCost / price * 100 : 0;
  const contributionBeforeAds = expectedProfit + expectedAdCost;
  const breakEvenRoas = contributionBeforeAds > 0 ? expectedRevenue / contributionBeforeAds * 100 : 0;

  setText('profit-value', money(expectedProfit));
  setText('profit-margin', percent(margin));
  setText('profit-cost-rate', percent(costRate));
  setText('profit-roas', breakEvenRoas > 0 ? `${Math.ceil(breakEvenRoas)}%` : '달성 불가');

  const badge = document.getElementById('profit-badge');
  if (expectedProfit < 0) {
    setBadge(badge, 'danger', '판매할수록 손실');
    setDiagnosis('profit-diagnosis', '먼저 할 일', `판매 1건당 약 ${money(Math.abs(expectedProfit))}의 손실이 예상됩니다. 광고를 늘리기 전에 판매가·원가·수수료부터 조정하세요.`);
  } else if (margin < 10) {
    setBadge(badge, 'danger', '이익 여유 부족');
    setDiagnosis('profit-diagnosis', '먼저 할 일', '할인이나 반품률이 조금만 높아져도 적자로 바뀔 수 있습니다. 판매가 인상 또는 원가 절감을 우선 검토하세요.');
  } else if (margin < 25) {
    setBadge(badge, 'warning', '개선 여지 있음');
    setDiagnosis('profit-diagnosis', '다음 확인', '기본 이익은 남지만 광고비와 할인 폭을 키우기 전에 조건을 바꿔가며 다시 계산해 보세요.');
  } else {
    setBadge(badge, 'good', '수익 구조 양호');
    setDiagnosis('profit-diagnosis', '다음 확인', '현재 입력값에서는 비교적 안정적입니다. 실제 정산서의 광고비와 반품률로 매월 다시 확인하세요.');
  }

  const breakdown = document.getElementById('profit-breakdown');
  if (breakdown) {
    const rows = [
      ['상품 원가', expectedProductCost],
      ['수수료', expectedFees],
      ['광고비', expectedAdCost],
      ['배송·포장', shipping + packaging],
      ['반품 손실', expectedReturnLoss],
      ['순이익', expectedProfit]
    ];
    const denominator = Math.max(price, 1);
    breakdown.innerHTML = rows.map(([label, value]) => `
      <div class="breakdown-row ${label === '순이익' ? 'profit' : ''}">
        <span>${label}</span>
        <div class="breakdown-track"><i style="width:${Math.min(Math.abs(value / denominator) * 100, 100)}%"></i></div>
        <b>${money(value)}</b>
      </div>`).join('');
  }
}

function calculatePrice() {
  const cost = numberValue('price-cost');
  const extra = numberValue('price-extra');
  const feeRate = safeRate(numberValue('price-fee'));
  const adRate = safeRate(numberValue('price-ad'));
  const returnRate = safeRate(numberValue('price-return'));
  const targetProfit = numberValue('price-target');
  const keptRate = 1 - returnRate;
  const revenueFactor = keptRate * (1 - feeRate) - adRate;

  let recommendedPrice = 0;
  if (revenueFactor > 0) {
    recommendedPrice = (targetProfit + cost * keptRate + extra) / revenueFactor;
    recommendedPrice = Math.ceil(recommendedPrice / 1000) * 1000;
  }

  const expectedProfit = recommendedPrice > 0 ? recommendedPrice * revenueFactor - cost * keptRate - extra : 0;
  const expectedMargin = recommendedPrice > 0 ? expectedProfit / recommendedPrice * 100 : 0;

  setText('price-value', recommendedPrice > 0 ? money(recommendedPrice) : '계산 불가');
  setText('price-profit', money(expectedProfit));
  setText('price-margin', percent(expectedMargin));

  if (revenueFactor <= 0) {
    setDiagnosis('price-diagnosis', '확인 필요', '수수료·광고비·반품률 합계가 지나치게 높습니다. 판매가를 올리기 전에 비용 비율부터 줄이세요.');
  } else if (expectedMargin < 10) {
    setDiagnosis('price-diagnosis', '가격 팁', '목표 이익은 달성하지만 할인 여유가 거의 없습니다. 정기 세일이 있다면 정상가를 더 높게 잡아야 합니다.');
  } else {
    setDiagnosis('price-diagnosis', '가격 팁', '이 가격은 계산상 최소값입니다. 시장 가격대와 향후 할인 계획을 함께 비교해 최종 가격을 정하세요.');
  }
}

function calculateBreakEven() {
  const fixedCost = numberValue('bep-fixed');
  const averagePrice = numberValue('bep-price');
  const variableCost = numberValue('bep-variable');
  const operatingDays = Math.max(numberValue('bep-days'), 1);
  const contribution = averagePrice - variableCost;
  const units = contribution > 0 ? Math.ceil(fixedCost / contribution) : 0;
  const sales = units * averagePrice;
  const dailyUnits = units / operatingDays;

  setText('bep-units', contribution > 0 ? `${units.toLocaleString('ko-KR')}개` : '계산 불가');
  setText('bep-sales', money(sales));
  setText('bep-daily', contribution > 0 ? `${dailyUnits.toFixed(1)}개` : '-');

  const badge = document.getElementById('bep-badge');
  if (contribution <= 0) {
    setBadge(badge, 'danger', '건당 손실 구조');
    setDiagnosis('bep-diagnosis', '먼저 할 일', '평균 판매가가 건당 변동비보다 낮거나 같습니다. 판매량을 늘려도 고정비를 회수할 수 없습니다.');
  } else if (dailyUnits >= 20) {
    setBadge(badge, 'warning', '높은 판매 목표');
    setDiagnosis('bep-diagnosis', '다음 확인', '하루 목표 판매량이 높습니다. 고정비 절감 또는 건당 이익 개선 시나리오와 비교하세요.');
  } else {
    setBadge(badge, 'good', '목표 설정 가능');
    setDiagnosis('bep-diagnosis', '다음 확인', `월 ${units.toLocaleString('ko-KR')}개를 넘긴 뒤부터 추가 판매가 영업이익에 기여합니다.`);
  }
}

function calculateInventory() {
  const onHand = numberValue('inventory-stock');
  const monthlySales = numberValue('inventory-sales');
  const incoming = numberValue('inventory-incoming');
  const leadWeeks = numberValue('inventory-lead');
  const safetyStock = numberValue('inventory-safety');
  const targetMonths = numberValue('inventory-target');
  const totalAvailable = onHand + incoming;
  const monthsOnHand = monthlySales > 0 ? totalAvailable / monthlySales : 0;
  const dailySales = monthlySales / 30;
  const reorderPoint = Math.ceil(dailySales * leadWeeks * 7 + safetyStock);
  const targetStock = Math.ceil(monthlySales * targetMonths + safetyStock);
  const suggestedOrder = Math.max(targetStock - totalAvailable, 0);

  setText('inventory-months', monthlySales > 0 ? `${monthsOnHand.toFixed(1)}개월` : '판매량 필요');
  setText('inventory-rop', `${reorderPoint.toLocaleString('ko-KR')}개`);
  setText('inventory-order', `${suggestedOrder.toLocaleString('ko-KR')}개`);

  const badge = document.getElementById('inventory-badge');
  if (monthlySales <= 0) {
    setBadge(badge, 'neutral', '판매 데이터 필요');
    setDiagnosis('inventory-diagnosis', '입력 필요', '최근 30일 판매량을 입력해야 재고 보유기간과 발주량을 계산할 수 있습니다.');
  } else if (monthsOnHand > targetMonths * 1.5) {
    setBadge(badge, 'danger', '과다 재고');
    setDiagnosis('inventory-diagnosis', '먼저 할 일', '추가 발주를 멈추고 콘텐츠·세트 구성·프로모션 등 소진 계획을 먼저 세우세요.');
  } else if (onHand <= reorderPoint) {
    setBadge(badge, 'warning', '발주 검토 시점');
    setDiagnosis('inventory-diagnosis', '다음 확인', `입고 예정 수량을 확인한 뒤 약 ${suggestedOrder.toLocaleString('ko-KR')}개 발주를 검토하세요.`);
  } else if (monthsOnHand > targetMonths) {
    setBadge(badge, 'warning', '목표보다 많음');
    setDiagnosis('inventory-diagnosis', '다음 확인', '품절 위험은 낮지만 목표 보유기간을 초과합니다. 다음 발주를 늦추고 판매 추이를 확인하세요.');
  } else {
    setBadge(badge, 'good', '적정 범위');
    setDiagnosis('inventory-diagnosis', '다음 확인', '현재 판매 속도와 목표 보유기간 기준으로 비교적 안정적인 재고 수준입니다.');
  }
}

const calculators = {
  profit: { formId: 'profit-form', panelId: 'profit-calculator', calculate: calculateProfit },
  price: { formId: 'price-form', panelId: 'price-calculator', calculate: calculatePrice },
  bep: { formId: 'bep-form', panelId: 'bep-calculator', calculate: calculateBreakEven },
  inventory: { formId: 'inventory-form', panelId: 'inventory-calculator', calculate: calculateInventory }
};

const storageKey = 'fashionops-main-calculator-values-v2';
const calculatorInputs = [...document.querySelectorAll('#tools input[id]')];
const defaultValues = Object.fromEntries(calculatorInputs.map((input) => [input.id, input.defaultValue]));

try {
  const savedValues = JSON.parse(localStorage.getItem(storageKey) || '{}');
  calculatorInputs.forEach((input) => {
    if (Object.prototype.hasOwnProperty.call(savedValues, input.id)) input.value = savedValues[input.id];
  });
} catch (error) {
  try { localStorage.removeItem(storageKey); } catch (storageError) {}
}

function saveCalculatorInputs() {
  try {
    const values = Object.fromEntries(calculatorInputs.map((input) => [input.id, input.value]));
    localStorage.setItem(storageKey, JSON.stringify(values));
  } catch (error) {}
}

Object.values(calculators).forEach(({ formId, calculate }) => {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
  });

  form.querySelectorAll('input[id]').forEach((input) => {
    input.addEventListener('input', () => {
      calculate();
      saveCalculatorInputs();
    });
  });

  const actions = form.querySelector('.form-actions') || form;
  if (!actions.querySelector('[data-reset-form]')) {
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'copy-button';
    resetButton.dataset.resetForm = formId;
    resetButton.textContent = '입력값 초기화';
    resetButton.addEventListener('click', () => {
      form.querySelectorAll('input[id]').forEach((input) => {
        input.value = defaultValues[input.id] ?? input.defaultValue;
      });
      saveCalculatorInputs();
      calculate();
    });
    actions.appendChild(resetButton);
  }
});

function activateCalculator(key, updateUrl = false) {
  const selected = calculators[key] || calculators.profit;
  document.querySelectorAll('[data-calculator-panel]').forEach((panel) => {
    panel.hidden = panel.id !== selected.panelId;
  });
  document.querySelectorAll('[data-calculator-tab]').forEach((tab) => {
    const active = tab.dataset.calculatorTab === key;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  selected.calculate();
  if (updateUrl) history.replaceState(null, '', `#${selected.panelId}`);
}

const keyByPanelId = Object.fromEntries(Object.entries(calculators).map(([key, value]) => [value.panelId, key]));
const initialKey = keyByPanelId[location.hash.slice(1)] || 'profit';
activateCalculator(initialKey);

document.querySelectorAll('[data-calculator-tab]').forEach((tab) => {
  tab.addEventListener('click', () => activateCalculator(tab.dataset.calculatorTab, true));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const tabs = [...document.querySelectorAll('[data-calculator-tab]')];
    const currentIndex = tabs.indexOf(tab);
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(currentIndex + direction + tabs.length) % tabs.length];
    next.focus();
    activateCalculator(next.dataset.calculatorTab, true);
  });
});

window.addEventListener('hashchange', () => {
  const key = keyByPanelId[location.hash.slice(1)];
  if (key) activateCalculator(key);
});

document.querySelectorAll('.copy-button[data-copy-target]').forEach((button) => {
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(target.innerText);
      button.textContent = '복사 완료';
      setTimeout(() => { button.textContent = original; }, 1400);
    } catch (error) {
      button.textContent = '복사 실패';
      setTimeout(() => { button.textContent = original; }, 1400);
    }
  });
});

Object.values(calculators).forEach(({ calculate }) => calculate());
