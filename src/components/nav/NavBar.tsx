"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Item = { href: string; label: string };

const ITEMS: Item[] = [
  { href: "/", label: "Chat" },
  { href: "/admin", label: "Admin" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 외부 클릭으로 닫기
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // 열릴 때 현재 라우트로 active index 맞추고 첫 아이템에 포커스
  useEffect(() => {
    if (!open) return;
    const cur = ITEMS.findIndex((it) => it.href === pathname);
    const idx = cur >= 0 ? cur : 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 메뉴 오픈 시점에 현재 라우트로 활성 인덱스 초기화
    setActiveIndex(idx);
    requestAnimationFrame(() => itemRefs.current[idx]?.focus());
  }, [open, pathname]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onNewChat() {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("new-chat"));
    } else {
      router.push("/");
    }
  }

  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (activeIndex + 1) % ITEMS.length;
      setActiveIndex(next);
      itemRefs.current[next]?.focus();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = (activeIndex - 1 + ITEMS.length) % ITEMS.length;
      setActiveIndex(next);
      itemRefs.current[next]?.focus();
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      itemRefs.current[0]?.focus();
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      const last = ITEMS.length - 1;
      setActiveIndex(last);
      itemRefs.current[last]?.focus();
    }
  }

  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      if (!open) {
        e.preventDefault();
        setOpen(true);
      }
    }
  }

  return (
    <nav
      aria-label="주 메뉴"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-md)",
        padding: "var(--space-sm) var(--space-md)",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          ref={triggerRef}
          type="button"
          className="btn btn--ghost btn--icon"
          aria-label="메뉴 열기"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="primary-menu"
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onTriggerKey}
          style={{ fontSize: 20, lineHeight: 1 }}
        >
          ☰
        </button>
        {open && (
          <div
            id="primary-menu"
            role="menu"
            aria-label="페이지 이동"
            onKeyDown={onMenuKey}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              minWidth: 160,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
              padding: "var(--space-2xs)",
              zIndex: 10,
            }}
          >
            {ITEMS.map((it, i) => {
              const isCurrent = pathname === it.href;
              return (
                <button
                  key={it.href}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  role="menuitem"
                  type="button"
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={() => go(it.href)}
                  tabIndex={i === activeIndex ? 0 : -1}
                  style={{
                    display: "block",
                    width: "100%",
                    minHeight: 44,
                    textAlign: "left",
                    padding: "0 var(--space-sm)",
                    border: "none",
                    background: isCurrent ? "var(--surface-2)" : "transparent",
                    color: "var(--text)",
                    fontWeight: isCurrent ? 700 : 400,
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  {it.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button type="button" className="btn" onClick={onNewChat}>
        새 채팅
      </button>
    </nav>
  );
}
