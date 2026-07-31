# ssr

Next.js App Router 기반, Supabase Slack(OIDC) 로그인을 붙인 프로젝트입니다.

- `/` — 메인페이지
- `/login` — Slack 로그인
- `/mypage` — 로그인한 유저만 접근 가능한 마이페이지

## ⚠️ 참고

이 프로젝트의 Next.js는 일반적으로 알려진 컨벤션과 다른 부분이 있습니다 (`middleware.ts`가 아니라 `proxy.ts` 등). 작업 전에 [docs/file-structure.md](docs/file-structure.md)를 먼저 확인하세요.

## 협업 문서

- [docs/file-structure.md](docs/file-structure.md) — 폴더 구조 규칙
- [docs/git-convention.md](docs/git-convention.md) — 커밋 메시지 컨벤션
