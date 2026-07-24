PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('free','question','operations','marketing','platform','information','promotion')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  nickname TEXT NOT NULL,
  password_salt TEXT,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','pending','hidden','deleted')),
  is_official INTEGER NOT NULL DEFAULT 0 CHECK (is_official IN (0,1)),
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0,1)),
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES comments(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  nickname TEXT NOT NULL,
  password_salt TEXT,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','pending','hidden','deleted')),
  is_official INTEGER NOT NULL DEFAULT 0 CHECK (is_official IN (0,1)),
  like_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','comment')),
  target_id INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (target_type, target_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','comment')),
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam','promotion','abuse','illegal','privacy','other')),
  details TEXT NOT NULL DEFAULT '',
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (target_type, target_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  fingerprint TEXT NOT NULL,
  action TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (fingerprint, action, window_start)
);

CREATE TABLE IF NOT EXISTS moderation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_public_latest ON posts(status, pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_latest ON posts(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_popular ON posts(status, like_count DESC, comment_count DESC, view_count DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_latest ON comments(post_id, status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_reports_open ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

INSERT OR IGNORE INTO posts
(id, category, title, body, nickname, status, is_official, pinned, created_at, updated_at)
VALUES
(1, 'information', 'FashionOps 사업자 커뮤니티 이용 안내', '온라인 사업, 쇼핑몰 운영, 마케팅, 플랫폼, 재고와 창업 경험을 자유롭게 나누는 공간입니다.\n\n서로 다른 경험을 존중해 주세요. 개인정보, 주문번호, 고객 연락처, 계정 비밀번호와 공개하면 곤란한 매출 원본은 올리지 마세요. 불법 금융, 도박, 성인물, 혐오, 반복 홍보와 타인을 사칭하는 글은 숨김 또는 삭제될 수 있습니다.\n\n오류나 정책 위반 글은 신고 기능을 이용해 주세요. 운영 기준은 커뮤니티 이용규칙에서 확인할 수 있습니다.', 'FashionOps 운영팀', 'published', 1, 1, datetime('now','-7 days'), datetime('now','-7 days')),
(2, 'free', '이번 주 사업 목표를 한 줄로 공유해보세요', '이번 주에 꼭 끝내고 싶은 일을 한 줄로 남겨보세요.\n\n예: 신상품 상세페이지 완성, 광고 소재 3개 테스트, 반품률 원인 정리, 재고 위치표 업데이트.\n\n다음 주에 다시 들어와 실제로 끝냈는지 댓글로 기록해도 좋습니다.', 'FashionOps 운영팀', 'published', 1, 0, datetime('now','-6 days'), datetime('now','-6 days')),
(3, 'operations', '온라인 사업을 시작하고 가장 예상 밖이었던 비용은 무엇이었나요?', '상품 원가 외에도 결제 수수료, 반품 배송비, 포장재, 촬영, 광고, 세금, 보관비처럼 처음에는 놓치기 쉬운 비용이 많습니다. 실제 운영하면서 예상보다 컸던 비용과 줄인 방법을 공유해 주세요.', 'FashionOps 운영팀', 'published', 1, 0, datetime('now','-5 days'), datetime('now','-5 days')),
(4, 'platform', '스마트스토어·쿠팡·자사몰을 운영해본 체감 차이가 궁금합니다', '유입, 수수료, 광고, 정산, CS와 재구매 관점에서 직접 운영해본 플랫폼의 장단점을 공유하는 글입니다. 특정 업체를 근거 없이 비방하기보다 자신의 조건과 경험을 함께 적어 주세요.', 'FashionOps 운영팀', 'published', 1, 0, datetime('now','-4 days'), datetime('now','-4 days')),
(5, 'marketing', '광고비를 늘리기 전에 가장 먼저 확인하는 숫자는 무엇인가요?', 'ROAS만 보는지, 공헌이익과 반품률까지 함께 보는지, 광고 확대 전에 확인하는 기준을 공유해 주세요. 업종과 평균 객단가를 함께 적으면 다른 사업자에게 더 도움이 됩니다.', 'FashionOps 운영팀', 'published', 1, 0, datetime('now','-3 days'), datetime('now','-3 days')),
(6, 'information', '사업 운영에 실제로 도움이 된 AI 도구와 사용법을 공유해주세요', '콘텐츠 제작, 고객 응대, 데이터 정리, 광고 문구, 상품 기획과 업무 자동화에 실제로 사용한 AI 도구가 있다면 구체적인 작업과 함께 공유해 주세요. 단순 추천 링크나 반복 홍보는 홍보·협업 게시판을 이용해 주세요.', 'FashionOps 운영팀', 'published', 1, 0, datetime('now','-2 days'), datetime('now','-2 days')),
(7, 'free', '온라인 사업 첫 매출까지 얼마나 걸렸나요?', '준비 기간, 판매 채널, 첫 상품 수와 첫 주문까지 걸린 시간을 가볍게 공유하는 글입니다. 성공 사례뿐 아니라 오래 걸렸던 경험과 실패한 시도도 다른 준비자에게 도움이 됩니다.', 'FashionOps 운영팀', 'published', 1, 0, datetime('now','-1 day'), datetime('now','-1 day')),
(8, 'question', '지금 가장 골치 아픈 사업 운영 문제를 적어보세요', '광고, 매출, 상세페이지, CS, 반품, 생산, 재고, 세금과 시간 관리 중 지금 가장 해결하고 싶은 문제를 적어보세요. 상황과 이미 시도한 방법을 함께 적으면 더 구체적인 답변을 받을 수 있습니다.', 'FashionOps 운영팀', 'published', 1, 0, datetime('now'), datetime('now'));
