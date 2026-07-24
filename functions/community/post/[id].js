const CATEGORY_LABELS = {
  free: '자유게시판', question: '질문·답변', operations: '매출·운영', marketing: '마케팅·광고',
  platform: '판매 플랫폼', information: '정보·자료', promotion: '홍보·협업'
};
const SITE_ORIGIN = 'https://1st-project-3aj.pages.dev';

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function description(value = '') {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 155);
}

function pageShell({ title, descriptionText, canonical, body, robots = 'index,follow,max-image-preview:large', schema = '' }) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(descriptionText)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/ux.css">
  <link rel="stylesheet" href="/community.css?v=1">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(descriptionText)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  ${schema ? `<script type="application/ld+json" data-fashionops-schema>${schema}</script>` : ''}
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
</head>
${body}
</html>`;
}

function statusPage(status, heading, message) {
  const canonical = `${SITE_ORIGIN}/community.html`;
  const body = `<body data-community-page="post">
  <header class="site-header"><div class="container nav-wrap"><a class="brand" href="/index.html"><span class="brand-mark">F</span><span>FashionOps</span></a><nav class="main-nav"><a href="/community.html">커뮤니티</a><a class="nav-cta" href="/resources.html">전체도구</a></nav></div></header>
  <main class="legal-main"><div class="container"><article class="legal-card"><a class="back-link" href="/community.html">← 커뮤니티</a><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(message)}</p></article></div></main>
  <footer class="site-footer"><div class="container footer-bottom"><span>© 2026 FashionOps</span><span><a href="/community-rules.html">커뮤니티 규칙</a></span></div></footer>
</body>`;
  return new Response(pageShell({ title: `${heading} | FashionOps`, descriptionText: message, canonical, robots: 'noindex,follow', body }), {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export async function onRequest(context) {
  const id = Number.parseInt(context.params.id, 10);
  if (!id) return statusPage(404, '게시물을 찾을 수 없습니다', '올바른 게시물 주소가 아닙니다.');
  const db = context.env.DB;
  if (!db) return statusPage(503, '커뮤니티 연결 준비 중', 'D1 데이터베이스 연결이 완료되면 게시물을 확인할 수 있습니다.');

  const post = await db.prepare(`
    SELECT id, category, title, body, nickname, is_official, pinned, view_count, like_count, comment_count, created_at, updated_at
    FROM posts WHERE id = ? AND status = 'published'
  `).bind(id).first();
  if (!post) return statusPage(404, '게시물을 찾을 수 없습니다', '삭제되었거나 공개되지 않은 게시물입니다.');

  const canonical = `${SITE_ORIGIN}/community/post/${post.id}`;
  const title = `${post.title} | FashionOps 커뮤니티`;
  const descriptionText = description(post.body) || 'FashionOps 온라인 사업자 커뮤니티 게시물';
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: post.title,
    text: post.body,
    url: canonical,
    datePublished: `${post.created_at.replace(' ', 'T')}Z`,
    dateModified: `${post.updated_at.replace(' ', 'T')}Z`,
    author: { '@type': post.is_official ? 'Organization' : 'Person', name: post.nickname },
    interactionStatistic: [
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: post.comment_count },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: post.like_count },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/ViewAction', userInteractionCount: post.view_count }
    ],
    commentCount: post.comment_count,
    isPartOf: { '@type': 'WebSite', name: 'FashionOps', url: `${SITE_ORIGIN}/` }
  }).replace(/</g, '\\u003c');

  const body = `<body data-community-page="post" data-post-id="${post.id}">
  <a class="skip-link" href="#community-post-body">본문으로 바로 이동</a>
  <header class="site-header ad-exclusion-zone" id="site-navigation">
    <div class="container nav-wrap">
      <a class="brand" href="/index.html"><span class="brand-mark">F</span><span>FashionOps</span></a>
      <nav class="main-nav" aria-label="주요 메뉴"><a href="/index.html#tools">계산기</a><a href="/profit-audit.html">대량분석</a><a aria-current="page" href="/community.html">커뮤니티</a><a class="nav-cta" href="/resources.html">전체도구</a></nav>
    </div>
  </header>

  <main class="community-main">
    <div class="container">
      <div class="community-notice" id="community-setup-notice" hidden></div>
      <div class="community-post-layout">
        <div>
          <article class="community-article">
            <header class="community-article-head">
              <a class="back-link" href="/community.html">← 커뮤니티 목록</a>
              <span class="community-post-category" id="community-post-category">${escapeHtml(CATEGORY_LABELS[post.category] || post.category)}</span>
              <h1 id="community-post-title">${escapeHtml(post.title)}</h1>
              <div class="community-article-meta">
                <span id="community-post-nickname">${escapeHtml(post.nickname)}</span>
                <span id="community-post-official"${post.is_official ? '' : ' hidden'}>운영팀</span>
                <span id="community-post-date">${escapeHtml(post.created_at)}</span>
                <span id="community-post-views">조회 ${post.view_count}</span>
              </div>
            </header>
            <div class="community-article-body" id="community-post-body">${escapeHtml(post.body)}</div>
            <footer class="community-article-actions">
              <div class="community-action-group">
                <button class="community-mini-button" id="community-like-button" type="button">추천 <span id="community-post-likes">${post.like_count}</span></button>
                <button class="community-mini-button" id="community-bookmark-button" type="button">북마크</button>
                <button class="community-mini-button" id="community-share-button" type="button">공유</button>
              </div>
              <div class="community-action-group">
                <a class="community-mini-button" id="community-edit-button" href="/community-write.html?edit=${post.id}">수정</a>
                <button class="community-mini-button" id="community-delete-button" type="button">삭제</button>
                <button class="community-mini-button" id="community-report-button" type="button">신고</button>
              </div>
            </footer>
          </article>

          <section class="community-comments" aria-label="댓글">
            <header class="community-comments-head"><h2>댓글 <span id="community-comments-title-count">${post.comment_count}</span></h2></header>
            <div class="community-comment-list" id="community-comment-list"><div class="community-loading">댓글을 불러오는 중입니다.</div></div>
            <form class="community-comment-form" id="community-comment-form">
              <textarea id="community-comment-body" maxlength="2000" required placeholder="서로 존중하는 댓글을 남겨주세요."></textarea>
              <div class="community-comment-identity">
                <input id="community-comment-nickname" type="text" minlength="2" maxlength="20" required placeholder="닉네임">
                <input id="community-comment-password" type="password" minlength="4" maxlength="64" required placeholder="삭제 비밀번호">
                <button class="button primary" type="submit">댓글 등록</button>
              </div>
              <div id="community-comment-turnstile"></div>
            </form>
          </section>
        </div>

        <aside class="community-sidebar">
          <section class="community-card"><h2>같은 게시판의 글</h2><div class="community-related" id="community-related"><p>관련 글을 불러오는 중입니다.</p></div></section>
          <section class="community-card"><h2>바로 계산하기</h2><div class="community-side-links"><a href="/index.html#profit-calculator"><b>실제 순이익</b><span>무료</span></a><a href="/roas-calculator.html"><b>광고 ROAS</b><span>무료</span></a><a href="/profit-audit.html"><b>상품별 대량 손익</b><span>CSV</span></a></div></section>
          <section class="community-card"><h2>안전한 이용</h2><p>개인정보나 공개하기 어려운 사업 자료는 작성하지 마세요. 문제가 있는 글과 댓글은 신고할 수 있습니다.</p><p style="margin-top:10px"><a href="/community-rules.html" style="color:var(--accent);font-weight:600">이용규칙 보기 →</a></p></section>
        </aside>
      </div>
    </div>
  </main>

  <footer class="site-footer"><div class="container footer-bottom"><span>© 2026 FashionOps</span><span><a href="/community.html">커뮤니티</a> · <a href="/community-rules.html">이용규칙</a> · <a href="/privacy.html">개인정보처리방침</a></span></div></footer>
  <script src="/community.js?v=1" defer></script>
</body>`;

  return new Response(pageShell({ title, descriptionText, canonical, body, schema }), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  });
}
