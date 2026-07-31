# 파일 구조 가이드

이 프로젝트는 Next.js **App Router** 기반입니다. 코드를 추가하기 전에 아래 규칙을 먼저 확인해 주세요.

## ⚠️ 이 프로젝트만의 특이사항

이 저장소의 `next` 패키지는 일반적으로 알려진 Next.js와 컨벤션이 다른 부분이 있습니다. 새 기능을 만들기 전에 `node_modules/next/dist/docs/`에서 관련 문서를 먼저 확인하세요.

- **`middleware.ts`가 아니라 `proxy.ts`** 를 씁니다. 함수 이름도 `middleware`가 아니라 `proxy`. (`/proxy.ts` 참고)
- `error.js`의 재시도 함수는 `reset`이 아니라 **`unstable_retry`** 입니다.

## 최상위 폴더 역할

```
app/          라우팅 전용 — page/layout/error/loading/not-found 등 Next.js 특수 파일만
components/   재사용 UI 컴포넌트, 하위 도메인별로 분류
lib/          외부 서비스 클라이언트 (Supabase 등)
styles/       전역 CSS
docs/         이 문서처럼 협업용 문서
```

## `app/` — 라우팅

- 페이지(`page.tsx`)의 UI/로직은 최대한 `components/`에 두고, `app/` 아래 파일은 라우팅 트리 구성 + 데이터 로딩/리다이렉트 정도만 담당합니다. (예: `app/login/page.tsx`, `app/mypage/page.tsx`는 `components/auth/*`를 조합만 함)
- `page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx` 같은 Next.js 특수 파일명은 **정확히 그 이름 그대로** 있어야 프레임워크가 인식합니다. `error/index.tsx`처럼 폴더로 바꿔서 쓸 수 없고, 파일 자체가 `default export`를 가지고 있어야 합니다.
  - 이 특수 파일들(`error.tsx`, `loading.tsx`, `not-found.tsx`)은 내용이 짧고 다른 곳에서 재사용되지도 않아서 **`components/`로 분리하지 않고 `app/` 안에 그대로** 둡니다. 굳이 wrapper로 쪼개면 `default export` 제약 때문에 오히려 복잡해집니다.
  - `app/error.tsx`는 Client Component여야 하므로 `"use client"`가 필요합니다 (`error.js`는 항상 Client Component).
- 인증 관련 라우트는 `app/auth/`에 모아둡니다 (`actions.ts` 서버 액션, `callback/route.ts` OAuth 콜백, `error/page.tsx`).

## `components/` — 하위 분류 규칙

폴더가 하나씩 쌓이는 걸 막기 위해 도메인별로 하위 폴더를 나눕니다. 새 컴포넌트를 만들 때 아래 중 어디에 속하는지 먼저 판단하고, 애매하면 새 폴더를 만드세요.

```
components/
  auth/       로그인/로그아웃 버튼, 유저 정보 표시 등 인증 관련 UI
  layout/     헤더, 네비게이션 등 사이트 전역 레이아웃 조각
```

- 컴포넌트 하나당 `폴더/index.tsx` 형태를 기본으로 합니다 (예: `components/layout/site-header.tsx`처럼 단일 파일이면 그냥 파일로도 둡니다).
- 특정 도메인 전용 컴포넌트가 3개 이상 생기면 그 도메인 이름으로 하위 폴더를 새로 만드세요 (예: 상품 관련 UI가 늘어나면 `components/product/`).
- 단, Next.js 특수 파일(`error.tsx`, `loading.tsx`, `not-found.tsx`)은 여기 분류 대상이 아닙니다 — 위 `app/` 섹션 참고.

## `lib/` — 외부 서비스 클라이언트

- `lib/supabase/client.ts`: 브라우저(Client Component)에서 쓰는 Supabase 클라이언트
- `lib/supabase/server.ts`: 서버(Server Component, Route Handler)에서 쓰는 Supabase 클라이언트 — `next/headers`의 `cookies()`를 사용하므로 클라이언트 쪽과 분리되어 있습니다.
- 새로운 외부 서비스(SDK, API 클라이언트)를 추가하면 `lib/서비스이름/` 형태로 같은 패턴을 따릅니다.

## import 경로

- 항상 `@/`로 시작하는 절대 경로를 씁니다 (`tsconfig.json`의 `paths` 설정). 상대 경로(`../../`)는 지양합니다.
  ```ts
  import { createClient } from "@/lib/supabase/server";
  import LoginButton from "@/components/auth/login-button";
  ```

## 환경 변수

- 실제 값은 `.env.local`에 있고 git에 커밋되지 않습니다 (`.gitignore`의 `.env*`).
- 필요한 값 (Supabase 프로젝트 설정 > API에서 확인):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL` (로컬 개발 시 `http://localhost:3000`)

## 코드 작성 전 체크리스트

1. Next.js 특수 파일을 건드린다면 `node_modules/next/dist/docs/`에서 해당 파일 규약을 먼저 확인했는가?
2. 페이지(`app/`)에 UI/로직을 직접 쓰지 않고 `components/`로 뺐는가?
3. 새 컴포넌트가 `components/` 아래 어느 하위 폴더에 속하는지 정했는가?
4. import는 `@/`로 시작하는가?
