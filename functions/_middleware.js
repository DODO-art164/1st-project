const ADSENSE_SCRIPT = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1158392779506249" crossorigin="anonymous"></script>';
const ADSENSE_META = '<meta name="google-adsense-account" content="ca-pub-1158392779506249">';
const GLOBAL_UX = '<link rel="stylesheet" href="/global-ux.css?v=3">';
const GLOBAL_UX_SCRIPT = '<script src="/global-ux.js?v=2" defer></script>';
const GLOBAL_CURRENCY = '<script src="/currency.js?v=4"></script>';
const BULK_IMPORT_SCRIPT = '<script src="/bulk-import.js?v=1" defer></script>';

const currencyPaths = new Set([
  '/',
  '/index.html',
  '/profit-audit',
  '/profit-audit.html',
  '/startup-cost-calculator',
  '/startup-cost-calculator.html',
  '/clothing-cost-calculator',
  '/clothing-cost-calculator.html',
  '/discount-profit-calculator',
  '/discount-profit-calculator.html',
  '/roas-calculator',
  '/roas-calculator.html',
  '/marketplace-profit-calculator',
  '/marketplace-profit-calculator.html'
]);

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const pathname = new URL(context.request.url).pathname.replace(/\/$/, '') || '/';
  const needsCurrency = currencyPaths.has(pathname);
  const needsBulkImport = pathname === '/profit-audit' || pathname === '/profit-audit.html';

  let html = await response.text();
  if (html.includes('</head>')) {
    const tags = [];
    if (!html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1158392779506249')) {
      tags.push(ADSENSE_SCRIPT);
    }
    if (!html.includes('name="google-adsense-account"')) {
      tags.push(ADSENSE_META);
    }
    if (!html.includes('/global-ux.css')) tags.push(GLOBAL_UX);
    if (!html.includes('/global-ux.js')) tags.push(GLOBAL_UX_SCRIPT);
    if (needsCurrency && !html.includes('/currency.js')) tags.push(GLOBAL_CURRENCY);
    if (needsBulkImport && !html.includes('/bulk-import.js')) tags.push(BULK_IMPORT_SCRIPT);
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