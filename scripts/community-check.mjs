import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const errors = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const requireFile = (path) => {
  if (!existsSync(join(root, path))) {
    errors.push(`${path} 파일이 없습니다.`);
    return '';
  }
  return read(path);
};
const requireText = (source, text, message) => {
  if (!source.includes(text)) errors.push(message);
};

const requiredFiles = [
  'community.html', 'community-write.html', 'community-rules.html', 'community-admin.html',
  'community.css', 'community.js', 'community-schema.sql', 'COMMUNITY_SETUP.md',
  'functions/api/community/_middleware.js', 'functions/api/community/[[path]].js', 'functions/community/post/[id].js'
];
requiredFiles.forEach(requireFile);

const home = requireFile('community.html');
requireText(home, 'data-community-page="home"', 'community.html: 홈 런타임 식별자가 없습니다.');
requireText(home, 'id="community-post-list"', 'community.html: 게시글 목록 영역이 없습니다.');
requireText(home, 'community-write.html', 'community.html: 글쓰기 동선이 없습니다.');
requireText(home, 'community-rules.html', 'community.html: 운영규칙 동선이 없습니다.');

const write = requireFile('community-write.html');
requireText(write, 'name="robots" content="noindex,follow"', 'community-write.html: 글쓰기 페이지가 검색 제외되지 않았습니다.');
requireText(write, 'turnstile/v0/api.js?render=explicit', 'community-write.html: Turnstile 클라이언트 연결이 없습니다.');
requireText(write, '수정·삭제 비밀번호', 'community-write.html: 익명 글 관리 안내가 없습니다.');

const admin = requireFile('community-admin.html');
requireText(admin, 'name="robots" content="noindex,nofollow"', 'community-admin.html: 관리자 화면이 검색 제외되지 않았습니다.');

const rules = requireFile('community-rules.html');
for (const phrase of ['도박', '개인정보', '홍보·협업', '신고', 'Google AdSense']) {
  requireText(rules, phrase, `community-rules.html: ${phrase} 운영 기준이 없습니다.`);
}

const schema = requireFile('community-schema.sql');
for (const table of ['posts', 'comments', 'reactions', 'reports', 'rate_limits', 'moderation_logs']) {
  requireText(schema, `CREATE TABLE IF NOT EXISTS ${table}`, `community-schema.sql: ${table} 테이블이 없습니다.`);
}
requireText(schema, 'FashionOps 운영팀', 'community-schema.sql: 출처가 명확한 초기 운영 글이 없습니다.');
requireText(schema, 'idx_posts_public_latest', 'community-schema.sql: 공개 게시글 조회 인덱스가 없습니다.');

const guard = requireFile('functions/api/community/_middleware.js');
for (const marker of [
  'RESERVED_NICKNAME', 'FashionOps', '운영', 'MAX_REQUEST_BYTES', 'request_too_large', 'nickname_reserved',
  'COMMUNITY_HASH_SALT', 'COMMUNITY_REQUIRE_APPROVAL', 'community_security_setup_required', 'community_approval_setup_required'
]) {
  requireText(guard, marker, `커뮤니티 보호 미들웨어: ${marker} 처리가 없습니다.`);
}

const api = requireFile('functions/api/community/[[path]].js');
for (const marker of [
  'iterations: 120000', 'PBKDF2', 'TURNSTILE_SECRET', 'siteverify', 'COMMUNITY_HASH_SALT',
  'enforceRateLimit', "status = 'published'", 'INSERT OR IGNORE INTO reports', 'count >= 5',
  'requestOriginMatches', 'content-type'
]) {
  requireText(api, marker, `커뮤니티 API: ${marker} 보안·운영 처리가 없습니다.`);
}
if (/innerHTML\s*=\s*.*(?:body|title|nickname)/.test(api)) errors.push('커뮤니티 API: 사용자 콘텐츠를 HTML로 직접 출력하는 코드가 있습니다.');
if (!/prepare\([\s\S]*?\)\.bind\(/.test(api)) errors.push('커뮤니티 API: D1 prepared statement 바인딩을 확인할 수 없습니다.');

const ssr = requireFile('functions/community/post/[id].js');
requireText(ssr, 'DiscussionForumPosting', '커뮤니티 상세: 토론 구조화 데이터가 없습니다.');
requireText(ssr, "status = 'published'", '커뮤니티 상세: 승인된 글만 공개하는 조건이 없습니다.');
requireText(ssr, 'data-fashionops-schema', '커뮤니티 상세: 중복 구조화 데이터 방지 표식이 없습니다.');
requireText(ssr, 'escapeHtml', '커뮤니티 상세: HTML 이스케이프가 없습니다.');
requireText(ssr, "'cache-control': 'no-store'", '커뮤니티 상세: 삭제·숨김 글이 캐시에 남지 않도록 no-store가 필요합니다.');
if (/s-maxage|public,\s*max-age/i.test(ssr)) errors.push('커뮤니티 상세: 사용자 게시물을 공개 캐시에 저장하는 설정이 있습니다.');

const client = requireFile('community.js');
for (const feature of ['/posts?', '/comments', '/like', '/report', 'fashionops-community-bookmarks-v1', 'fashionops-community-recent-v1']) {
  requireText(client, feature, `community.js: ${feature} 기능이 없습니다.`);
}
requireText(client, 'textContent = post.body', 'community.js: 게시물 본문을 안전한 textContent로 출력하지 않습니다.');

const middleware = requireFile('functions/_middleware.js');
requireText(middleware, 'injectCommunityNav', '미들웨어: 전역 커뮤니티 메뉴 연결이 없습니다.');
for (const path of ['/community-write.html', '/community-admin.html', '/community-rules.html']) {
  requireText(middleware, path, `미들웨어: ${path} 광고 제외가 없습니다.`);
}

const worker = requireFile('service-worker.js');
requireText(worker, 'fashionops-shell-v8', 'service-worker.js: 커뮤니티 캐시 정책이 반영된 최신 캐시 버전이 아닙니다.');
requireText(worker, "!url.pathname.startsWith('/community')", 'service-worker.js: 커뮤니티 HTML 캐시 제외가 없습니다.');
requireText(worker, "!url.pathname.startsWith('/api/')", 'service-worker.js: API 요청 캐시 제외가 없습니다.');

const sitemap = requireFile('sitemap.xml');
for (const path of ['/community.html', '/community-rules.html']) {
  requireText(sitemap, path, `sitemap.xml: ${path}가 없습니다.`);
}

const manifest = JSON.parse(requireFile('manifest.webmanifest') || '{}');
if (!manifest.shortcuts?.some((shortcut) => shortcut.url === '/community.html')) errors.push('manifest.webmanifest: 커뮤니티 바로가기가 없습니다.');

const privacy = requireFile('privacy.html');
for (const phrase of ['Cloudflare D1', 'PBKDF2', 'SHA-256', 'Turnstile', '커뮤니티에서 저장하는 정보']) {
  requireText(privacy, phrase, `privacy.html: ${phrase} 고지가 없습니다.`);
}

const terms = requireFile('terms.html');
for (const phrase of ['커뮤니티 게시물과 댓글', '커뮤니티 운영과 조치', '익명 작성 비밀번호', 'community-rules.html']) {
  requireText(terms, phrase, `terms.html: ${phrase} 이용조건이 없습니다.`);
}

if (errors.length) {
  console.error('\nCommunity checks failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Community checks passed.');
