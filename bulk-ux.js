const auditLabels = [
  '상품명',
  '판매가',
  '원가',
  '수수료율',
  '광고비율',
  '배송·포장비',
  '반품률',
  '월 판매량',
  '건당 순이익',
  '순이익률',
  '월 예상이익',
  '삭제'
];

function labelAuditRows() {
  document.querySelectorAll('#product-rows tr').forEach((row) => {
    [...row.children].forEach((cell, index) => {
      cell.dataset.label = auditLabels[index] || '';
    });
  });
}

const auditBody = document.getElementById('product-rows');
if (auditBody) {
  const observer = new MutationObserver(labelAuditRows);
  observer.observe(auditBody, { childList: true });
  labelAuditRows();
}

const addButton = document.getElementById('add-row');
addButton?.addEventListener('click', () => {
  requestAnimationFrame(() => {
    labelAuditRows();
    const lastName = document.querySelector('#product-rows tr:last-child .bulk-name');
    lastName?.focus({ preventScroll: true });
  });
});

['load-sample', 'clear-rows', 'import-csv'].forEach((id) => {
  document.getElementById(id)?.addEventListener('click', () => requestAnimationFrame(labelAuditRows));
});
