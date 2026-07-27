const ADSENSE_SCRIPT = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1158392779506249" crossorigin="anonymous"></script>';
const ADSENSE_META = '<meta name="google-adsense-account" content="ca-pub-1158392779506249">';
const FONT_PRECONNECT = '<link rel="preconnect" href="https://fonts.googleapis.com">';
const FONT_STATIC_PRECONNECT = '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
const FONT_STYLESHEET = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap">';
const GLOBAL_UX = '<link rel="stylesheet" href="/global-ux.css?v=7">';
const UI_FIXES = '<link rel="stylesheet" href="/ui-fixes.css?v=3">';
const GLOBAL_UX_SCRIPT = '<script src="/global-ux.js?v=3" defer></script>';
const GLOBAL_CURRENCY = '<script src="/currency.js?v=4"></script>';
const BULK_IMPORT_SCRIPT = '<script src="/bulk-import.js?v=1" defer></script>';
const ENGAGEMENT_CSS = '<link rel="stylesheet" href="/engagement.css?v=1">';
const ENGAGEMENT_SCRIPT = '<script src="/engagement.js?v=2" defer></script>';
const THEME_COLOR_META = '<meta name="theme-color" content="#f4f0e7">';
const COLOR_SCHEME_META = '<meta name="color-scheme" content="light">';
const SITE_ORIGIN = 'https://1st-project-3aj.pages.dev';
const PRIMARY_NAV = [
  '<a href="/index.html#tools">계산기</a>',
  '<a href="/profit-audit.html">대량 분석</a>',
  '<a href="/weekly-profit-check.html">주간 점검</a>',
  '<a href="/community.html">커뮤니티</a>',
  '<a class="nav-cta" href="/resources.html">전체 도구</a>'
].join('');

const calculatorNavPaths = new Set([
  '/', '/index.html',
  '/startup-cost-calculator', '/startup-cost-calculator.html',
  '/clothing-cost-calculator', '/clothing-cost-calculator.html',
  '/discount-profit-calculator', '/discount-profit-calculator.html',
  '/roas-calculator', '/roas-calculator.html',
  '/marketplace-profit-calculator', '/marketplace-profit-calculator.html'
]);

const currencyPaths = new Set([
  ...calculatorNavPaths,
  '/profit-audit', '/profit-audit.html'
]);

const engagementPaths = new Set([
  ...currencyPaths,
  '/resources', '/resources.html',
  '/weekly-profit-check', '/weekly-profit-check.html'
]);

const utilityPaths = new Set(['/404.html', '/offline.html']);
const nonAdPaths = new Set([
  ...utilityPaths,
  '/privacy', '/privacy.html',
  '/terms', '/terms.html',
  '/contact', '/contact.html',
  '/about', '/about.html',
  '/seller-profit-audit', '/seller-profit-audit.html',
  '/community-write', '/community-write.html',
  '/community-admin', '/community-admin.html',
  '/community-rules', '/community-rules.html'
]);

function textContent(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeAttribute(value = '') {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function normalizePagePath(pathname = '/') {
  const clean = pathname.replace(/\/$/, '') || '/';
  if (clean === '/index.html') return '/';
  return clean.endsWith('.html') ? clean.slice(0, -5) || '/' : clean;
}

function normalizePrimaryNavigation(html) {
  return html.replace(/(<nav\b[^>]*class=["'][^"']*\bmain-nav\b[^"']*["'][^>]*>)[\s\S]*?(<\/nav>)/i, `$1${PRIMARY_NAV}$2`);
}

function navigationStatePath(pathname) {
  if (calculatorNavPaths.has(pathname)) return '/';
  if (normalizePagePath(pathname).startsWith('/community')) return '/community';
  return normalizePagePath(pathname);
}

function markCurrentNavigation(html, pathname) {
  const currentPath = navigationStatePath(pathname);
  return html.replace(/(<nav\b[^>]*class=["'][^"']*\bmain-nav\b[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/i, (_match, open, content, close) => {
    const updated = content.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi, (tag, href) => {
      if (/^(?:https?:)?\/\//i.test(href) || /^(?:mailto|tel|javascript):/i.test(href)) return tag;
      let candidatePath;
      try {
        candidatePath = normalizePagePath(new URL(href, SITE_ORIGIN).pathname);
      } catch {
        return tag;
      }
      if (candidatePath !== currentPath || /\baria-current=/i.test(tag)) return tag;
      return tag.replace(/^<a\b/i, '<a aria-current="page"');
    });
    return `${open}${updated}${close}`;
  });
}

function normalizeThemeMetadata(html) {
  const themePattern = /<meta\b(?=[^>]*\bname=["']theme-color["'])[^>]*>/i;
  return themePattern.test(html) ? html.replace(themePattern, THEME_COLOR_META) : html;
}

function metadataFor(html, pathname, isErrorResponse) {
  if (isErrorResponse || utilityPaths.has(pathname)) return [];
  const title = textContent(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || 'FashionOps');
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]
    || html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i)?.[1]
    || '패션 브랜드와 온라인 쇼핑몰을 위한 손익·가격·광고·재고 분석 도구';
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]
    || `${SITE_ORIGIN}${pathname === '/' ? '/' : pathname}`;
  const tags = [];

  if (!html.includes('name="theme-color"')) tags.push(THEME_COLOR_META);
  if (!html.includes('name="color-scheme"')) tags.push(COLOR_SCHEME_META);
  if (!html.includes('property="og:site_name"')) tags.push('<meta property="og:site_name" content="FashionOps">');
  if (!html.includes('property="og:type"')) tags.push('<meta property="og:type" content="website">');
  if (!html.includes('property="og:title"')) tags.push(`<meta property="og:title" content="${escapeAttribute(title)}">`);
  if (!html.includes('property="og:description"')) tags.push(`<meta property="og:description" content="${escapeAttribute(description)}">`);
  if (!html.includes('property="og:url"')) tags.push(`<meta property="og:url" content="${escapeAttribute(canonical)}">`);
  if (!html.includes('name="twitter:card"')) tags.push('<meta name="twitter:card" content="summary">');

  if (!html.includes('data-fashionops-schema')) {
    const pageName = title.split('|')[0].trim() || 'FashionOps';
    const isHome = pathname === '/' || pathname === '/index.html';
    const schema = isHome
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'WebSite', name: 'FashionOps', url: `${SITE_ORIGIN}/`, inLanguage: 'ko-KR' },
            { '@type': 'Organization', name: 'FashionOps', url: `${SITE_ORIGIN}/`, logo: `${SITE_ORIGIN}/favicon.svg` }
          ]
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'FashionOps 홈', item: `${SITE_ORIGIN}/` },
            { '@type': 'ListItem', position: 2, name: pageName, item: canonical }
          ]
        };
    tags.push(`<script type="application/ld+json" data-fashionops-schema>${JSON.stringify(schema)}</script>`);
  }

  return tags;
}

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const pathname = new URL(context.request.url).pathname.replace(/\/$/, '') || '/';
  const isErrorResponse = response.status >= 400;
  const needsCurrency = !isErrorResponse && currencyPaths.has(pathname);
  const needsBulkImport = !isErrorResponse && (pathname === '/profit-audit' || pathname === '/profit-audit.html');
  const needsEngagement = !isErrorResponse && engagementPaths.has(pathname);
  const needsGlobalUxScript = !isErrorResponse && engagementPaths.has(pathname);
  const isCommunityHome = pathname === '/community' || pathname === '/community.html';
  const communityReady = Boolean(context.env.DB);
  const shouldInjectAds = !isErrorResponse
    && !nonAdPaths.has(pathname)
    && (!isCommunityHome || communityReady);

  let html = await response.text();
  html = normalizeThemeMetadata(html);
  if (!isErrorResponse && !utilityPaths.has(pathname)) {
    html = normalizePrimaryNavigation(html);
    html = markCurrentNavigation(html, pathname);
  }
  if (html.includes('</head>')) {
    const tags = metadataFor(html, pathname, isErrorResponse);
    if (!html.includes('fonts.googleapis.com/css2?family=Noto+Sans+KR')) {
      tags.push(FONT_PRECONNECT, FONT_STATIC_PRECONNECT, FONT_STYLESHEET);
    }
    if (shouldInjectAds && !html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1158392779506249')) tags.push(ADSENSE_SCRIPT);
    if (shouldInjectAds && !html.includes('name="google-adsense-account"')) tags.push(ADSENSE_META);
    if (!html.includes('/global-ux.css')) tags.push(GLOBAL_UX);
    if (!html.includes('/ui-fixes.css')) tags.push(UI_FIXES);
    if (needsGlobalUxScript && !html.includes('/global-ux.js')) tags.push(GLOBAL_UX_SCRIPT);
    if (needsCurrency && !html.includes('/currency.js')) tags.push(GLOBAL_CURRENCY);
    if (needsBulkImport && !html.includes('/bulk-import.js')) tags.push(BULK_IMPORT_SCRIPT);
    if (needsEngagement && !html.includes('/engagement.css')) tags.push(ENGAGEMENT_CSS);
    if (needsEngagement && !html.includes('/engagement.js')) tags.push(ENGAGEMENT_SCRIPT);
    if (tags.length) html = html.replace('</head>', `  ${tags.join('\n  ')}\n</head>`);
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('etag');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
