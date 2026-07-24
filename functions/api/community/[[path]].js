const CATEGORIES = {
  free: '자유게시판',
  question: '질문·답변',
  operations: '매출·운영',
  marketing: '마케팅·광고',
  platform: '판매 플랫폼',
  information: '정보·자료',
  promotion: '홍보·협업'
};

const REPORT_REASONS = new Set(['spam', 'promotion', 'abuse', 'illegal', 'privacy', 'other']);
const encoder = new TextEncoder();

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function cleanText(value, maxLength, preserveLines = false) {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim();
  const cleaned = preserveLines
    ? normalized.replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n')
    : normalized.replace(/\s+/g, ' ');
  return cleaned.slice(0, maxLength);
}

function integer(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: encoder.encode(salt),
    iterations: 120000
  }, key, 256);
  return bytesToBase64Url(new Uint8Array(bits));
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function verifyPassword(row, password) {
  if (!row?.password_salt || !row?.password_hash) return false;
  const candidate = await passwordHash(password, row.password_salt);
  return safeEqual(candidate, row.password_hash);
}

function requestOriginMatches(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function parseBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new HttpError(415, 'json_required', 'JSON 형식으로 요청해 주세요.');
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'invalid_json', '요청 내용을 읽을 수 없습니다.');
  }
}

async function fingerprint(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const agent = request.headers.get('user-agent') || 'unknown';
  const salt = env.COMMUNITY_HASH_SALT || 'fashionops-community-v1';
  return sha256(`${salt}|${ip}|${agent}`);
}

async function enforceRateLimit(db, fp, action, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  await db.prepare(`
    INSERT INTO rate_limits (fingerprint, action, window_start, count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT (fingerprint, action, window_start)
    DO UPDATE SET count = count + 1
  `).bind(fp, action, windowStart).run();
  const row = await db.prepare('SELECT count FROM rate_limits WHERE fingerprint = ? AND action = ? AND window_start = ?')
    .bind(fp, action, windowStart).first();
  if ((row?.count || 0) > limit) throw new HttpError(429, 'rate_limited', '잠시 후 다시 시도해 주세요.');
  if (Math.random() < 0.02) {
    db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(now - 86400).run().catch(() => {});
  }
}

async function verifyTurnstile(env, request, token) {
  if (!env.TURNSTILE_SECRET) return;
  if (!token) throw new HttpError(400, 'turnstile_required', '자동 등록 방지 확인이 필요합니다.');
  const form = new FormData();
  form.set('secret', env.TURNSTILE_SECRET);
  form.set('response', token);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) form.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const result = await response.json();
  if (!result.success) throw new HttpError(400, 'turnstile_failed', '자동 등록 방지 확인에 실패했습니다. 새로고침 후 다시 시도해 주세요.');
}

function riskScore(title, body) {
  const text = `${title}\n${body}`;
  const urlCount = (text.match(/https?:\/\//gi) || []).length;
  const blocked = /(바카라|토토|카지노|불법\s*대출|성인\s*사이트|도박\s*홍보)/i.test(text);
  const repetitive = /(.)\1{11,}/u.test(text);
  let score = 0;
  if (urlCount > 2) score += 2;
  if (blocked) score += 5;
  if (repetitive) score += 2;
  if (body.length < 20) score += 1;
  return score;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

async function adminAuthorized(request, env) {
  const expected = env.COMMUNITY_ADMIN_TOKEN;
  if (!expected) return false;
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const supplied = bearer || request.headers.get('x-admin-token') || '';
  return safeEqual(supplied, expected);
}

async function getPost(db, id, includePrivate = false) {
  const statusClause = includePrivate ? "status != 'deleted'" : "status = 'published'";
  return db.prepare(`SELECT * FROM posts WHERE id = ? AND ${statusClause}`).bind(id).first();
}

async function listPosts(db, url) {
  const page = Math.max(1, integer(url.searchParams.get('page'), 1));
  const limit = Math.min(40, Math.max(10, integer(url.searchParams.get('limit'), 20)));
  const offset = (page - 1) * limit;
  const category = url.searchParams.get('category') || 'all';
  const query = cleanText(url.searchParams.get('q') || '', 80);
  const sort = url.searchParams.get('sort') || 'latest';
  const conditions = ["status = 'published'"];
  const values = [];

  if (category !== 'all' && Object.hasOwn(CATEGORIES, category)) {
    conditions.push('category = ?');
    values.push(category);
  }
  if (query) {
    const term = `%${escapeLike(query)}%`;
    conditions.push("(title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\')");
    values.push(term, term);
  }

  const orderBy = {
    latest: 'created_at DESC',
    popular: '(like_count * 8 + comment_count * 5 + view_count * 0.08) DESC, created_at DESC',
    comments: 'comment_count DESC, created_at DESC',
    views: 'view_count DESC, created_at DESC'
  }[sort] || 'created_at DESC';
  const where = conditions.join(' AND ');
  const totalRow = await db.prepare(`SELECT COUNT(*) AS total FROM posts WHERE ${where}`).bind(...values).first();
  const { results = [] } = await db.prepare(`
    SELECT id, category, title, substr(body, 1, 240) AS excerpt, nickname, is_official, pinned,
           view_count, like_count, comment_count, created_at, updated_at
    FROM posts
    WHERE ${where}
    ORDER BY pinned DESC, ${orderBy}
    LIMIT ? OFFSET ?
  `).bind(...values, limit, offset).all();

  return {
    posts: results,
    page,
    limit,
    total: totalRow?.total || 0,
    totalPages: Math.max(1, Math.ceil((totalRow?.total || 0) / limit))
  };
}

async function communityStats(db) {
  const [posts, comments, today, unanswered] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS count FROM posts WHERE status = 'published'").first(),
    db.prepare("SELECT COUNT(*) AS count FROM comments WHERE status = 'published'").first(),
    db.prepare("SELECT COUNT(*) AS count FROM posts WHERE status = 'published' AND created_at >= datetime('now','-1 day')").first(),
    db.prepare("SELECT COUNT(*) AS count FROM posts WHERE status = 'published' AND category = 'question' AND comment_count = 0").first()
  ]);
  return {
    posts: posts?.count || 0,
    comments: comments?.count || 0,
    today: today?.count || 0,
    unanswered: unanswered?.count || 0
  };
}

async function createPost(context, db) {
  if (!requestOriginMatches(context.request)) throw new HttpError(403, 'origin_rejected', '허용되지 않은 요청입니다.');
  const body = await parseBody(context.request);
  const fp = await fingerprint(context.request, context.env);
  await enforceRateLimit(db, fp, 'create_post', 3, 600);
  await verifyTurnstile(context.env, context.request, body.turnstileToken);

  const category = Object.hasOwn(CATEGORIES, body.category) ? body.category : '';
  const title = cleanText(body.title, 100);
  const content = cleanText(body.body, 5000, true);
  const nickname = cleanText(body.nickname, 20);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!category) throw new HttpError(400, 'category_required', '게시판을 선택해 주세요.');
  if (title.length < 4) throw new HttpError(400, 'title_short', '제목을 4자 이상 입력해 주세요.');
  if (content.length < 20) throw new HttpError(400, 'body_short', '본문을 20자 이상 입력해 주세요.');
  if (nickname.length < 2) throw new HttpError(400, 'nickname_short', '닉네임을 2자 이상 입력해 주세요.');
  if (password.length < 4 || password.length > 64) throw new HttpError(400, 'password_invalid', '수정·삭제 비밀번호를 4~64자로 입력해 주세요.');

  const salt = randomSalt();
  const hash = await passwordHash(password, salt);
  const requiresApproval = context.env.COMMUNITY_REQUIRE_APPROVAL === 'true';
  const status = requiresApproval || riskScore(title, content) >= 2 ? 'pending' : 'published';
  const result = await db.prepare(`
    INSERT INTO posts (category, title, body, nickname, password_salt, password_hash, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(category, title, content, nickname, salt, hash, status).run();
  return json({ ok: true, id: result.meta?.last_row_id, status }, 201);
}

async function updatePost(context, db, id) {
  if (!requestOriginMatches(context.request)) throw new HttpError(403, 'origin_rejected', '허용되지 않은 요청입니다.');
  const body = await parseBody(context.request);
  const fp = await fingerprint(context.request, context.env);
  await enforceRateLimit(db, fp, 'edit_post', 8, 600);
  const current = await getPost(db, id, true);
  if (!current) throw new HttpError(404, 'post_not_found', '게시물을 찾을 수 없습니다.');
  if (!(await verifyPassword(current, body.password || ''))) throw new HttpError(403, 'password_mismatch', '비밀번호가 일치하지 않습니다.');

  const category = Object.hasOwn(CATEGORIES, body.category) ? body.category : current.category;
  const title = cleanText(body.title, 100);
  const content = cleanText(body.body, 5000, true);
  if (title.length < 4 || content.length < 20) throw new HttpError(400, 'content_invalid', '제목은 4자, 본문은 20자 이상이어야 합니다.');
  const status = current.status === 'published' && riskScore(title, content) >= 2 ? 'pending' : current.status;
  await db.prepare(`UPDATE posts SET category = ?, title = ?, body = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(category, title, content, status, id).run();
  return json({ ok: true, id, status });
}

async function deletePost(context, db, id) {
  if (!requestOriginMatches(context.request)) throw new HttpError(403, 'origin_rejected', '허용되지 않은 요청입니다.');
  const body = await parseBody(context.request);
  const current = await getPost(db, id, true);
  if (!current) throw new HttpError(404, 'post_not_found', '게시물을 찾을 수 없습니다.');
  if (current.is_official) throw new HttpError(403, 'official_protected', '운영팀 게시물은 관리자 화면에서만 처리할 수 있습니다.');
  if (!(await verifyPassword(current, body.password || ''))) throw new HttpError(403, 'password_mismatch', '비밀번호가 일치하지 않습니다.');
  await db.prepare(`
    UPDATE posts SET status = 'deleted', title = '삭제된 게시물', body = '작성자가 삭제한 게시물입니다.',
      nickname = '삭제됨', password_salt = NULL, password_hash = NULL, updated_at = datetime('now') WHERE id = ?
  `).bind(id).run();
  return json({ ok: true });
}

async function togglePostLike(context, db, id) {
  if (!requestOriginMatches(context.request)) throw new HttpError(403, 'origin_rejected', '허용되지 않은 요청입니다.');
  const post = await getPost(db, id);
  if (!post) throw new HttpError(404, 'post_not_found', '게시물을 찾을 수 없습니다.');
  const fp = await fingerprint(context.request, context.env);
  await enforceRateLimit(db, fp, 'like', 60, 600);
  const existing = await db.prepare("SELECT id FROM reactions WHERE target_type = 'post' AND target_id = ? AND fingerprint = ?")
    .bind(id, fp).first();
  let liked;
  if (existing) {
    await db.batch([
      db.prepare('DELETE FROM reactions WHERE id = ?').bind(existing.id),
      db.prepare('UPDATE posts SET like_count = MAX(like_count - 1, 0) WHERE id = ?').bind(id)
    ]);
    liked = false;
  } else {
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO reactions (target_type, target_id, fingerprint) VALUES ('post', ?, ?)").bind(id, fp),
      db.prepare('UPDATE posts SET like_count = like_count + 1 WHERE id = ?').bind(id)
    ]);
    liked = true;
  }
  const row = await db.prepare('SELECT like_count FROM posts WHERE id = ?').bind(id).first();
  return json({ ok: true, liked, likeCount: row?.like_count || 0 });
}

async function reportTarget(context, db, targetType, targetId) {
  if (!requestOriginMatches(context.request)) throw new HttpError(403, 'origin_rejected', '허용되지 않은 요청입니다.');
  const body = await parseBody(context.request);
  const reason = REPORT_REASONS.has(body.reason) ? body.reason : 'other';
  const details = cleanText(body.details || '', 300, true);
  const fp = await fingerprint(context.request, context.env);
  await enforceRateLimit(db, fp, 'report', 10, 3600);
  const result = await db.prepare(`
    INSERT OR IGNORE INTO reports (target_type, target_id, reason, details, fingerprint)
    VALUES (?, ?, ?, ?, ?)
  `).bind(targetType, targetId, reason, details, fp).run();
  const countRow = await db.prepare("SELECT COUNT(*) AS count FROM reports WHERE target_type = ? AND target_id = ? AND status = 'open'")
    .bind(targetType, targetId).first();
  const count = countRow?.count || 0;
  const table = targetType === 'post' ? 'posts' : 'comments';
  await db.prepare(`UPDATE ${table} SET report_count = ? WHERE id = ?`).bind(count, targetId).run();
  if (count >= 5) await db.prepare(`UPDATE ${table} SET status = 'hidden' WHERE id = ? AND status = 'published'`).bind(targetId).run();
  return json({ ok: true, accepted: (result.meta?.changes || 0) > 0, reportCount: count });
}

async function listComments(db, postId) {
  const { results = [] } = await db.prepare(`
    SELECT id, post_id, parent_id, body, nickname, is_official, like_count, created_at, updated_at
    FROM comments WHERE post_id = ? AND status = 'published' ORDER BY created_at ASC
  `).bind(postId).all();
  return results;
}

async function createComment(context, db, postId) {
  if (!requestOriginMatches(context.request)) throw new HttpError(403, 'origin_rejected', '허용되지 않은 요청입니다.');
  const post = await getPost(db, postId);
  if (!post) throw new HttpError(404, 'post_not_found', '게시물을 찾을 수 없습니다.');
  const body = await parseBody(context.request);
  const fp = await fingerprint(context.request, context.env);
  await enforceRateLimit(db, fp, 'create_comment', 12, 600);
  await verifyTurnstile(context.env, context.request, body.turnstileToken);

  const content = cleanText(body.body, 2000, true);
  const nickname = cleanText(body.nickname, 20);
  const password = typeof body.password === 'string' ? body.password : '';
  const parentId = body.parentId ? integer(body.parentId) : null;
  if (content.length < 2) throw new HttpError(400, 'comment_short', '댓글을 2자 이상 입력해 주세요.');
  if (nickname.length < 2) throw new HttpError(400, 'nickname_short', '닉네임을 2자 이상 입력해 주세요.');
  if (password.length < 4 || password.length > 64) throw new HttpError(400, 'password_invalid', '삭제 비밀번호를 4~64자로 입력해 주세요.');
  if (parentId) {
    const parent = await db.prepare("SELECT id FROM comments WHERE id = ? AND post_id = ? AND status = 'published'").bind(parentId, postId).first();
    if (!parent) throw new HttpError(400, 'parent_invalid', '답글을 달 댓글을 찾을 수 없습니다.');
  }

  const salt = randomSalt();
  const hash = await passwordHash(password, salt);
  const requiresApproval = context.env.COMMUNITY_REQUIRE_APPROVAL === 'true';
  const status = requiresApproval || riskScore('', content) >= 2 ? 'pending' : 'published';
  const result = await db.prepare(`
    INSERT INTO comments (post_id, parent_id, body, nickname, password_salt, password_hash, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(postId, parentId, content, nickname, salt, hash, status).run();
  if (status === 'published') await db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?').bind(postId).run();
  return json({ ok: true, id: result.meta?.last_row_id, status }, 201);
}

async function deleteComment(context, db, id) {
  if (!requestOriginMatches(context.request)) throw new HttpError(403, 'origin_rejected', '허용되지 않은 요청입니다.');
  const body = await parseBody(context.request);
  const current = await db.prepare("SELECT * FROM comments WHERE id = ? AND status != 'deleted'").bind(id).first();
  if (!current) throw new HttpError(404, 'comment_not_found', '댓글을 찾을 수 없습니다.');
  if (current.is_official) throw new HttpError(403, 'official_protected', '운영팀 댓글은 관리자 화면에서만 처리할 수 있습니다.');
  if (!(await verifyPassword(current, body.password || ''))) throw new HttpError(403, 'password_mismatch', '비밀번호가 일치하지 않습니다.');
  await db.prepare(`UPDATE comments SET status = 'deleted', body = '작성자가 삭제한 댓글입니다.', nickname = '삭제됨', password_salt = NULL, password_hash = NULL, updated_at = datetime('now') WHERE id = ?`).bind(id).run();
  if (current.status === 'published') await db.prepare('UPDATE posts SET comment_count = MAX(comment_count - 1, 0) WHERE id = ?').bind(current.post_id).run();
  return json({ ok: true });
}

async function adminQueue(request, env, db) {
  if (!(await adminAuthorized(request, env))) throw new HttpError(401, 'admin_required', '관리자 인증이 필요합니다.');
  const { results: posts = [] } = await db.prepare(`
    SELECT id, category, title, nickname, status, report_count, pinned, created_at
    FROM posts WHERE status IN ('pending','hidden') OR report_count > 0
    ORDER BY report_count DESC, created_at DESC LIMIT 100
  `).all();
  const { results: comments = [] } = await db.prepare(`
    SELECT id, post_id, substr(body,1,180) AS body, nickname, status, report_count, created_at
    FROM comments WHERE status IN ('pending','hidden') OR report_count > 0
    ORDER BY report_count DESC, created_at DESC LIMIT 100
  `).all();
  const { results: reports = [] } = await db.prepare(`
    SELECT id, target_type, target_id, reason, details, status, created_at
    FROM reports WHERE status = 'open' ORDER BY created_at DESC LIMIT 100
  `).all();
  return json({ posts, comments, reports });
}

async function moderatePost(context, db, id) {
  if (!(await adminAuthorized(context.request, context.env))) throw new HttpError(401, 'admin_required', '관리자 인증이 필요합니다.');
  const body = await parseBody(context.request);
  const status = ['published', 'pending', 'hidden', 'deleted'].includes(body.status) ? body.status : null;
  const pinned = body.pinned === undefined ? null : (body.pinned ? 1 : 0);
  const current = await db.prepare('SELECT id, status, pinned FROM posts WHERE id = ?').bind(id).first();
  if (!current) throw new HttpError(404, 'post_not_found', '게시물을 찾을 수 없습니다.');
  await db.prepare(`UPDATE posts SET status = COALESCE(?, status), pinned = COALESCE(?, pinned), updated_at = datetime('now') WHERE id = ?`)
    .bind(status, pinned, id).run();
  await db.prepare("INSERT INTO moderation_logs (target_type, target_id, action, note) VALUES ('post', ?, ?, ?)")
    .bind(id, status || `pinned:${pinned}`, cleanText(body.note || '', 300)).run();
  return json({ ok: true });
}

async function moderateComment(context, db, id) {
  if (!(await adminAuthorized(context.request, context.env))) throw new HttpError(401, 'admin_required', '관리자 인증이 필요합니다.');
  const body = await parseBody(context.request);
  const status = ['published', 'pending', 'hidden', 'deleted'].includes(body.status) ? body.status : null;
  if (!status) throw new HttpError(400, 'status_required', '처리 상태를 선택해 주세요.');
  const current = await db.prepare('SELECT id, post_id, status FROM comments WHERE id = ?').bind(id).first();
  if (!current) throw new HttpError(404, 'comment_not_found', '댓글을 찾을 수 없습니다.');
  await db.prepare(`UPDATE comments SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, id).run();
  if (current.status !== 'published' && status === 'published') await db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?').bind(current.post_id).run();
  if (current.status === 'published' && status !== 'published') await db.prepare('UPDATE posts SET comment_count = MAX(comment_count - 1, 0) WHERE id = ?').bind(current.post_id).run();
  await db.prepare("INSERT INTO moderation_logs (target_type, target_id, action, note) VALUES ('comment', ?, ?, ?)")
    .bind(id, status, cleanText(body.note || '', 300)).run();
  return json({ ok: true });
}

export async function onRequest(context) {
  const request = context.request;
  const method = request.method.toUpperCase();
  const rawPath = context.params.path;
  const parts = Array.isArray(rawPath) ? rawPath.filter(Boolean) : rawPath ? [rawPath] : [];
  const url = new URL(request.url);

  try {
    if (method === 'OPTIONS') return new Response(null, { status: 204 });
    if (method === 'GET' && parts[0] === 'config') {
      return json({
        configured: Boolean(context.env.DB),
        turnstileSiteKey: context.env.TURNSTILE_SITE_KEY || '',
        approvalRequired: context.env.COMMUNITY_REQUIRE_APPROVAL === 'true',
        categories: CATEGORIES
      });
    }

    const db = context.env.DB;
    if (!db) throw new HttpError(503, 'setup_required', '커뮤니티 데이터베이스 연결이 필요합니다.');

    if (method === 'GET' && parts.length === 0) return json({ ok: true, service: 'FashionOps Community API' });
    if (method === 'GET' && parts[0] === 'stats') return json(await communityStats(db));
    if (method === 'GET' && parts[0] === 'posts' && parts.length === 1) return json(await listPosts(db, url));
    if (method === 'POST' && parts[0] === 'posts' && parts.length === 1) return createPost(context, db);

    if (parts[0] === 'posts' && parts[1]) {
      const postId = integer(parts[1]);
      if (!postId) throw new HttpError(400, 'invalid_id', '게시물 번호가 올바르지 않습니다.');
      if (method === 'GET' && parts.length === 2) {
        if (url.searchParams.get('view') === '1') await db.prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ? AND status = 'published'").bind(postId).run();
        const post = await getPost(db, postId);
        if (!post) throw new HttpError(404, 'post_not_found', '게시물을 찾을 수 없습니다.');
        const { results: related = [] } = await db.prepare(`
          SELECT id, category, title, nickname, comment_count, created_at FROM posts
          WHERE status = 'published' AND category = ? AND id != ? ORDER BY created_at DESC LIMIT 5
        `).bind(post.category, postId).all();
        return json({ post, related });
      }
      if (method === 'PATCH' && parts.length === 2) return updatePost(context, db, postId);
      if (method === 'DELETE' && parts.length === 2) return deletePost(context, db, postId);
      if (method === 'POST' && parts[2] === 'like') return togglePostLike(context, db, postId);
      if (method === 'POST' && parts[2] === 'report') return reportTarget(context, db, 'post', postId);
      if (method === 'GET' && parts[2] === 'comments') return json({ comments: await listComments(db, postId) });
      if (method === 'POST' && parts[2] === 'comments') return createComment(context, db, postId);
    }

    if (parts[0] === 'comments' && parts[1]) {
      const commentId = integer(parts[1]);
      if (!commentId) throw new HttpError(400, 'invalid_id', '댓글 번호가 올바르지 않습니다.');
      if (method === 'DELETE' && parts.length === 2) return deleteComment(context, db, commentId);
      if (method === 'POST' && parts[2] === 'report') return reportTarget(context, db, 'comment', commentId);
    }

    if (parts[0] === 'admin') {
      if (method === 'GET' && parts[1] === 'queue') return adminQueue(request, context.env, db);
      if (method === 'PATCH' && parts[1] === 'posts' && parts[2]) return moderatePost(context, db, integer(parts[2]));
      if (method === 'PATCH' && parts[1] === 'comments' && parts[2]) return moderateComment(context, db, integer(parts[2]));
    }

    throw new HttpError(404, 'route_not_found', '요청한 API를 찾을 수 없습니다.');
  } catch (error) {
    if (error instanceof HttpError) return json({ ok: false, code: error.code, message: error.message }, error.status);
    console.error('Community API error', error);
    return json({ ok: false, code: 'server_error', message: '처리 중 오류가 발생했습니다.' }, 500);
  }
}
