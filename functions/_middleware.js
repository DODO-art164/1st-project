const ADSENSE_TAG = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1158392779506249" crossorigin="anonymous"></script>';

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  const html = await response.text();
  const alreadyInstalled = html.includes('ca-pub-1158392779506249');
  const output = alreadyInstalled || !html.includes('</head>')
    ? html
    : html.replace('</head>', `  ${ADSENSE_TAG}\n</head>`);

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(output, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
