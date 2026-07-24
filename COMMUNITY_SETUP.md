# FashionOps 커뮤니티 연결 안내

커뮤니티 UI, Pages Functions API와 D1 스키마는 저장소에 포함되어 있습니다. 실제 게시글 저장을 활성화하려면 Cloudflare 계정에서 아래 작업을 한 번 수행합니다.

## 1. D1 데이터베이스 생성

1. Cloudflare 대시보드에서 **Workers & Pages → D1 SQL Database**로 이동합니다.
2. 데이터베이스 이름을 `fashionops-community`로 생성합니다.
3. 생성한 데이터베이스의 Console에서 `community-schema.sql` 전체를 실행합니다.
4. `posts`, `comments`, `reactions`, `reports`, `rate_limits`, `moderation_logs` 테이블과 운영팀 초기 게시글이 생성됐는지 확인합니다.

## 2. Pages 프로젝트에 D1 연결

1. **Workers & Pages → 1st-project → Settings → Bindings**로 이동합니다.
2. **D1 database binding**을 추가합니다.
3. Variable name은 반드시 `DB`로 입력합니다.
4. Database는 방금 만든 `fashionops-community`를 선택합니다.
5. 저장한 뒤 Pages 프로젝트를 다시 배포합니다.

## 3. 환경변수 설정

Pages 프로젝트의 Settings → Variables and Secrets에 다음 값을 추가합니다.

- `COMMUNITY_ADMIN_TOKEN`: 32자 이상의 임의 관리자 토큰. `community-admin.html`에서 사용합니다.
- `COMMUNITY_HASH_SALT`: IP·브라우저 지문을 원문 대신 해시로 만들 때 사용하는 32자 이상의 임의 문자열.
- `COMMUNITY_REQUIRE_APPROVAL`: 모든 새 글과 댓글을 사전 검수하려면 `true`, 정상 글을 즉시 공개하려면 `false`.

토큰과 salt는 공개 저장소 파일에 직접 작성하지 않습니다.

## 4. Turnstile 연결 — 선택 사항이지만 공개 전 권장

1. Cloudflare Turnstile에서 현재 Pages 도메인을 허용한 위젯을 생성합니다.
2. Pages Variables and Secrets에 아래 값을 추가합니다.
   - `TURNSTILE_SITE_KEY`: 공개 사이트 키
   - `TURNSTILE_SECRET`: 비밀 키
3. 다시 배포합니다.

두 값이 있으면 글쓰기와 댓글 작성에서 Turnstile이 자동 표시되고, 서버가 Siteverify API로 토큰을 검증합니다. 값이 없을 때도 커뮤니티는 동작하지만 D1 기반 속도 제한만 적용됩니다.

## 5. 운영 확인

- `/community.html`: 목록·검색·카테고리·인기 글
- `/community-write.html`: 글쓰기와 수정
- `/community/post/1`: 서버 렌더링 상세 페이지
- `/community-admin.html`: 관리자 검수
- `/api/community/config`: 연결 상태

## 기본 보안 동작

- 수정·삭제 비밀번호는 PBKDF2-SHA256 120,000회로 변환하고 원문을 저장하지 않습니다.
- IP와 User-Agent 원문은 커뮤니티 DB에 저장하지 않고 salt를 포함한 SHA-256 지문만 속도 제한과 중복 추천·신고에 사용합니다.
- 게시물은 HTML이 아닌 일반 텍스트로 저장·출력합니다.
- 같은 환경의 중복 추천과 신고를 제한합니다.
- 10분당 게시글 3개, 댓글 12개 등 기본 도배 제한이 적용됩니다.
- 정책 위험 단어, 과도한 링크와 반복 문자가 포함된 글은 자동으로 검수 대기 상태가 됩니다.
- 고유 신고가 5회 이상 누적된 콘텐츠는 관리자 확인 전 자동 숨김됩니다.
