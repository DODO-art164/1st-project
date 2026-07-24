const ADSENSE_SCRIPT = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1158392779506249" crossorigin="anonymous"></script>';
const ADSENSE_META = '<meta name="google-adsense-account" content="ca-pub-1158392779506249">';
const GLOBAL_UX = '<link rel="stylesheet" href="/global-ux.css">';

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  if (html.includes('</head>')) {
    const tags = [];
    if (!html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1158392779506249')) {
      tags.push(ADSENSE_SCRIPT);
    }
    if (!html.includes('name="google-adsense-account"')) {
      tags.push(ADSENSE_META);
    }
    if (!html.includes('/global-ux.css')) {
      tags.push(GLOBAL_UX);
    }
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
