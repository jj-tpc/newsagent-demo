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
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      borderBottom: "1px solid #eee",
    }}>
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          aria-label="메뉴 열기"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            fontSize: 20,
            lineHeight: 1,
            padding: "4px 10px",
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ☰
        </button>
        {open && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              minWidth: 140,
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              padding: 4,
              zIndex: 10,
            }}
          >
            {ITEMS.map((it) => (
              <button
                key={it.href}
                role="menuitem"
                type="button"
                onClick={() => go(it.href)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  border: "none",
                  background: pathname === it.href ? "#f3f4f6" : "transparent",
                  borderRadius: 4,
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onNewChat}
        style={{
          padding: "6px 12px",
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#fff",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        새 채팅
      </button>
    </nav>
  );
}
