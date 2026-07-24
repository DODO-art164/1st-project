(() => {
  const API = '/api/community';
  const pageType = document.body.dataset.communityPage || '';
  const categoryLabels = {
    all: '전체', free: '자유게시판', question: '질문·답변', operations: '매출·운영',
    marketing: '마케팅·광고', platform: '판매 플랫폼', information: '정보·자료', promotion: '홍보·협업'
  };
  let config = { configured: false, turnstileSiteKey: '', approvalRequired: false, categories: categoryLabels };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const number = (value) => new Intl.NumberFormat('ko-KR').format(Number(value) || 0);

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function relativeDate(value) {
    if (!value) return '';
    const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
    if (Number.isNaN(date.getTime())) return value;
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });
    if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second');
    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return formatter.format(days, 'day');
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  }

  async function api(path = '', options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && typeof options.body !== 'string') {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const response = await fetch(`${API}${path}`, { ...options, headers });
    let data;
    try { data = await response.json(); } catch { data = { message: '서버 응답을 읽을 수 없습니다.' }; }
    if (!response.ok) {
      const error = new Error(data.message || '요청을 처리하지 못했습니다.');
      error.code = data.code;
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function loadConfig() {
    try {
      config = await api('/config');
      if (config.categories) Object.assign(categoryLabels, config.categories);
    } catch (error) {
      console.warn('Community config unavailable', error);
    }
    return config;
  }

  function showSetupNotice() {
    const notice = $('#community-setup-notice');
    if (!notice) return;
    notice.hidden = config.configured;
  }

  function categoryBadge(category) {
    return element('span', 'community-post-category', categoryLabels[category] || category);
  }

  function postUrl(id) {
    return `/community/post/${encodeURIComponent(id)}`;
  }

  function createPostRow(post) {
    const row = element('article', `community-post-row${post.pinned ? ' is-pinned' : ''}`);
    row.append(categoryBadge(post.category));

    const copy = element('div', 'community-post-copy');
    const title = element('a', 'community-post-title');
    title.href = postUrl(post.id);
    const titleText = element('span', '', post.title);
    title.append(titleText);
    if (post.pinned) title.append(element('span', 'community-pin', '공지'));
    if (post.is_official) title.append(element('span', 'community-official', '운영팀'));
    copy.append(title);
    if (post.excerpt) copy.append(element('p', 'community-post-excerpt', post.excerpt));
    const meta = element('div', 'community-post-meta');
    meta.append(element('span', '', post.nickname));
    meta.append(element('span', '', relativeDate(post.created_at)));
    copy.append(meta);
    row.append(copy);

    const counts = element('div', 'community-post-counts');
    [['조회', post.view_count], ['추천', post.like_count], ['댓글', post.comment_count]].forEach(([label, value]) => {
      const item = element('div');
      item.append(element('b', '', number(value)), document.createTextNode(label));
      counts.append(item);
    });
    row.append(counts);
    return row;
  }

  function renderPagination(container, state, totalPages, onPage) {
    container.replaceChildren();
    if (totalPages <= 1) return;
    const previous = element('button', '', '‹');
    previous.type = 'button';
    previous.disabled = state.page <= 1;
    previous.setAttribute('aria-label', '이전 페이지');
    previous.addEventListener('click', () => onPage(state.page - 1));
    container.append(previous);

    const start = Math.max(1, Math.min(state.page - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    for (let page = start; page <= end; page += 1) {
      const button = element('button', '', String(page));
      button.type = 'button';
      if (page === state.page) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => onPage(page));
      container.append(button);
    }

    const next = element('button', '', '›');
    next.type = 'button';
    next.disabled = state.page >= totalPages;
    next.setAttribute('aria-label', '다음 페이지');
    next.addEventListener('click', () => onPage(state.page + 1));
    container.append(next);
  }

  async function initHome() {
    await loadConfig();
    showSetupNotice();
    const list = $('#community-post-list');
    const count = $('#community-result-count');
    const pagination = $('#community-pagination');
    const searchForm = $('#community-search-form');
    const searchInput = $('#community-search');
    const sortSelect = $('#community-sort');
    const state = { category: 'all', q: '', sort: 'latest', page: 1 };

    async function loadPosts() {
      if (!config.configured) {
        list.innerHTML = '<div class="community-empty"><b>커뮤니티를 준비하고 있습니다</b><span>데이터베이스 연결이 완료되면 게시글이 표시됩니다.</span></div>';
        count.textContent = '설정 대기';
        return;
      }
      list.innerHTML = '<div class="community-loading">게시글을 불러오는 중입니다.</div>';
      const params = new URLSearchParams({ category: state.category, q: state.q, sort: state.sort, page: state.page, limit: 20 });
      try {
        const data = await api(`/posts?${params}`);
        list.replaceChildren();
        if (!data.posts.length) {
          list.innerHTML = '<div class="community-empty"><b>아직 게시글이 없습니다</b><span>첫 번째 이야기를 남겨보세요.</span></div>';
        } else {
          data.posts.forEach((post) => list.append(createPostRow(post)));
        }
        count.textContent = `총 ${number(data.total)}개`;
        renderPagination(pagination, state, data.totalPages, (page) => {
          state.page = page;
          loadPosts();
          list.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } catch (error) {
        list.innerHTML = `<div class="community-empty"><b>게시글을 불러오지 못했습니다</b><span>${error.message}</span></div>`;
      }
    }

    async function loadStats() {
      if (!config.configured) return;
      try {
        const stats = await api('/stats');
        const map = { posts: stats.posts, comments: stats.comments, today: stats.today, unanswered: stats.unanswered };
        Object.entries(map).forEach(([key, value]) => {
          const target = $(`[data-community-stat="${key}"]`);
          if (target) target.textContent = number(value);
        });
      } catch (error) { console.warn(error); }
    }

    async function loadPopular() {
      const target = $('#community-popular-links');
      if (!target || !config.configured) return;
      try {
        const data = await api('/posts?sort=popular&limit=5&page=1');
        target.replaceChildren();
        data.posts.forEach((post) => {
          const link = element('a');
          link.href = postUrl(post.id);
          link.append(element('b', '', post.title), element('span', '', `댓글 ${number(post.comment_count)}`));
          target.append(link);
        });
      } catch (error) { console.warn(error); }
    }

    $$('.community-category').forEach((button) => {
      button.addEventListener('click', () => {
        $$('.community-category').forEach((item) => item.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        state.category = button.dataset.category;
        state.page = 1;
        loadPosts();
      });
    });
    searchForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      state.q = searchInput.value.trim();
      state.page = 1;
      loadPosts();
    });
    sortSelect?.addEventListener('change', () => {
      state.sort = sortSelect.value;
      state.page = 1;
      loadPosts();
    });

    await Promise.all([loadPosts(), loadStats(), loadPopular()]);
  }

  function setFormMessage(message, type = '') {
    const target = $('#community-form-message');
    if (!target) return;
    target.hidden = !message;
    target.className = `community-form-message${type ? ` is-${type}` : ''}`;
    target.textContent = message;
  }

  async function renderTurnstile(targetId) {
    if (!config.turnstileSiteKey || !window.turnstile || !document.getElementById(targetId)) return null;
    return window.turnstile.render(`#${targetId}`, {
      sitekey: config.turnstileSiteKey,
      theme: 'light',
      'error-callback': () => setFormMessage('자동 등록 방지 확인을 불러오지 못했습니다. 새로고침해 주세요.', 'error')
    });
  }

  function turnstileToken(widgetId) {
    if (widgetId === null || widgetId === undefined || !window.turnstile) return '';
    return window.turnstile.getResponse(widgetId) || '';
  }

  async function initWrite() {
    await loadConfig();
    showSetupNotice();
    const form = $('#community-write-form');
    if (!form) return;
    const bodyInput = $('#community-body');
    const counter = $('#community-char-count');
    const editId = new URL(location.href).searchParams.get('edit');
    let widgetId = null;
    const savedNickname = localStorage.getItem('fashionops-community-nickname');
    if (savedNickname) $('#community-nickname').value = savedNickname;

    bodyInput.addEventListener('input', () => { counter.textContent = `${number(bodyInput.value.length)} / 5,000`; });
    counter.textContent = `${number(bodyInput.value.length)} / 5,000`;

    if (editId && config.configured) {
      try {
        const data = await api(`/posts/${encodeURIComponent(editId)}`);
        $('#community-category-select').value = data.post.category;
        $('#community-title').value = data.post.title;
        bodyInput.value = data.post.body;
        counter.textContent = `${number(bodyInput.value.length)} / 5,000`;
        $('#community-form-title').textContent = '게시글 수정';
        $('#community-submit-label').textContent = '수정 저장';
      } catch (error) {
        setFormMessage(error.message, 'error');
      }
    }

    const waitForTurnstile = () => {
      if (window.turnstile || !config.turnstileSiteKey) renderTurnstile('community-turnstile').then((id) => { widgetId = id; });
      else setTimeout(waitForTurnstile, 250);
    };
    waitForTurnstile();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!config.configured) return setFormMessage('D1 데이터베이스 연결 후 글을 작성할 수 있습니다.', 'error');
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      setFormMessage('저장하는 중입니다.');
      const payload = {
        category: $('#community-category-select').value,
        title: $('#community-title').value,
        body: bodyInput.value,
        nickname: $('#community-nickname').value,
        password: $('#community-password').value,
        turnstileToken: turnstileToken(widgetId)
      };
      try {
        const data = await api(editId ? `/posts/${encodeURIComponent(editId)}` : '/posts', {
          method: editId ? 'PATCH' : 'POST', body: payload
        });
        localStorage.setItem('fashionops-community-nickname', payload.nickname.trim());
        if (data.status === 'published') location.href = postUrl(data.id || editId);
        else {
          setFormMessage('검수 대기 상태로 저장됐습니다. 승인 후 목록에 공개됩니다.', 'success');
          form.reset();
        }
      } catch (error) {
        setFormMessage(error.message, 'error');
        if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
      } finally {
        submit.disabled = false;
      }
    });
  }

  function postIdFromPage() {
    const fromData = document.body.dataset.postId;
    if (fromData) return fromData;
    const match = location.pathname.match(/\/community\/post\/(\d+)/);
    return match?.[1] || new URL(location.href).searchParams.get('id');
  }

  function rememberRecentPost(post) {
    try {
      const key = 'fashionops-community-recent-v1';
      const current = JSON.parse(localStorage.getItem(key) || '[]').filter((item) => String(item.id) !== String(post.id));
      current.unshift({ id: post.id, title: post.title, category: post.category, viewedAt: Date.now() });
      localStorage.setItem(key, JSON.stringify(current.slice(0, 12)));
    } catch {}
  }

  function toggleBookmark(post) {
    const key = 'fashionops-community-bookmarks-v1';
    let items = [];
    try { items = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    const exists = items.some((item) => String(item.id) === String(post.id));
    items = exists ? items.filter((item) => String(item.id) !== String(post.id)) : [{ id: post.id, title: post.title, category: post.category }, ...items].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(items));
    return !exists;
  }

  function isBookmarked(id) {
    try { return JSON.parse(localStorage.getItem('fashionops-community-bookmarks-v1') || '[]').some((item) => String(item.id) === String(id)); }
    catch { return false; }
  }

  function renderPost(post) {
    const title = $('#community-post-title');
    const body = $('#community-post-body');
    if (title) title.textContent = post.title;
    if (body) body.textContent = post.body;
    const category = $('#community-post-category');
    if (category) category.textContent = categoryLabels[post.category] || post.category;
    const nickname = $('#community-post-nickname');
    if (nickname) nickname.textContent = post.nickname;
    const date = $('#community-post-date');
    if (date) date.textContent = relativeDate(post.created_at);
    const views = $('#community-post-views');
    if (views) views.textContent = `조회 ${number(post.view_count)}`;
    const likes = $('#community-post-likes');
    if (likes) likes.textContent = number(post.like_count);
    const comments = $('#community-post-comment-count');
    if (comments) comments.textContent = number(post.comment_count);
    if (post.is_official) $('#community-post-official')?.removeAttribute('hidden');
  }

  function renderRelated(posts) {
    const target = $('#community-related');
    if (!target) return;
    target.replaceChildren();
    posts.forEach((post) => {
      const link = element('a');
      link.href = postUrl(post.id);
      link.append(element('b', '', post.title), element('span', '', `${categoryLabels[post.category]} · 댓글 ${number(post.comment_count)}`));
      target.append(link);
    });
    if (!posts.length) target.append(element('p', '', '같은 게시판의 다른 글이 아직 없습니다.'));
  }

  function renderComments(comments, postId) {
    const target = $('#community-comment-list');
    if (!target) return;
    target.replaceChildren();
    if (!comments.length) {
      target.append(element('div', 'community-empty', '아직 댓글이 없습니다. 첫 댓글을 남겨보세요.'));
      return;
    }
    comments.forEach((comment) => {
      const item = element('article', 'community-comment');
      const head = element('div', 'community-comment-head');
      const author = element('b', '', comment.nickname);
      if (comment.is_official) author.append(document.createTextNode(' · 운영팀'));
      head.append(author, element('span', '', relativeDate(comment.created_at)));
      item.append(head, element('p', 'community-comment-body', comment.body));
      const actions = element('div', 'community-comment-actions');
      const report = element('button', 'community-mini-button', '신고');
      report.type = 'button';
      report.addEventListener('click', () => submitReport('comment', comment.id));
      const remove = element('button', 'community-mini-button', '삭제');
      remove.type = 'button';
      remove.addEventListener('click', async () => {
        const password = prompt('댓글 삭제 비밀번호를 입력하세요.');
        if (!password) return;
        try {
          await api(`/comments/${comment.id}`, { method: 'DELETE', body: { password } });
          await loadComments(postId);
        } catch (error) { alert(error.message); }
      });
      actions.append(report, remove);
      item.append(actions);
      target.append(item);
    });
  }

  async function loadComments(postId) {
    const data = await api(`/posts/${postId}/comments`);
    renderComments(data.comments, postId);
    const count = $('#community-comments-title-count');
    if (count) count.textContent = number(data.comments.length);
  }

  async function submitReport(type, id) {
    const reason = prompt('신고 사유를 입력해 주세요.\nspam: 도배·스팸 / promotion: 반복 홍보 / abuse: 욕설·괴롭힘 / illegal: 불법 / privacy: 개인정보 / other: 기타', 'spam');
    if (!reason) return;
    const details = prompt('추가 설명이 있으면 입력하세요.', '') || '';
    try {
      const path = type === 'post' ? `/posts/${id}/report` : `/comments/${id}/report`;
      await api(path, { method: 'POST', body: { reason, details } });
      alert('신고가 접수됐습니다.');
    } catch (error) { alert(error.message); }
  }

  async function initPost() {
    await loadConfig();
    showSetupNotice();
    const postId = postIdFromPage();
    if (!postId || !config.configured) return;
    let post;
    try {
      const viewedKey = `fashionops-community-view-${postId}`;
      const shouldCountView = !sessionStorage.getItem(viewedKey);
      const data = await api(`/posts/${postId}${shouldCountView ? '?view=1' : ''}`);
      post = data.post;
      if (shouldCountView) sessionStorage.setItem(viewedKey, '1');
      renderPost(post);
      renderRelated(data.related || []);
      rememberRecentPost(post);
      await loadComments(postId);
    } catch (error) {
      const target = $('#community-post-body');
      if (target) target.textContent = error.message;
      return;
    }

    const bookmark = $('#community-bookmark-button');
    if (bookmark) {
      bookmark.classList.toggle('is-active', isBookmarked(postId));
      bookmark.addEventListener('click', () => {
        const active = toggleBookmark(post);
        bookmark.classList.toggle('is-active', active);
        bookmark.textContent = active ? '북마크 저장됨' : '북마크';
      });
    }
    $('#community-like-button')?.addEventListener('click', async (event) => {
      try {
        const data = await api(`/posts/${postId}/like`, { method: 'POST', body: {} });
        event.currentTarget.classList.toggle('is-active', data.liked);
        $('#community-post-likes').textContent = number(data.likeCount);
      } catch (error) { alert(error.message); }
    });
    $('#community-report-button')?.addEventListener('click', () => submitReport('post', postId));
    $('#community-share-button')?.addEventListener('click', async () => {
      try {
        if (navigator.share) await navigator.share({ title: post.title, url: location.href });
        else { await navigator.clipboard.writeText(location.href); alert('링크를 복사했습니다.'); }
      } catch {}
    });
    const edit = $('#community-edit-button');
    if (edit) edit.href = `/community-write.html?edit=${postId}`;
    $('#community-delete-button')?.addEventListener('click', async () => {
      const password = prompt('게시물 삭제 비밀번호를 입력하세요.');
      if (!password) return;
      if (!confirm('게시물을 삭제하시겠습니까?')) return;
      try {
        await api(`/posts/${postId}`, { method: 'DELETE', body: { password } });
        location.href = '/community.html';
      } catch (error) { alert(error.message); }
    });

    const commentForm = $('#community-comment-form');
    let widgetId = null;
    if (config.turnstileSiteKey) {
      const wait = () => window.turnstile
        ? renderTurnstile('community-comment-turnstile').then((id) => { widgetId = id; })
        : setTimeout(wait, 250);
      wait();
    }
    const savedNickname = localStorage.getItem('fashionops-community-nickname');
    if (savedNickname && $('#community-comment-nickname')) $('#community-comment-nickname').value = savedNickname;
    commentForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = commentForm.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        const payload = {
          body: $('#community-comment-body').value,
          nickname: $('#community-comment-nickname').value,
          password: $('#community-comment-password').value,
          turnstileToken: turnstileToken(widgetId)
        };
        const data = await api(`/posts/${postId}/comments`, { method: 'POST', body: payload });
        localStorage.setItem('fashionops-community-nickname', payload.nickname.trim());
        if (data.status === 'published') {
          $('#community-comment-body').value = '';
          await loadComments(postId);
        } else alert('댓글이 검수 대기 상태로 저장됐습니다.');
        if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
      } catch (error) { alert(error.message); }
      finally { submit.disabled = false; }
    });
  }

  function adminHeaders(token) {
    return { authorization: `Bearer ${token}` };
  }

  function adminItem(type, item, token, reload) {
    const node = element('article', 'community-admin-item');
    const meta = element('div', 'community-admin-meta', `${type === 'post' ? `#${item.id} · ${categoryLabels[item.category] || ''}` : `댓글 #${item.id} · 게시물 #${item.post_id}`} · ${item.status} · 신고 ${number(item.report_count)}`);
    node.append(meta, element('h3', '', item.title || item.body || '내용 없음'));
    const actions = element('div', 'community-admin-actions');
    const states = ['published', 'pending', 'hidden', 'deleted'];
    states.forEach((status) => {
      const button = element('button', 'community-mini-button', status);
      button.type = 'button';
      button.addEventListener('click', async () => {
        try {
          await api(`/admin/${type === 'post' ? 'posts' : 'comments'}/${item.id}`, {
            method: 'PATCH', headers: adminHeaders(token), body: { status }
          });
          reload();
        } catch (error) { alert(error.message); }
      });
      actions.append(button);
    });
    if (type === 'post') {
      const pin = element('button', 'community-mini-button', item.pinned ? '공지 해제' : '공지 고정');
      pin.type = 'button';
      pin.addEventListener('click', async () => {
        try {
          await api(`/admin/posts/${item.id}`, { method: 'PATCH', headers: adminHeaders(token), body: { pinned: !item.pinned } });
          reload();
        } catch (error) { alert(error.message); }
      });
      actions.append(pin);
    }
    node.append(actions);
    return node;
  }

  async function initAdmin() {
    await loadConfig();
    const tokenInput = $('#community-admin-token');
    const target = $('#community-admin-content');
    const stored = sessionStorage.getItem('fashionops-community-admin-token') || '';
    tokenInput.value = stored;

    async function load() {
      const token = tokenInput.value.trim();
      if (!token) return;
      target.innerHTML = '<div class="community-loading">검수 목록을 불러오는 중입니다.</div>';
      try {
        const data = await api('/admin/queue', { headers: adminHeaders(token) });
        sessionStorage.setItem('fashionops-community-admin-token', token);
        target.replaceChildren();
        const postsHeading = element('h2', '', `게시물 ${number(data.posts.length)}개`);
        target.append(postsHeading);
        data.posts.forEach((item) => target.append(adminItem('post', item, token, load)));
        const commentsHeading = element('h2', '', `댓글 ${number(data.comments.length)}개`);
        commentsHeading.style.marginTop = '28px';
        target.append(commentsHeading);
        data.comments.forEach((item) => target.append(adminItem('comment', item, token, load)));
        if (!data.posts.length && !data.comments.length) target.append(element('div', 'community-empty', '검수할 항목이 없습니다.'));
      } catch (error) {
        target.innerHTML = `<div class="community-notice">${error.message}</div>`;
      }
    }
    $('#community-admin-login')?.addEventListener('submit', (event) => { event.preventDefault(); load(); });
    if (stored) load();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (pageType === 'home') initHome();
    if (pageType === 'write') initWrite();
    if (pageType === 'post') initPost();
    if (pageType === 'admin') initAdmin();
  });
})();
