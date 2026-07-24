import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const htmlFiles = readdirSync(root).filter((name) => extname(name) === '.html');

function report(message) {
  errors.push(message);
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
  const html = readFileSync(join(root, file), 'utf8');
  const titleCount = (html.match(/<title\b/gi) || []).length;
  if (titleCount !== 1) report(`${file}: <title> 태그가 ${titleCount}개입니다.`);
  if (!/<meta\s+name=["']viewport["']/i.test(html)) report(`${file}: viewport 메타태그가 없습니다.`);

  if (file !== '404.html') {
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
  const sitemap = readFileSync(sitemapPath, 'utf8');
  for (const match of sitemap.matchAll(/<loc>https:\/\/1st-project-3aj\.pages\.dev\/([^<]*)<\/loc>/g)) {
    const path = match[1] || 'index.html';
    if (!existsSync(join(root, path))) report(`sitemap.xml: 존재하지 않는 경로가 포함되어 있습니다: /${match[1]}`);
  }
}

const adsPath = join(root, 'ads.txt');
const expectedAds = 'google.com, pub-1158392779506249, DIRECT, f08c47fec0942fa0';
if (!existsSync(adsPath)) report('ads.txt가 없습니다.');
else if (readFileSync(adsPath, 'utf8').trim() !== expectedAds) report('ads.txt 내용이 현재 AdSense 게시자 ID와 일치하지 않습니다.');

for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), 'utf8');
  if (html.includes('contact@fashionops.ai')) report(`${file}: 운영하지 않는 이메일 주소가 남아 있습니다.`);
  if (/Google AdSense 광고 영역/i.test(html)) warnings.push(`${file}: 비어 있는 광고 자리 안내문이 남아 있습니다.`);
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
