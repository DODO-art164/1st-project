const money = (value) => `${Math.round(value).toLocaleString('ko-KR')}원`;
const numberValue = (id) => {
  const element = document.getElementById(id);
  return element ? Math.max(Number(element.value) || 0, 0) : 0;
};
const percent = (value) => `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;

function setBadge(element, type, text) {
  if (!element) return;
  element.className = `result-badge ${type}`;
  element.textContent = text;
}

function setDiagnosis(id, label, text) {
  const element = document.getElementById(id);
  if (element) element.innerHTML = `<span>${label}</span><p>${text}</p>`;
}

function safeRate(value) {
  return Math.min(Math.max(value / 100, 0), 0.99);
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
  const margin = price > 0 ? (expectedProfit / price) * 100 : 0;
  const costRate = price > 0 ? (expectedProductCost / price) * 100 : 0;
  const contributionBeforeAds = expectedProfit + expectedAdCost;
  const breakEvenRoas = contributionBeforeAds > 0 ? (expectedRevenue / contributionBeforeAds) * 100 : 0;

  document.getElementById('profit-value').textContent = money(expectedProfit);
  document.getElementById('profit-margin').textContent = percent(margin);
  document.getElementById('profit-cost-rate').textContent = percent(costRate);
  document.getElementById('profit-roas').textContent = breakEvenRoas > 0 ? `${Math.ceil(breakEvenRoas)}%` : '달성 불가';

  const badge = document.getElementById('profit-badge');
  if (expectedProfit < 0) {
    setBadge(badge, 'danger', '판매할수록 손실');
    setDiagnosis('profit-diagnosis', '긴급 진단', `판매 1건당 약 ${money(Math.abs(expectedProfit))}의 손실이 예상됩니다. 광고 확대보다 판매가·원가·수수료 구조를 먼저 조정하세요.`);
  } else if (margin < 10) {
    setBadge(badge, 'danger', '이익 여유 부족');
    setDiagnosis('profit-diagnosis', '진단', '할인이나 반품률 상승에 쉽게 적자로 전환될 수 있습니다. 판매가 인상 또는 원가 절감을 우선 검토하세요.');
  } else if (margin < 25) {
    setBadge(badge, 'warning', '개선 여지 있음');
    setDiagnosis('profit-diagnosis', '진단', '기본 수익은 남지만 광고비와 할인 폭을 키우기 전 민감도 점검이 필요합니다.');
  } else {
    setBadge(badge, 'good', '수익 구조 양호');
    setDiagnosis('profit-diagnosis', '진단', '현재 가정에서는 비교적 안정적인 이익 구조입니다. 실제 반품률과 광고비를 매월 업데이트해 유지 여부를 확인하세요.');
  }

  const rows = [
    ['상품 원가', expectedProductCost],
    ['수수료', expectedFees],
    ['광고비', expectedAdCost],
    ['배송·포장', shipping + packaging],
    ['반품 손실', expectedReturnLoss],
    ['순이익', expectedProfit]
  ];
  const denominator = Math.max(price, 1);
  document.getElementById('profit-breakdown').innerHTML = rows.map(([label, value]) => `
    <div class="breakdown-row ${label === '순이익' ? 'profit' : ''}">
      <span>${label}</span>
      <div class="breakdown-track"><i style="width:${Math.min(Math.abs(value / denominator) * 100, 100)}%"></i></div>
      <b>${money(value)}</b>
    </div>`).join('');
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
    recommendedPrice = (targetProfit + (cost * keptRate) + extra) / revenueFactor;
    recommendedPrice = Math.ceil(recommendedPrice / 1000) * 1000;
  }
  const expectedProfit = recommendedPrice > 0 ? recommendedPrice * revenueFactor - cost * keptRate - extra : 0;
  const expectedMargin = recommendedPrice > 0 ? (expectedProfit / recommendedPrice) * 100 : 0;
  document.getElementById('price-value').textContent = recommendedPrice > 0 ? money(recommendedPrice) : '계산 불가';
  document.getElementById('price-profit').textContent = money(expectedProfit);
  document.getElementById('price-margin').textContent = percent(expectedMargin);
  if (revenueFactor <= 0) {
    setDiagnosis('price-diagnosis', '가격 경고', '수수료·광고비·반품률 가정이 지나치게 높아 어떤 판매가에서도 목표 이익을 계산하기 어렵습니다. 비용 비율을 먼저 낮추세요.');
  } else if (expectedMargin < 10) {
    setDiagnosis('price-diagnosis', '가격 팁', '목표 이익은 달성하지만 판매가 대비 이익 여유가 낮습니다. 할인 판매 계획이 있다면 정상가를 더 높게 잡아야 합니다.');
  } else {
    setDiagnosis('price-diagnosis', '가격 팁', '계산 가격은 최소 기준입니다. 실제 판매가는 시장 가격대, 부가세, 쿠폰과 할인 계획까지 반영해 결정하세요.');
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
  document.getElementById('bep-units').textContent = contribution > 0 ? `${units.toLocaleString('ko-KR')}개` : '계산 불가';
  document.getElementById('bep-sales').textContent = money(sales);
  document.getElementById('bep-daily').textContent = contribution > 0 ? `${dailyUnits.toFixed(1)}개` : '-';
  const badge = document.getElementById('bep-badge');
  if (contribution <= 0) {
    setBadge(badge, 'danger', '건당 손실 구조');
    setDiagnosis('bep-diagnosis', '긴급 진단', '평균 판매가가 건당 변동비보다 낮거나 같습니다. 판매량을 늘려도 고정비를 회수할 수 없습니다.');
  } else if (dailyUnits >= 20) {
    setBadge(badge, 'warning', '높은 판매 목표');
    setDiagnosis('bep-diagnosis', '운영 팁', '하루 목표 판매량이 높습니다. 고정비 절감이나 건당 공헌이익 개선 시나리오를 함께 비교하세요.');
  } else {
    setBadge(badge, 'good', '목표 설정 가능');
    setDiagnosis('bep-diagnosis', '운영 팁', `월 ${units.toLocaleString('ko-KR')}개를 넘긴 이후부터 추가 판매분이 영업이익에 기여합니다.`);
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
  document.getElementById('inventory-months').textContent = monthlySales > 0 ? `${monthsOnHand.toFixed(1)}개월` : '판매량 필요';
  document.getElementById('inventory-rop').textContent = `${reorderPoint.toLocaleString('ko-KR')}개`;
  document.getElementById('inventory-order').textContent = `${suggestedOrder.toLocaleString('ko-KR')}개`;
  const badge = document.getElementById('inventory-badge');
  if (monthlySales <= 0) {
    setBadge(badge, 'neutral', '판매 데이터 필요');
    setDiagnosis('inventory-diagnosis', '재고 진단', '월 평균 판매량을 입력해야 보유기간과 발주량을 계산할 수 있습니다.');
  } else if (monthsOnHand > targetMonths * 1.5) {
    setBadge(badge, 'danger', '과다 재고');
    setDiagnosis('inventory-diagnosis', '재고 진단', '추가 발주를 멈추고 콘텐츠·프로모션·세트 구성 등 소진 계획을 먼저 세우세요.');
  } else if (onHand <= reorderPoint) {
    setBadge(badge, 'warning', '발주 검토 시점');
    setDiagnosis('inventory-diagnosis', '재고 진단', `현재고가 재주문점 이하입니다. 입고 예정 수량을 확인한 뒤 약 ${suggestedOrder.toLocaleString('ko-KR')}개 발주를 검토하세요.`);
  } else if (monthsOnHand > targetMonths) {
    setBadge(badge, 'warning', '목표보다 많음');
    setDiagnosis('inventory-diagnosis', '재고 진단', '품절 위험은 낮지만 목표 보유기간을 초과합니다. 판매 추이를 확인하면서 다음 발주를 늦추세요.');
  } else {
    setBadge(badge, 'good', '적정 범위');
    setDiagnosis('inventory-diagnosis', '재고 진단', '현재 판매 속도와 목표 보유기간 기준으로 비교적 안정적인 재고 수준입니다.');
  }
}

const calculators = {
  'profit-form': calculateProfit,
  'price-form': calculatePrice,
  'bep-form': calculateBreakEven,
  'inventory-form': calculateInventory
};

Object.entries(calculators).forEach(([formId, calculator]) => {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculator();
  });
  form.querySelectorAll('input').forEach((input) => input.addEventListener('input', calculator));
});

document.querySelectorAll('.copy-button').forEach((button) => {
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.innerText);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1800);
      }
    } catch (error) {
      button.textContent = '복사할 수 없습니다';
      setTimeout(() => { button.textContent = '결과 복사'; }, 1600);
    }
  });
});

const storageKey = 'fashionops-main-calculator-values-v1';
const calculatorInputs = [...document.querySelectorAll('#tools input[id]')];
const defaultValues = Object.fromEntries(calculatorInputs.map((input) => [input.id, input.defaultValue]));

try {
  const savedValues = JSON.parse(localStorage.getItem(storageKey) || '{}');
  calculatorInputs.forEach((input) => {
    if (Object.prototype.hasOwnProperty.call(savedValues, input.id)) input.value = savedValues[input.id];
  });
} catch (error) {
  localStorage.removeItem(storageKey);
}

function saveCalculatorInputs() {
  try {
    const values = Object.fromEntries(calculatorInputs.map((input) => [input.id, input.value]));
    localStorage.setItem(storageKey, JSON.stringify(values));
  } catch (error) {
    // Storage can be unavailable in private browsing. Calculators still work without it.
  }
}

calculatorInputs.forEach((input) => input.addEventListener('input', saveCalculatorInputs));

Object.entries(calculators).forEach(([formId, calculator]) => {
  const form = document.getElementById(formId);
  if (!form) return;
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'copy-button';
  resetButton.textContent = '기본값으로 초기화';
  resetButton.addEventListener('click', () => {
    form.querySelectorAll('input[id]').forEach((input) => { input.value = defaultValues[input.id] ?? input.defaultValue; });
    saveCalculatorInputs();
    calculator();
  });
  form.appendChild(resetButton);
});

const mainNavigation = document.querySelector('.main-nav');
if (mainNavigation && !mainNavigation.querySelector('a[href="resources.html"]')) {
  const resourceLink = document.createElement('a');
  resourceLink.href = 'resources.html';
  resourceLink.textContent = '전체 도구';
  const callToAction = mainNavigation.querySelector('.nav-cta');
  mainNavigation.insertBefore(resourceLink, callToAction || null);
}

calculateProfit();
calculatePrice();
calculateBreakEven();
calculateInventory();