import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const htmlFiles = readdirSync(root).filter((name) => extname(name) === '.html');

const report = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');

function localPath(rawValue) {
  const value = rawValue.trim();
  if (!value || /^(?:https?:)?\/\//i.test(value) || /^(?:mailto|tel|data|javascript):/i.test(value) || value.startsWith('#')) return null;
  const clean = value.split('#')[0].split('?')[0];
  if (!clean) return null;
  const relative = clean.startsWith('/') ? clean.slice(1) : clean;
  return relative.endsWith('/') ? `${relative}index.html` : relative;
}

function balancedBraces(source) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  let inComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (inComment) {
      if (char === '*' && next === '/') { inComment = false; index += 1; }
      continue;
    }
    if (!quote && char === '/' && next === '*') { inComment = true; index += 1; continue; }
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0 && !quote && !inComment;
}

let inlineStyleBlocks = 0;
let inlineStyleAttributes = 0;

for (const file of htmlFiles) {
  const html = read(file);
  const titleCount = (html.match(/<title\b/gi) || []).length;
  if (titleCount !== 1) report(`${file}: <title> 태그가 ${titleCount}개입니다.`);
  if (!/<html\s+lang=["'][^"']+["']/i.test(html)) report(`${file}: html lang 속성이 없습니다.`);
  if (!/<meta\s+name=["']viewport["']/i.test(html)) report(`${file}: viewport 메타태그가 없습니다.`);
  if ((html.match(/<main\b/gi) || []).length !== (html.match(/<\/main>/gi) || []).length) report(`${file}: main 태그가 올바르게 닫히지 않았습니다.`);

  if (!['404.html', 'offline.html'].includes(file)) {
    if (!/<link\s+rel=["']canonical["']/i.test(html)) report(`${file}: canonical 링크가 없습니다.`);
    if (!/<meta\s+name=["']description["']/i.test(html)) report(`${file}: description 메타태그가 없습니다.`);
    if (!/<header\b[^>]*class=["'][^"']*site-header/i.test(html)) warn(`${file}: 공통 site-header 구조가 없습니다.`);
    if (!/<footer\b[^>]*class=["'][^"']*site-footer/i.test(html)) warn(`${file}: 공통 site-footer 구조가 없습니다.`);
  }

  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicated = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicated.length) report(`${file}: 중복 ID가 있습니다: ${duplicated.join(', ')}`);

  for (const match of html.matchAll(/\s(?:href|src)=["']([^"']+)["']/gi)) {
    const target = localPath(match[1]);
    if (!target) continue;
    const normalized = normalize(target);
    if (normalized.startsWith('..')) {
      report(`${file}: 루트 밖을 가리키는 경로입니다: ${match[1]}`);
      continue;
    }
    if (!existsSync(join(root, normalized))) report(`${file}: 존재하지 않는 로컬 파일을 참조합니다: ${match[1]}`);
  }

  inlineStyleBlocks += (html.match(/<style\b/gi) || []).length;
  inlineStyleAttributes += (html.match(/\sstyle=["']/gi) || []).length;

  if (/cdn\.tailwindcss\.com/i.test(html)) report(`${file}: Tailwind CDN 사용이 금지되어 있습니다.`);
  if (/material-icons|material-symbols/i.test(html)) report(`${file}: Material Icons 사용이 금지되어 있습니다.`);
  if (html.includes('contact@fashionops.ai')) report(`${file}: 운영하지 않는 이메일 주소가 남아 있습니다.`);
  if (html.includes('online-store-net-profit-guide.html')) report(`${file}: 존재하지 않는 이전 가이드 주소가 남아 있습니다.`);
}

if (inlineStyleBlocks > 0) warn(`페이지 인라인 <style> 블록 ${inlineStyleBlocks}개가 남아 있습니다. 기능별 CSS로 점진적으로 이동하세요.`);
if (inlineStyleAttributes > 0) warn(`인라인 style 속성 ${inlineStyleAttributes}개가 남아 있습니다. 공통 클래스로 점진적으로 이동하세요.`);

const sitemapPath = join(root, 'sitemap.xml');
if (!existsSync(sitemapPath)) {
  report('sitemap.xml이 없습니다.');
} else {
  const sitemap = read('sitemap.xml');
  for (const match of sitemap.matchAll(/<loc>https:\/\/1st-project-3aj\.pages\.dev\/([^<]*)<\/loc>/g)) {
    const path = match[1] || 'index.html';
    if (!existsSync(join(root, path))) report(`sitemap.xml: 존재하지 않는 경로가 포함되어 있습니다: /${match[1]}`);
  }
  for (const requiredPath of ['/weekly-profit-check.html', '/calculation-methodology.html', '/online-store-profit-guide.html', '/shopping-mall-fee-profit-guide.html', '/break-even-roas-guide.html']) {
    if (!sitemap.includes(requiredPath)) report(`sitemap.xml에 ${requiredPath}가 없습니다.`);
  }
}

const expectedAds = 'google.com, pub-1158392779506249, DIRECT, f08c47fec0942fa0';
if (!existsSync(join(root, 'ads.txt'))) report('ads.txt가 없습니다.');
else if (read('ads.txt').trim() !== expectedAds) report('ads.txt 내용이 현재 AdSense 게시자 ID와 일치하지 않습니다.');

if (!existsSync(join(root, 'index.html'))) report('index.html이 없습니다.');
else {
  const indexHtml = read('index.html');
  if (indexHtml.includes('fonts.googleapis.com') || indexHtml.includes('fonts.gstatic.com')) report('index.html: 웹폰트는 미들웨어에서 한 번만 주입해야 합니다.');
  if (!indexHtml.includes('id="calculator-workspace"')) report('index.html: 계산 작업영역 식별자가 없습니다.');
  if (!indexHtml.includes('ad-exclusion-zone')) report('index.html: 자동광고 제외 영역 클래스가 없습니다.');
}

for (const experimental of ['stitch-home.css', 'home-ui.js', 'home-i18n.js', 'home-i18n-core.js']) {
  if (existsSync(join(root, experimental))) report(`${experimental}: 사용하지 않는 실험 파일이 다시 추가되었습니다.`);
}

if (!existsSync(join(root, 'global-ux.css'))) {
  report('global-ux.css가 없습니다.');
} else {
  const css = read('global-ux.css');
  if (!balancedBraces(css)) report('global-ux.css: CSS 중괄호 또는 문자열이 올바르게 닫히지 않았습니다.');
  for (const token of ['--bg:#f4f0e7', '--surface:#fffdf8', '--text:#171512', '--accent:#7a6230', '--content:1180px']) {
    if (!css.includes(token)) report(`global-ux.css: 디자인 토큰 ${token}이 없습니다.`);
  }
  if (!css.includes('overflow-x:auto')) report('global-ux.css: 모바일 내비게이션과 탭의 가로 스크롤 대응이 없습니다.');
  if (!css.includes('@media(max-width:760px)')) report('global-ux.css: 주요 모바일 브레이크포인트가 없습니다.');
  if (!css.includes('@media(prefers-reduced-motion:reduce)')) report('global-ux.css: 모션 감소 설정이 없습니다.');
  if (/font-weight:(?:650|750|800|850|880)/.test(css)) report('global-ux.css: 로드하지 않은 합성 글꼴 굵기가 있습니다.');
  if (/tailwind|material-icons|material-symbols/i.test(css)) report('global-ux.css: 금지된 UI 의존성이 포함되어 있습니다.');
}

if (!existsSync(join(root, 'ui-fixes.css'))) {
  report('ui-fixes.css가 없습니다.');
} else {
  const fixes = read('ui-fixes.css');
  if (!balancedBraces(fixes)) report('ui-fixes.css: CSS 문법 구조가 올바르지 않습니다.');
  if (!/\.calculate-button\s*\{[\s\S]*?justify-content:center/.test(fixes)) report('ui-fixes.css: 계산 버튼 텍스트 중앙 정렬 보정이 없습니다.');
  if (!/\.calculate-button b\s*\{[\s\S]*?position:absolute/.test(fixes)) report('ui-fixes.css: 계산 버튼 화살표 위치 보정이 없습니다.');
  if (!fixes.includes('max-width:min(920px,100%)!important')) report('ui-fixes.css: 인라인 제목 너비 회귀 보정이 없습니다.');
  if (!fixes.includes('.preview-metrics div')) report('ui-fixes.css: 홈 미리보기 지표의 밝은 카드 복구가 없습니다.');
  if (!fixes.includes('.guide-link-card:nth-child(2)')) report('ui-fixes.css: 가이드 카드 색상 통일 보정이 없습니다.');
  if (!fixes.includes('.community-field input:focus')) report('ui-fixes.css: 커뮤니티 입력 포커스 색상 통일이 없습니다.');
  if (!fixes.includes('content-visibility:visible')) report('ui-fixes.css: 지연 렌더링으로 인한 스크롤 점프 방지 보정이 없습니다.');
  if (!fixes.includes('overflow-x:clip')) report('ui-fixes.css: 작은 화면 가로 넘침 방지가 없습니다.');
  if (!fixes.includes('@media(forced-colors:active)')) warn('ui-fixes.css: Windows 고대비 모드 보정이 없습니다.');
}

const middlewarePath = join(root, 'functions/_middleware.js');
if (!existsSync(middlewarePath)) {
  report('Cloudflare 미들웨어가 없습니다.');
} else {
  const middleware = read('functions/_middleware.js');
  if (!middleware.includes('/global-ux.css?v=7')) report('미들웨어가 최신 전역 디자인 CSS를 로드하지 않습니다.');
  if (!middleware.includes('/ui-fixes.css?v=3')) report('미들웨어가 최신 UI 회귀 보정 CSS를 로드하지 않습니다.');
  if (!middleware.includes('normalizePrimaryNavigation')) report('미들웨어가 페이지별 기본 메뉴를 통일하지 않습니다.');
  if (!middleware.includes('markCurrentNavigation')) report('미들웨어가 현재 메뉴 접근성 상태를 표시하지 않습니다.');
  if (!middleware.includes('normalizeThemeMetadata')) report('미들웨어가 페이지 테마색을 통일하지 않습니다.');
  if (!middleware.includes('!isErrorResponse && !utilityPaths.has(pathname)')) report('미들웨어가 오류·오프라인 페이지의 단순 메뉴를 보존하지 않습니다.');
  if (!middleware.includes('x-content-type-options')) report('미들웨어에 nosniff 보안 헤더가 없습니다.');
  if (!middleware.includes('referrer-policy')) report('미들웨어에 Referrer-Policy가 없습니다.');
  if (!middleware.includes('/currency.js')) report('미들웨어가 통화 런타임을 로드하지 않습니다.');
  if (!middleware.includes('/global-ux.js')) report('미들웨어가 접근성 툴팁 런타임을 로드하지 않습니다.');
  if (!middleware.includes('/bulk-import.js')) report('미들웨어가 CSV 가져오기 런타임을 로드하지 않습니다.');
  if (!middleware.includes('/engagement.js')) report('미들웨어가 저장·공유·설치 런타임을 로드하지 않습니다.');
  if (!middleware.includes('BreadcrumbList')) report('미들웨어에 브레드크럼 구조화 데이터가 없습니다.');
  if (!middleware.includes('twitter:card')) report('미들웨어에 공유용 메타태그가 없습니다.');
  if (!middleware.includes('shouldInjectAds') || !middleware.includes('nonAdPaths')) report('광고 제외 경로 처리가 없습니다.');
  if (!middleware.includes('ca-pub-1158392779506249')) report('AdSense 게시자 ID가 미들웨어에 없습니다.');
}

if (!existsSync(join(root, 'service-worker.js'))) {
  report('service-worker.js가 없습니다.');
} else {
  const worker = read('service-worker.js');
  if (!worker.includes('fashionops-shell-v11')) report('service-worker.js: 최신 캐시 이름 v11이 아닙니다.');
  if (!worker.includes('/global-ux.css?v=7')) report('service-worker.js: 최신 전역 CSS를 캐시하지 않습니다.');
  if (!worker.includes('/ui-fixes.css?v=3')) report('service-worker.js: 최신 UI 보정 CSS를 캐시하지 않습니다.');
  if (!worker.includes("request.mode === 'navigate'")) report('service-worker.js: 문서 요청의 네트워크 우선 처리가 없습니다.');
  if (!worker.includes("caches.match('/offline.html')")) report('service-worker.js: 오프라인 복구 페이지가 없습니다.');
  if (!worker.includes('navigationPreload.enable')) warn('service-worker.js: 탐색 프리로드가 활성화되지 않았습니다.');
  if (!worker.includes('!url.search')) report('service-worker.js: 쿼리 URL 캐시 제외가 없습니다.');
}

if (!existsSync(join(root, 'manifest.webmanifest'))) {
  report('manifest.webmanifest가 없습니다.');
} else {
  try {
    const manifest = JSON.parse(read('manifest.webmanifest'));
    if (manifest.background_color !== '#f4f0e7' || manifest.theme_color !== '#f4f0e7') report('manifest.webmanifest: 설치 화면 색상이 현재 디자인 토큰과 다릅니다.');
    if (!Array.isArray(manifest.shortcuts) || manifest.shortcuts.length < 4) report('manifest.webmanifest: 주요 재방문 바로가기가 부족합니다.');
  } catch (error) {
    report(`manifest.webmanifest: JSON 문법 오류가 있습니다: ${error.message}`);
  }
}

if (!existsSync(join(root, 'favicon.svg'))) report('favicon.svg가 없습니다.');
else {
  const favicon = read('favicon.svg');
  if (!favicon.includes('#171512') || !favicon.includes('#fffdf8')) report('favicon.svg: 현재 블랙·오프화이트 브랜드 색상이 적용되지 않았습니다.');
}

if (!existsSync(join(root, '_headers'))) report('_headers가 없습니다.');
else if (!read('_headers').includes('/favicon.svg')) report('_headers: 파비콘 재검증 캐시 규칙이 없습니다.');

for (const file of ['app.js', 'bulk-profit.js', 'special-tools.js']) {
  if (!existsSync(join(root, file))) report(`${file}: 계산 스크립트가 없습니다.`);
  else if (!read(file).includes('FashionOpsCurrency')) report(`${file}: 선택 통화 포맷을 직접 사용하지 않습니다.`);
}

for (const runtime of ['global-ux.js', 'bulk-import.js', 'engagement.js', 'engagement.css', 'weekly-check.js', 'currency.js']) {
  if (!existsSync(join(root, runtime))) report(`${runtime}가 없습니다.`);
}

if (!existsSync(join(root, 'functions/api/community/[[path]].js'))) report('D1 커뮤니티 API 파일이 없습니다.');

if (existsSync(join(root, 'weekly-profit-check.html'))) {
  const weekly = read('weekly-profit-check.html');
  if (!/role=["']progressbar["']/i.test(weekly)) report('weekly-profit-check.html: 진행률 접근성 속성이 없습니다.');
  if (/<label[^>]*class=["'][^"']*check-item[^"']*["'][^>]*>[\s\S]*?<a\b/i.test(weekly)) report('weekly-profit-check.html: label 안에 링크가 중첩되어 있습니다.');
}

if (warnings.length) {
  console.warn(`\n경고 ${warnings.length}건`);
  warnings.forEach((message) => console.warn(`- ${message}`));
}

if (errors.length) {
  console.error(`\n오류 ${errors.length}건`);
  errors.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log(`FashionOps 정적·UI 검사 통과: HTML ${htmlFiles.length}개, 오류 0건, 경고 ${warnings.length}건`);
}
