# FashionOps

패션 브랜드와 의류 쇼핑몰 운영자를 위한 무료 손익·판매가·재고 계산 서비스입니다.

## 제공 도구

- 실제 순이익 계산기
- 목표 판매가 역산 계산기
- 월 손익분기점 계산기
- 재고 위험·발주 계산기
- 패션 브랜드 창업 비용 계산기
- 의류 제작 실질 원가 계산기
- 할인 손익 계산기
- 광고 ROAS·손익분기 ROAS 계산기
- 플랫폼 판매 수익 계산기

## 기술 구성

별도 프레임워크나 빌드 과정이 없는 정적 웹사이트입니다.

- HTML
- CSS
- Vanilla JavaScript
- Cloudflare Pages

## Cloudflare Pages 배포 설정

- Production branch: `main`
- Framework preset: `None`
- Build command: 비워 둠
- Build output directory: `/`

GitHub `main` 브랜치에 커밋하면 연결된 Cloudflare Pages 프로젝트가 새 배포를 시작합니다.

## 로컬 실행

단순히 `index.html`을 열거나, 저장소 폴더에서 정적 서버를 실행합니다.

```bash
python -m http.server 8000
```

그다음 브라우저에서 `http://localhost:8000`을 엽니다.

## 검색엔진 등록

사이트맵:

```text
https://1st-project-3aj.pages.dev/sitemap.xml
```

Google Search Console과 네이버 서치어드바이저에서 사이트 소유권을 확인한 뒤 사이트맵을 제출합니다.

## 광고 설정

현재 광고 영역은 레이아웃 자리 표시자입니다. AdSense 승인을 받은 뒤 실제 발급된 게시자 ID와 광고 단위를 사용해야 합니다. 임의의 게시자 ID를 넣지 않습니다.

승인 후에는 Google에서 제공한 코드만 사용하고, `ads.txt` 역시 실제 게시자 ID를 확인한 뒤 추가합니다.

## 계산 결과 고지

모든 결과는 사용자가 입력한 가정을 바탕으로 계산한 참고용 추정치입니다. 실제 정산액, 회계 이익, 세금과 계약 조건은 플랫폼·사업자·시점에 따라 달라질 수 있습니다.
