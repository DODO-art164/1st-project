const searchInput = document.getElementById('tool-search');
const filterButtons = [...document.querySelectorAll('[data-tool-filter]')];
const toolCards = [...document.querySelectorAll('[data-tool-card]')];
const resultCount = document.getElementById('tool-result-count');
const emptyState = document.getElementById('tool-empty-state');
const params = new URLSearchParams(location.search);
let activeFilter = params.get('category') || 'all';

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function syncUrl() {
  const next = new URLSearchParams();
  const query = normalize(searchInput?.value);
  if (query) next.set('q', query);
  if (activeFilter !== 'all') next.set('category', activeFilter);
  const queryString = next.toString();
  history.replaceState(null, '', `${location.pathname}${queryString ? `?${queryString}` : ''}`);
}

function applyToolFilters({ updateUrl = true } = {}) {
  const query = normalize(searchInput?.value);
  let visibleCount = 0;

  toolCards.forEach((card) => {
    const categories = (card.dataset.category || '').split(' ');
    const categoryMatch = activeFilter === 'all' || categories.includes(activeFilter);
    const searchMatch = !query || normalize(card.textContent).includes(query);
    const visible = categoryMatch && searchMatch;
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  filterButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.toolFilter === activeFilter));
  });
  if (resultCount) resultCount.textContent = `${visibleCount}개 도구`;
  if (emptyState) emptyState.hidden = visibleCount !== 0;
  if (updateUrl) syncUrl();
}

if (searchInput) {
  searchInput.setAttribute('aria-label', '도구 검색');
  searchInput.value = params.get('q') || '';
  searchInput.addEventListener('input', () => applyToolFilters());
  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    searchInput.value = '';
    activeFilter = 'all';
    applyToolFilters();
    searchInput.focus();
  });
}

if (!filterButtons.some((button) => button.dataset.toolFilter === activeFilter)) activeFilter = 'all';
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.toolFilter;
    applyToolFilters();
  });
});

applyToolFilters({ updateUrl: false });
