import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const htmlFiles = readdirSync(root).filter((name) => extname(name) === '.html');

function report(message) {
  errors.push(message);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function localPath(rawValue) {
  const value = rawValue.trim();
  if (!value || /^(?:https?:)?\/\//i.test(value) || /^(?:mailto|tel|data|javascript):/i.test(value) || value.startsWith('#')) return null;
  const clean = value.split('#')[0].split('?')[0];
  if (!clean) return null;
  const relative = clean.startsWith('/') ? clean.slice(1) : clean;
  return relative.endsWith('/') ? `${relative}index.html` : relative;
}

for (const file of htmlFiles) {
  const html = read(file);
  const titleCount = (html.match(/<title\b/gi) || []).length;
  if (titleCount !== 1) report(`${file}: <title> 태그가 ${titleCount}개입니다.`);
  if (!/<html\s+lang=["'][^"']+["']/i.test(html)) report(`${file}: html lang 속성이 없습니다.`);
  if (!/<meta\s+name=["']viewport["']/i.test(html)) report(`${file}: viewport 메타태그가 없습니다.`);

  if (!['404.html', 'offline.html'].includes(file)) {
    if (!/<link\s+rel=["']canonical["']/i.test(html)) report(`${file}: canonical 링크가 없습니다.`);
    if (!/<meta\s+name=["']description["']/i.test(html)) report(`${file}: description 메타태그가 없습니다.`);
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
}

const sitemapPath = join(root, 'sitemap.xml');
if (!existsSync(sitemapPath)) {
  report('sitemap.xml이 없습니다.');
} else {
  const sitemap = read('sitemap.xml');
  for (const match of sitemap.matchAll(/<loc>https:\/\/1st-project-3aj\.pages\.dev\/([^<]*)<\/loc>/g)) {
    const path = match[1] || 'index.html';
    if (!existsSync(join(root, path))) report(`sitemap.xml: 존재하지 않는 경로가 포함되어 있습니다: /${match[1]}`);
  }
  for (const requiredPath of ['/weekly-profit-check.html', '/online-store-profit-guide.html']) {
    if (!sitemap.includes(requiredPath)) report(`sitemap.xml에 ${requiredPath}가 없습니다.`);
  }
}

const adsPath = join(root, 'ads.txt');
const expectedAds = 'google.com, pub-1158392779506249, DIRECT, f08c47fec0942fa0';
if (!existsSync(adsPath)) report('ads.txt가 없습니다.');
else if (read('ads.txt').trim() !== expectedAds) report('ads.txt 내용이 현재 AdSense 게시자 ID와 일치하지 않습니다.');

for (const file of htmlFiles) {
  const html = read(file);
  if (html.includes('contact@fashionops.ai')) report(`${file}: 운영하지 않는 이메일 주소가 남아 있습니다.`);
  if (/Google AdSense 광고 영역/i.test(html)) warnings.push(`${file}: 비어 있는 광고 자리 안내문이 남아 있습니다.`);
}

const requiredCurrencyScripts = ['app.js', 'bulk-profit.js', 'special-tools.js'];
for (const file of requiredCurrencyScripts) {
  if (!existsSync(join(root, file))) {
    report(`${file}: 계산 스크립트가 없습니다.`);
    continue;
  }
  const source = read(file);
  if (!source.includes('FashionOpsCurrency')) report(`${file}: 선택 통화 포맷을 직접 사용하지 않습니다.`);
}

if (existsSync(join(root, 'currency.js'))) {
  const currencySource = read('currency.js');
  if (currencySource.includes('MutationObserver')) report('currency.js: 통화 변경 런타임에 MutationObserver를 사용하면 안 됩니다.');
  if (/characterData\s*:\s*true/i.test(currencySource)) report('currency.js: 모든 텍스트 변경을 감시하는 characterData observer가 다시 추가되었습니다.');
  if (/dispatchEvent\s*\(\s*new Event\s*\(\s*["']input/i.test(currencySource)) report('currency.js: 통화 변경 시 입력 이벤트를 대량 발생시키는 코드가 다시 추가되었습니다.');
  if (!currencySource.includes('formatterCache')) warnings.push('currency.js: Intl.NumberFormat 캐시가 없습니다.');
} else {
  report('currency.js가 없습니다.');
}

if (existsSync(join(root, 'bulk-profit.js'))) {
  const bulkSource = read('bulk-profit.js');
  if (/querySelectorAll\(['"]input['"]\).*addEventListener\(['"]input['"],\s*calculateAll/s.test(bulkSource)) report('bulk-profit.js: 상품 행마다 전체 재계산 이벤트를 등록하는 비효율적인 코드가 있습니다.');
  if (!bulkSource.includes('requestAnimationFrame')) warnings.push('bulk-profit.js: 입력 계산 프레임 조절 코드가 없습니다.');
  if (!bulkSource.includes('fashionops:currencychange')) report('bulk-profit.js: 통화 변경 후 결과 갱신 이벤트가 없습니다.');
}

for (const runtime of ['global-ux.js', 'bulk-import.js', 'engagement.js', 'engagement.css', 'service-worker.js', 'weekly-check.js']) {
  if (!existsSync(join(root, runtime))) report(`${runtime}가 없습니다.`);
}

if (existsSync(join(root, 'engagement.js'))) {
  const engagement = read('engagement.js');
  if (!engagement.includes('fashionops-saved-scenarios-v1')) report('engagement.js: 저장 계산 기능이 없습니다.');
  if (!engagement.includes('navigator.serviceWorker.register')) report('engagement.js: 서비스 워커 등록 코드가 없습니다.');
  if (!engagement.includes('beforeinstallprompt')) warnings.push('engagement.js: 설치 유도 이벤트가 없습니다.');
  if (!engagement.includes('navigator.share')) report('engagement.js: 공유 링크 기능이 없습니다.');
  if (!engagement.includes("bulk: { label: '상품별 대량 손익'")) report('engagement.js: 대량분석 재방문 동선이 없습니다.');
  if (!engagement.includes("weekly: { label: '주간 운영 점검'")) report('engagement.js: 주간점검 재방문 동선이 없습니다.');
}

if (existsSync(join(root, 'service-worker.js'))) {
  const worker = read('service-worker.js');
  if (!worker.includes("request.mode === 'navigate'")) report('service-worker.js: 문서 요청의 네트워크 우선 처리가 없습니다.');
  if (!worker.includes("caches.match('/offline.html')")) report('service-worker.js: 오프라인 복구 페이지가 연결되지 않았습니다.');
  if (!/fashionops-shell-v\d+/.test(worker)) report('service-worker.js: 버전이 지정된 캐시 이름이 없습니다.');
}

if (existsSync(join(root, 'manifest.webmanifest'))) {
  try {
    const manifest = JSON.parse(read('manifest.webmanifest'));
    if (!Array.isArray(manifest.shortcuts) || manifest.shortcuts.length < 3) report('manifest.webmanifest: 재방문용 바로가기가 부족합니다.');
  } catch (error) {
    report(`manifest.webmanifest: JSON 문법 오류가 있습니다: ${error.message}`);
  }
} else {
  report('manifest.webmanifest가 없습니다.');
}

if (existsSync(join(root, 'weekly-profit-check.html'))) {
  const weeklyHtml = read('weekly-profit-check.html');
  if (/<label[^>]*class=["'][^"']*check-item[^"']*["'][^>]*>[\s\S]*?<a\b/i.test(weeklyHtml)) {
    report('weekly-profit-check.html: 체크박스 label 안에 이동 링크가 중첩되어 있습니다.');
  }
  if (!/role=["']progressbar["']/i.test(weeklyHtml)) report('weekly-profit-check.html: 진행률 접근성 속성이 없습니다.');
}

const middlewarePath = join(root, 'functions/_middleware.js');
if (!existsSync(middlewarePath)) {
  report('Cloudflare 미들웨어가 없습니다.');
} else {
  const middleware = read('functions/_middleware.js');
  if (!middleware.includes('/currency.js')) report('미들웨어가 통화 런타임을 로드하지 않습니다.');
  if (!middleware.includes('/global-ux.js')) report('미들웨어가 접근성 툴팁 런타임을 로드하지 않습니다.');
  if (!middleware.includes('/bulk-import.js')) report('미들웨어가 국제 CSV 가져오기 런타임을 로드하지 않습니다.');
  if (!middleware.includes("pathname === '/profit-audit.html'")) report('bulk-import.js가 대량분석 페이지에만 제한되어 있지 않습니다.');
  if (!middleware.includes('/engagement.js')) report('미들웨어가 저장·공유·설치 런타임을 로드하지 않습니다.');
  if (!middleware.includes('BreadcrumbList')) report('미들웨어에 브레드크럼 구조화 데이터가 없습니다.');
  if (!middleware.includes('twitter:card')) report('미들웨어에 공유용 메타태그가 없습니다.');
  if (!middleware.includes('utilityPaths') || !middleware.includes('shouldInjectAds')) report('404·오프라인 페이지 광고 제외 처리가 없습니다.');
}

const koreanTemplatePath = join(root, 'profit-audit-template.csv');
if (!existsSync(koreanTemplatePath)) {
  report('한국어 CSV 양식이 없습니다.');
} else {
  const koreanTemplate = readFileSync(koreanTemplatePath, 'utf8');
  if (!koreanTemplate.startsWith('\ufeff')) report('한국어 CSV 양식에 Excel 호환 UTF-8 BOM이 없습니다.');
  if (!koreanTemplate.startsWith('\ufeff통화,상품명,판매가,원가')) report('한국어 CSV 양식의 통화·상품 헤더가 올바르지 않습니다.');
  if (!koreanTemplate.includes('\nKRW,')) report('한국어 CSV 양식에 KRW 통화 코드가 없습니다.');
}

const englishTemplatePath = join(root, 'profit-audit-template-en.csv');
if (!existsSync(englishTemplatePath)) {
  report('영문 CSV 양식이 없습니다.');
} else if (!read('profit-audit-template-en.csv').startsWith('Currency,Product name,Price,Cost')) {
  report('영문 CSV 양식 헤더가 올바르지 않습니다.');
}

if (warnings.length) {
  console.warn('\nWarnings:');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length) {
  console.error('\nStatic checks failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Static checks passed: ${htmlFiles.length} HTML files verified.`);
