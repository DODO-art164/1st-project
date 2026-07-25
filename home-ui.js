(() => {
  'use strict';
  document.body.classList.add('home-page');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f3efe5');

  const nav = document.querySelector('.site-header .main-nav');
  if (nav && !nav.parentElement?.classList.contains('nav-actions')) {
    const actions = document.createElement('div');
    actions.className = 'nav-actions';
    nav.before(actions);
    actions.appendChild(nav);
    const switcher = document.createElement('div');
    switcher.className = 'language-switch';
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', '언어 선택');
    switcher.innerHTML = '<button type="button" data-language="ko" aria-pressed="true">KR</button><button type="button" data-language="en" aria-pressed="false">EN</button>';
    actions.appendChild(switcher);
  }

  const hero = document.querySelector('.app-hero');
  const heroInner = hero?.querySelector('.app-hero-inner');
  if (hero && heroInner && !hero.querySelector('.home-hero-grid')) {
    hero.classList.add('ad-exclusion-zone');
    const grid = document.createElement('div');
    grid.className = 'container home-hero-grid';
    heroInner.classList.remove('container');
    heroInner.before(grid);
    grid.appendChild(heroInner);
    const bento = document.createElement('aside');
    bento.className = 'hero-bento';
    bento.setAttribute('aria-label', 'FashionOps 기능 구성');
    bento.innerHTML = `
      <article class="bento-card bento-dark bento-wide">
        <span class="bento-index">01</span>
        <div><small>한 상품 분석</small><h2>입력 → 계산 → 진단</h2><p>매출이 아니라 실제로 남는 금액을 같은 화면에서 확인합니다.</p></div>
        <span class="bento-arrow" aria-hidden="true">↘</span>
      </article>
      <article class="bento-card bento-gold">
        <span class="bento-index">02</span>
        <div><small>개인정보 보호</small><h2>브라우저 안에서 처리</h2><p>무료 계산 입력값은 서버로 전송하지 않습니다.</p></div>
      </article>
      <article class="bento-card bento-light">
        <span class="bento-index">03</span>
        <div><small>확장 분석</small><h2>CSV와 주간 점검</h2><p>상품이 많아지면 대량 분석과 운영 체크리스트로 이어집니다.</p></div>
      </article>`;
    grid.appendChild(bento);
  }
})();
