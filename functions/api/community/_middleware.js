const RESERVED_NICKNAME = /(fashion\s*ops|fashionops|운영\s*팀|관리자|매니저|moderator|administrator|\badmin\b)/i;
const MAX_REQUEST_BYTES = 24000;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

export async function onRequest(context) {
  const request = context.request;
  if (!['POST', 'PATCH', 'DELETE'].includes(request.method)) return context.next();

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, code: 'request_too_large', message: '작성 내용이 허용된 크기를 초과했습니다.' }, 413);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return context.next();

  try {
    const body = await request.clone().json();
    if (typeof body.nickname === 'string' && RESERVED_NICKNAME.test(body.nickname.replace(/\s+/g, ' ').trim())) {
      return json({ ok: false, code: 'nickname_reserved', message: '운영자와 혼동될 수 있는 닉네임은 사용할 수 없습니다.' }, 400);
    }
  } catch {
    return context.next();
  }

  return context.next();
}
