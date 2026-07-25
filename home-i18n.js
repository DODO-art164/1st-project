(() => {
  const STORAGE_KEY = 'fashionops-language-v1';
  const copy = {
    '계산기로 바로 이동': 'Skip to calculators',
    'FashionOps 홈': 'FashionOps home',
    '주요 메뉴': 'Primary navigation',
    '개별 계산': 'Single calculator',
    '대량 분석': 'Bulk analysis',
    '주간 점검': 'Weekly check',
    '전체 도구': 'All tools',
    '커뮤니티': 'Community',
    '언어 선택': 'Language selection',
    '한국어로 보기': 'View in Korean',
    '영어로 보기': 'View in English',
    '패션 셀러 수익 분석': 'Profit tools for fashion sellers',
    '상품의 실제 이익을': 'See what each product',
    '바로 계산하세요.': 'really earns.',
    '한 상품은 아래 계산기에서, 여러 상품은 CSV 대량 분석에서 확인하세요. 입력값은 현재 브라우저에만 저장됩니다.': 'Check one product with the calculators below or compare many products with CSV bulk analysis. Your inputs stay in this browser.',
    '한 상품 계산 시작': 'Calculate one product',
    '여러 상품 CSV 분석': 'Analyze multiple products',
    '회원가입 없음': 'No sign-up',
    '입력 즉시 자동 계산': 'Instant calculation',
    '데이터 서버 전송 없음': 'No calculator data sent',
    '서비스 특징': 'Service features',
    '핵심 계산': 'CORE CALCULATION',
    '매출이 아니라 실제 남는 돈': 'Profit after every real cost',
    '수수료·광고·배송·반품까지 한 번에 반영합니다.': 'Include fees, ads, shipping and returns in one calculation.',
    '가격 설계': 'PRICING',
    '목표 이익에서 판매가를 역산': 'Work backward from target profit',
    '할인 전에 지켜야 할 최소 가격을 확인하세요.': 'Find the minimum price you need before discounting.',
    '재고 운영': 'INVENTORY',
    '판매 속도에 맞춘 발주 판단': 'Order based on sell-through',
    '재고 보유기간과 재주문점을 함께 확인합니다.': 'Review months on hand and reorder point together.',
    '계산할 항목 선택': 'Choose a calculation',
    '지금 궁금한 숫자 하나만 고르세요': 'Choose the number you need now',
    '선택한 계산기 하나만 표시됩니다. 현재 숫자는 작동을 보여주는 예시값이며 실제 값으로 바꾸면 자동 저장됩니다.': 'Only the selected calculator is shown. The starting numbers are examples and your own inputs are saved automatically in this browser.',
    '계산기 선택': 'Calculator selection',
    '실제 순이익': 'Net profit',
    '목표 판매가': 'Target price',
    '손익분기점': 'Break-even',
    '재고·발주': 'Inventory',
    '판매 1건 기준': 'Per sale',
    '실제 순이익 계산기': 'Net profit calculator',
    '수수료, 광고, 배송과 반품 손실까지 제외하고 실제 남는 돈을 계산합니다.': 'Calculate what remains after fees, advertising, shipping and return losses.',
    '1. 상품 가격과 직접비': '1. Price and direct costs',
    '먼저 알고 있는 기본 금액을 입력하세요.': 'Enter the basic amounts you already know.',
    '판매가': 'Selling price',
    '고객이 결제하는 최종 상품 가격입니다.': 'The final product price paid by the customer.',
    '상품 원가': 'Product cost',
    '포장비': 'Packaging',
    '배송비 부담액': 'Shipping paid by seller',
    '2. 판매 과정의 비율 비용': '2. Percentage-based selling costs',
    '기본값은 예시입니다. 실제 정산서와 광고비를 기준으로 바꿔 주세요.': 'The defaults are examples. Replace them with your actual settlement and advertising data.',
    '플랫폼 수수료': 'Platform fee',
    '결제 수수료': 'Payment fee',
    '광고비 비율': 'Advertising cost rate',
    '같은 기간의 전체 상품 매출 대비 광고비 비율입니다.': 'Advertising spend as a percentage of product revenue for the same period.',
    '예상 반품률': 'Expected return rate',
    '반품 손실까지 더 정확히 입력': 'Add detailed return loss',
    '반품 1건당 추가 손실': 'Additional loss per return',
    '반품 배송비, 검수, 재포장과 상품 가치 하락을 합친 예상 금액입니다.': 'Estimated return shipping, inspection, repacking and product value loss.',
    '순이익 확인': 'Check net profit',
    '예상 결과': 'Estimated result',
    '판매 1건당 예상 순이익': 'Estimated net profit per sale',
    '계산 중': 'Calculating',
    '실질 순이익률': 'Net margin',
    '예상 원가율': 'Cost rate',
    '광고 손익분기 ROAS': 'Break-even ROAS',
    '진단': 'Diagnosis',
    '값을 입력하면 수익 구조를 분석합니다.': 'Enter values to analyze the profit structure.',
    '결과 복사': 'Copy result',
    '가격 결정': 'Pricing',
    '목표 판매가 계산기': 'Target price calculator',
    '원하는 순이익을 확보하려면 최소 얼마에 판매해야 하는지 계산합니다.': 'Calculate the minimum selling price needed to achieve your target profit.',
    '원가와 판매 조건': 'Cost and selling conditions',
    '포장·배송비': 'Packaging and shipping',
    '수수료 합계': 'Total fees',
    '목표 순이익': 'Target net profit',
    '권장 판매가 확인': 'Check recommended price',
    '권장 가격': 'Recommended price',
    '목표 이익을 위한 최소 판매가': 'Minimum price for target profit',
    '통화별 단위 올림': 'Rounded by currency unit',
    '예상 순이익': 'Estimated net profit',
    '예상 순이익률': 'Estimated net margin',
    '가격 팁': 'Pricing note',
    '계산 가격을 시장 가격대와 비교하세요.': 'Compare the calculated price with the market range.',
    '월 목표': 'Monthly target',
    '손익분기점 계산기': 'Break-even calculator',
    '매달 적자를 피하기 위해 필요한 최소 판매량과 매출을 확인합니다.': 'Find the minimum monthly units and revenue needed to avoid a loss.',
    '월 운영 조건': 'Monthly operating conditions',
    '월 고정비': 'Monthly fixed costs',
    '평균 판매가': 'Average selling price',
    '건당 변동비': 'Variable cost per sale',
    '월 영업일': 'Operating days per month',
    '월 손익분기점 확인': 'Check monthly break-even',
    '월 손익분기점': 'Monthly break-even',
    '월 최소 판매량': 'Minimum monthly units',
    '목표 수량': 'Target units',
    '월 최소 매출': 'Minimum monthly revenue',
    '하루 평균 판매량': 'Average daily units',
    '운영 팁': 'Operating note',
    '현재 판매량과 비교해 목표의 현실성을 판단하세요.': 'Compare this with current sales to judge whether the target is realistic.',
    '재고 관리': 'Inventory management',
    '재고 위험·발주 계산기': 'Inventory risk and reorder calculator',
    '현재 판매 속도에서 재고가 몇 개월치인지와 발주 시점을 진단합니다.': 'Estimate months of inventory and when to reorder at the current sales pace.',
    '현재 재고와 판매 속도': 'Current inventory and sales pace',
    '현재 판매 가능 재고': 'Sellable inventory',
    '월 평균 판매량': 'Average monthly sales',
    '입고 예정 수량': 'Incoming inventory',
    '발주 리드타임': 'Reorder lead time',
    '안전재고': 'Safety stock',
    '목표 보유기간': 'Target months on hand',
    '재고 상태 확인': 'Check inventory status',
    '재고 상태': 'Inventory status',
    '예상 재고 보유기간': 'Estimated months on hand',
    '재주문점': 'Reorder point',
    '현재 발주 제안': 'Suggested order now',
    '재고 진단': 'Inventory diagnosis',
    '판매 속도와 목표 보유기간을 기준으로 분석합니다.': 'Analysis based on sales pace and target months on hand.',
    '상품이 여러 개라면': 'For multiple products',
    'CSV로 한 번에 비교': 'Compare them in one CSV',
    '적자 상품, 월 예상이익과 이익 기여 상품을 한 화면에서 확인합니다.': 'See loss-making products, estimated monthly profit and top profit contributors together.',
    '매주 숫자를 확인한다면': 'For a weekly routine',
    '주간 운영 체크리스트': 'Weekly operations checklist',
    '매출·광고·반품·재고를 같은 순서로 확인하고 진행률을 저장합니다.': 'Review sales, ads, returns and inventory in the same order and save progress.',
    '이번 주 점검': 'Check this week',
    '계산 결과를 실행으로': 'Turn results into action',
    '숫자가 달라지는 이유를 함께 확인하세요': 'Understand why the numbers change',
    '전체 도구와 가이드 →': 'All tools and guides →',
    '온라인 쇼핑몰 순이익 계산법': 'How to calculate online-store net profit',
    '수수료·광고비·배송·반품을 빠뜨리지 않는 계산 순서': 'A calculation order that includes fees, ads, shipping and returns',
    '쇼핑몰 수수료와 실제 정산액': 'Marketplace fees and actual settlement',
    '수수료율만 보고 수익을 잘못 판단하지 않는 방법': 'How to avoid judging profit from the fee rate alone',
    '손익분기 ROAS 계산법': 'How to calculate break-even ROAS',
    '광고 매출이 아니라 광고 이익을 판단하는 기준': 'A standard for judging advertising profit instead of ad-attributed revenue',
    '계산 전 확인': 'Before calculating',
    '자주 묻는 질문': 'Frequently asked questions',
    '화면에 처음 보이는 숫자는 실제 권장값인가요?': 'Are the initial numbers recommended values?',
    '아닙니다. 계산기 작동을 보여주기 위한 예시값입니다. 판매 채널 정산서, 실제 광고비와 반품률로 바꿔 입력하세요.': 'No. They are examples that demonstrate how the calculators work. Replace them with your settlement, advertising spend and return rate.',
    '계산 결과가 실제 회계상 이익과 같은가요?': 'Is the result the same as accounting profit?',
    '빠른 사업 판단을 위한 추정값입니다. 부가세, 세금, 인건비와 플랫폼별 정산 규칙에 따라 실제 금액은 달라질 수 있습니다.': 'It is an estimate for quick business decisions. Actual figures can differ because of VAT, tax, labor and platform settlement rules.',
    '광고비 비율은 어떻게 입력하나요?': 'How do I enter the advertising cost rate?',
    '같은 기간의 전체 상품 매출 대비 광고비 비율을 입력하세요. 매출 1,000만원에 광고비 120만원이면 12%입니다.': 'Enter advertising spend as a percentage of product revenue for the same period. For example, ₩1.2 million of ads on ₩10 million of revenue is 12%.',
    '입력한 데이터가 서버에 저장되나요?': 'Is my calculator data stored on a server?',
    '무료 계산과 대량 분석은 브라우저에서 실행되며 입력값을 FashionOps 서버로 전송하지 않습니다.': 'The free calculators and bulk analysis run in your browser and do not send calculator inputs to the FashionOps server.',
    '패션 브랜드와 의류 쇼핑몰을 위한 손익·가격·재고 분석 도구입니다.': 'Profit, pricing and inventory tools for fashion brands and online stores.',
    '서비스': 'Services',
    '대량 손익 분석': 'Bulk profit analysis',
    '주간 운영 점검': 'Weekly operations check',
    '전체 무료 도구': 'All free tools',
    '정보': 'Information',
    '순이익 계산 가이드': 'Net profit guide',
    '서비스 소개': 'About',
    '문의': 'Contact',
    '개인정보처리방침': 'Privacy policy',
    '이용약관': 'Terms of use',
    '계산 결과는 참고용이며 전문 회계·세무 자문을 대체하지 않습니다.': 'Results are estimates and do not replace professional accounting or tax advice.',
    '입력값 초기화': 'Reset inputs',
    '복사 완료': 'Copied',
    '복사 실패': 'Copy failed',
    '판매가 입력 필요': 'Selling price required',
    '입력 필요': 'Input required',
    '고객이 결제하는 판매가를 입력하면 예상 순이익을 계산합니다.': 'Enter the customer selling price to calculate estimated net profit.',
    '판매할수록 손실': 'Loss on every sale',
    '먼저 할 일': 'First action',
    '이익 여유 부족': 'Low profit buffer',
    '개선 여지 있음': 'Room to improve',
    '다음 확인': 'Next check',
    '수익 구조 양호': 'Healthy profit structure',
    '상품 원가': 'Product cost',
    '수수료': 'Fees',
    '광고비': 'Advertising',
    '배송·포장': 'Shipping and packaging',
    '반품 손실': 'Return loss',
    '순이익': 'Net profit',
    '계산 불가': 'Cannot calculate',
    '확인 필요': 'Review required',
    '판매가 입력 필요': 'Selling price required',
    '건당 손실 구조': 'Loss per sale',
    '높은 판매 목표': 'High sales target',
    '목표 설정 가능': 'Achievable target',
    '판매 데이터 필요': 'Sales data required',
    '최근 30일 판매량을 입력해야 재고 보유기간과 발주량을 계산할 수 있습니다.': 'Enter sales for the last 30 days to calculate months on hand and reorder quantity.',
    '과다 재고': 'Excess inventory',
    '추가 발주를 멈추고 콘텐츠·세트 구성·프로모션 등 소진 계획을 먼저 세우세요.': 'Pause new orders and create a sell-through plan using content, bundles or promotions.',
    '발주 검토 시점': 'Time to review ordering',
    '목표보다 많음': 'Above target',
    '품절 위험은 낮지만 목표 보유기간을 초과합니다. 다음 발주를 늦추고 판매 추이를 확인하세요.': 'Stockout risk is low, but inventory exceeds the target period. Delay the next order and monitor sales.',
    '적정 범위': 'Within target range',
    '현재 판매 속도와 목표 보유기간 기준으로 비교적 안정적인 재고 수준입니다.': 'Inventory is relatively stable for the current sales pace and target period.',
    '계산에 사용할 통화 선택': 'Select calculation currency'
  };

  const reverse = Object.fromEntries(Object.entries(copy).map(([ko, en]) => [en, ko]));
  const titles = {
    ko: 'FashionOps | 패션 상품 손익·가격·재고 분석',
    en: 'FashionOps | Fashion profit, pricing and inventory calculators'
  };
  const descriptions = {
    ko: '패션 브랜드와 의류 쇼핑몰을 위한 무료 손익 분석 도구. 상품별 순이익, 판매가, 손익분기점, 재고와 광고 수익성을 계산하세요.',
    en: 'Free profit analysis tools for fashion brands and online stores. Calculate product profit, target price, break-even, inventory and advertising viability.'
  };

  let language = 'ko';
  let translating = false;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ko') language = saved;
  } catch {}

  function dynamicTranslate(value, target) {
    if (target === 'en') {
      return value
        .replace(/^([\d,.]+)개$/, '$1 units')
        .replace(/^([\d,.]+)개월$/, '$1 months')
        .replace(/^([\d,.]+)일$/, '$1 days')
        .replace(/^([\d,.]+)주$/, '$1 weeks')
        .replace(/^판매 1건당 약 (.+)의 손실이 예상됩니다\. 광고를 늘리기 전에 판매가·원가·수수료부터 조정하세요\.$/, 'An estimated loss of $1 is expected per sale. Adjust price, cost and fees before increasing advertising.')
        .replace(/^월 ([\d,.]+)개를 넘긴 뒤부터 추가 판매가 영업이익에 기여합니다\.$/, 'Sales above $1 units per month begin contributing to operating profit.')
        .replace(/^입고 예정 수량을 확인한 뒤 약 ([\d,.]+)개 발주를 검토하세요\.$/, 'After confirming incoming inventory, consider ordering about $1 units.')
        .replace(/^1,000 KRW 단위 올림$/, 'Rounded up to the nearest 1,000 KRW')
        .replace(/^100 JPY 단위 올림$/, 'Rounded up to the nearest 100 JPY')
        .replace(/^0\.01 ([A-Z]{3}) 단위 올림$/, 'Rounded up to the nearest 0.01 $1');
    }
    return value
      .replace(/^([\d,.]+) units$/, '$1개')
      .replace(/^([\d,.]+) months$/, '$1개월')
      .replace(/^([\d,.]+) days$/, '$1일')
      .replace(/^([\d,.]+) weeks$/, '$1주')
      .replace(/^An estimated loss of (.+) is expected per sale\. Adjust price, cost and fees before increasing advertising\.$/, '판매 1건당 약 $1의 손실이 예상됩니다. 광고를 늘리기 전에 판매가·원가·수수료부터 조정하세요.')
      .replace(/^Sales above ([\d,.]+) units per month begin contributing to operating profit\.$/, '월 $1개를 넘긴 뒤부터 추가 판매가 영업이익에 기여합니다.')
      .replace(/^After confirming incoming inventory, consider ordering about ([\d,.]+) units\.$/, '입고 예정 수량을 확인한 뒤 약 $1개 발주를 검토하세요.')
      .replace(/^Rounded up to the nearest 1,000 KRW$/, '1,000 KRW 단위 올림')
      .replace(/^Rounded up to the nearest 100 JPY$/, '100 JPY 단위 올림')
      .replace(/^Rounded up to the nearest 0\.01 ([A-Z]{3})$/, '0.01 $1 단위 올림');
  }

  function translateValue(value, target) {
    const trimmed = value.trim();
    if (!trimmed) return value;
    const direct = target === 'en' ? copy[trimmed] : reverse[trimmed];
    const translated = direct || dynamicTranslate(trimmed, target);
    if (translated === trimmed) return value;
    return value.replace(trimmed, translated);
  }

  function translateRoot(root, target) {
    if (!root || translating) return;
    translating = true;
    try {
      if (root.nodeType === Node.TEXT_NODE) {
        root.nodeValue = translateValue(root.nodeValue, target);
      } else {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement;
            return parent && !parent.matches('script,style,noscript,textarea')
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        });
        let node;
        while ((node = walker.nextNode())) node.nodeValue = translateValue(node.nodeValue, target);

        const elements = [];
        if (root.matches?.('[aria-label],[title],[data-tip]')) elements.push(root);
        root.querySelectorAll?.('[aria-label],[title],[data-tip]').forEach((element) => elements.push(element));
        elements.forEach((element) => {
          ['aria-label', 'title', 'data-tip'].forEach((attribute) => {
            if (element.hasAttribute(attribute)) {
              element.setAttribute(attribute, translateValue(element.getAttribute(attribute), target));
            }
          });
        });
      }
    } finally {
      translating = false;
    }
  }

  function updateMetadata(target) {
    document.title = titles[target];
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = descriptions[target];
    document.documentElement.lang = target === 'en' ? 'en' : 'ko';
  }

  function updateControls(target) {
    document.querySelectorAll('[data-language]').forEach((button) => {
      const active = button.dataset.language === target;
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function applyLanguage(nextLanguage, persist = true) {
    language = nextLanguage === 'en' ? 'en' : 'ko';
    translateRoot(document.body, language);
    updateMetadata(language);
    updateControls(language);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, language); } catch {}
    }
    window.dispatchEvent(new CustomEvent('fashionops:languagechange', { detail: { language } }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-language]').forEach((button) => {
      button.addEventListener('click', () => applyLanguage(button.dataset.language));
    });

    applyLanguage(language, false);

    const workspace = document.getElementById('calculator-workspace');
    if (workspace) {
      const observer = new MutationObserver((records) => {
        if (translating) return;
        records.forEach((record) => {
          if (record.type === 'characterData') translateRoot(record.target, language);
          record.addedNodes.forEach((node) => translateRoot(node, language));
        });
      });
      observer.observe(workspace, { subtree: true, childList: true, characterData: true });
    }

    document.addEventListener('input', () => requestAnimationFrame(() => translateRoot(workspace, language)), true);
    document.addEventListener('submit', () => requestAnimationFrame(() => translateRoot(workspace, language)), true);
  });
})();
