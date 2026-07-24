const searchInput = document.getElementById('tool-search');
const filterButtons = [...document.querySelectorAll('[data-tool-filter]')];
const toolCards = [...document.querySelectorAll('[data-tool-card]')];
const resultCount = document.getElementById('tool-result-count');
const emptyState = document.getElementById('tool-empty-state');
let activeFilter = 'all';

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function applyToolFilters() {
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

  if (resultCount) resultCount.textContent = `${visibleCount}개 도구`;
  if (emptyState) emptyState.hidden = visibleCount !== 0;
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.toolFilter;
    filterButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    applyToolFilters();
  });
});

searchInput?.addEventListener('input', applyToolFilters);
applyToolFilters();
