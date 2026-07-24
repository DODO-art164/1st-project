(() => {
  const COMPLETION_STORE = 'fashionops-weekly-completions-v1';
  const checkboxes = [...document.querySelectorAll('[data-check-id]')];
  const notes = document.getElementById('weekly-notes');
  const progress = document.getElementById('week-progress');
  const progressTrack = document.getElementById('week-progress-track');
  const progressBar = document.getElementById('week-progress-bar');
  const status = document.getElementById('week-status');
  const streak = document.getElementById('week-streak');
  const completionTitle = document.getElementById('completion-title');
  const completionMessage = document.getElementById('completion-message');
  let noteTimer = 0;

  function isoWeek(date = new Date()) {
    const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = value.getUTCDay() || 7;
    value.setUTCDate(value.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((value - yearStart) / 86400000) + 1) / 7);
    const year = value.getUTCFullYear();
    return { year, week, key: `${year}-W${String(week).padStart(2, '0')}` };
  }

  const current = isoWeek();
  const stateKey = `fashionops-weekly-check-v1:${current.key}`;

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch (error) { return fallback; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function completedWeeks() {
    return new Set(readJson(COMPLETION_STORE, []));
  }

  function weekKeyOffset(offset) {
    const date = new Date();
    date.setDate(date.getDate() - offset * 7);
    return isoWeek(date).key;
  }

  function calculateStreak(completions) {
    let offset = completions.has(current.key) ? 0 : 1;
    let count = 0;
    while (offset < 104 && completions.has(weekKeyOffset(offset))) {
      count += 1;
      offset += 1;
    }
    return count;
  }

  function stateFromForm(previous = {}) {
    return {
      checked: checkboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.dataset.checkId),
      notes: notes?.value || '',
      updatedAt: new Date().toISOString(),
      completedAt: previous.completedAt || null
    };
  }

  function render(save = true) {
    const previous = readJson(stateKey, {});
    const checkedCount = checkboxes.filter((checkbox) => checkbox.checked).length;
    const total = checkboxes.length;
    const ratio = total ? checkedCount / total : 0;
    const isComplete = total > 0 && checkedCount === total;
    const state = stateFromForm(previous);
    const completions = completedWeeks();

    if (isComplete) {
      state.completedAt ||= new Date().toISOString();
      completions.add(current.key);
    } else {
      state.completedAt = null;
      completions.delete(current.key);
    }

    progress.textContent = `${checkedCount} / ${total} 완료`;
    progress.className = `result-badge ${isComplete ? 'good' : checkedCount ? 'warning' : 'neutral'}`;
    progressBar.style.width = `${Math.round(ratio * 100)}%`;
    progressTrack?.setAttribute('aria-valuemax', String(total));
    progressTrack?.setAttribute('aria-valuenow', String(checkedCount));
    status.textContent = isComplete
      ? '이번 주 운영 점검을 완료했습니다.'
      : checkedCount
        ? `${total - checkedCount}개 항목이 남았습니다.`
        : '첫 항목부터 시작하세요.';

    const consecutive = calculateStreak(completions);
    streak.textContent = `연속 완료 ${consecutive}주`;
    completionTitle.textContent = isComplete ? '이번 주 점검 완료' : '이번 주 점검 중';
    completionMessage.textContent = isComplete
      ? '다음 주에도 같은 순서로 확인하면 지표 변화를 더 빨리 발견할 수 있습니다.'
      : '완료한 항목과 메모는 이 브라우저에 자동 저장됩니다.';

    if (save) {
      writeJson(stateKey, state);
      writeJson(COMPLETION_STORE, [...completions].sort().slice(-104));
    }
  }

  function restore() {
    const state = readJson(stateKey, {});
    const checked = new Set(Array.isArray(state.checked) ? state.checked : []);
    checkboxes.forEach((checkbox) => { checkbox.checked = checked.has(checkbox.dataset.checkId); });
    if (notes) notes.value = typeof state.notes === 'string' ? state.notes : '';
    document.getElementById('week-label').textContent = `${current.year}년 ${current.week}주차`;
    render(false);
  }

  checkboxes.forEach((checkbox) => checkbox.addEventListener('change', () => render(true)));
  notes?.addEventListener('input', () => {
    clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => render(true), 250);
  });

  document.getElementById('week-reset')?.addEventListener('click', () => {
    if (!window.confirm('이번 주 체크와 메모를 모두 초기화할까요?')) return;
    checkboxes.forEach((checkbox) => { checkbox.checked = false; });
    if (notes) notes.value = '';
    try { localStorage.removeItem(stateKey); } catch (error) {}
    render(true);
  });

  restore();
})();