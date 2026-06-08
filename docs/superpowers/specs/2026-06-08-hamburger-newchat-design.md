# 햄버거 메뉴 + 새 채팅 버튼 — 설계 (Design Spec)

- 작성일: 2026-06-08
- 상태: 초안 (사용자 승인 완료)
- 선행: [설정 메뉴](2026-06-08-settings-menu-design.md)

## 1. 목적 / 개요

`src/app/layout.tsx`의 상단 가로 nav(Chat / Admin / Settings)를 햄버거 드롭다운으로 교체하고,
오른쪽에 "새 채팅" 버튼을 추가한다. "새 채팅"은 현재 페이지가 `/`이면 메시지를 초기화하고,
다른 페이지에 있으면 `/`로 이동한다.

## 2. 변경 파일

- `src/app/layout.tsx` — nav 블록을 `<NavBar />` 컴포넌트로 교체
- `src/components/nav/NavBar.tsx` — 신규 (클라이언트 컴포넌트)
- `src/components/chat/ChatWindow.tsx` — `new-chat` 이벤트 listener 추가, 메시지 초기화

## 3. NavBar 구성

```
┌──────────────────────────────────────────────────────┐
│ [☰]                                      [새 채팅]   │
└──────────────────────────────────────────────────────┘
   └─ click ─▶ ┌──────────┐
               │ Chat     │
               │ Admin    │
               │ Settings │
               └──────────┘
```

- 좌측: 햄버거 아이콘 버튼(`☰`). 클릭 시 아래로 드롭다운 펼침.
- 드롭다운: `Chat` (`/`), `Admin` (`/admin`), `Settings` (`/settings`). 항목 클릭 또는 바깥 클릭 시 닫힘.
- 우측: "새 채팅" 버튼. 라벨은 정확히 `새 채팅`만.
- 스타일: 인라인 스타일 유지 (기존 layout.tsx 스타일과 동일 톤). CSS 모듈 추가 없음.

## 4. "새 채팅" 동작

`NavBar` 안에서 `usePathname()`로 현재 경로를 확인:

- `pathname !== "/"` → `router.push("/")`
- `pathname === "/"` → `window.dispatchEvent(new CustomEvent("new-chat"))`

`ChatWindow`에 `useEffect`로 `new-chat` 이벤트 listener 등록:
```ts
useEffect(() => {
  const handler = () => setMessages([]);
  window.addEventListener("new-chat", handler);
  return () => window.removeEventListener("new-chat", handler);
}, []);
```

전역 상태 라이브러리 없이 가볍게 처리. ChatWindow는 한 페이지에 하나만 마운트되므로
중복 listener 우려 없음.

## 5. 바깥 클릭 닫기

드롭다운 열림 상태에서 바깥 클릭으로 닫기:
- `useEffect`로 document에 `mousedown` listener 부착
- 드롭다운 영역(`ref` 기반)을 클릭한 게 아니면 `open = false`
- 컴포넌트 언마운트/`open` 변경 시 cleanup

## 6. 비범위 (Out of scope)

- 다크모드, 모바일 사이드바, 키보드 단축키 등은 이번 작업 범위 아님.
- 현재 채팅을 자동 저장하거나 history 사이드바를 만드는 것도 범위 아님 (단순 초기화만).
