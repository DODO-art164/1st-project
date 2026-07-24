const ADSENSE_SCRIPT = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1158392779506249" crossorigin="anonymous"></script>';
const ADSENSE_META = '<meta name="google-adsense-account" content="ca-pub-1158392779506249">';
const FONT_PRECONNECT = '<link rel="preconnect" href="https://fonts.googleapis.com">';
const FONT_STATIC_PRECONNECT = '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
const FONT_STYLESHEET = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap">';
const GLOBAL_UX = '<link rel="stylesheet" href="/global-ux.css?v=6">';
const GLOBAL_UX_SCRIPT = '<script src="/global-ux.js?v=3" defer></script>';
const GLOBAL_CURRENCY = '<script src="/currency.js?v=4"></script>';
const BULK_IMPORT_SCRIPT = '<script src="/bulk-import.js?v=1" defer></script>';
const ENGAGEMENT_CSS = '<link rel="stylesheet" href="/engagement.css?v=1">';
const ENGAGEMENT_SCRIPT = '<script src="/engagement.js?v=2" defer></script>';
const SITE_ORIGIN = 'https://1st-project-3aj.pages.dev';

const currencyPaths = new Set([
  '/', '/index.html', '/profit-audit', '/profit-audit.html',
  '/startup-cost-calculator', '/startup-cost-calculator.html',
  '/clothing-cost-calculator', '/clothing-cost-calculator.html',
  '/discount-profit-calculator', '/discount-profit-calculator.html',
  '/roas-calculator', '/roas-calculator.html',
  '/marketplace-profit-calculator', '/marketplace-profit-calculator.html'
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

function injectCommunityNav(html) {
  if (/href=["']\/?community(?:\.html)?["']/i.test(html)) return html;
  return html.replace(/(<nav\b[^>]*class=["'][^"']*\bmain-nav\b[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/i, (_match, open, content, close) => {
    const link = '<a href="/community.html">커뮤니티</a>';
    const cta = content.match(/<a\b[^>]*class=["'][^"']*\bnav-cta\b[^"']*["'][^>]*>/i);
    const updated = cta ? content.replace(cta[0], `${link}${cta[0]}`) : `${content}${link}`;
    return `${open}${updated}${close}`;
  });
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
  html = injectCommunityNav(html);
  if (html.includes('</head>')) {
    const tags = metadataFor(html, pathname, isErrorResponse);
    if (!html.includes('fonts.googleapis.com/css2?family=Noto+Sans+KR')) {
      tags.push(FONT_PRECONNECT, FONT_STATIC_PRECONNECT, FONT_STYLESHEET);
    }
    if (shouldInjectAds && !html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1158392779506249')) tags.push(ADSENSE_SCRIPT);
    if (shouldInjectAds && !html.includes('name="google-adsense-account"')) tags.push(ADSENSE_META);
    if (!html.includes('/global-ux.css')) tags.push(GLOBAL_UX);
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

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
