"use client";
import React, { useState } from "react";
import { ImageLightbox, type LightboxImage } from "./ImageLightbox";

// 마크다운 inline 처리:
//  - ![캡션](파일명) 패턴을 추출
//  - 연속된 이미지(중간에 공백/빈줄만)들은 하나의 <Gallery>로 묶음
//  - 그 외는 단락 텍스트로 렌더
//  - 이미지 클릭 → ImageLightbox 확대 보기

type ImageNode = LightboxImage;
type Block =
  | { kind: "text"; text: string }
  | { kind: "gallery"; images: ImageNode[] };

const IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

function resolveSrc(file: string): string {
  if (file.startsWith("http")) return file;
  return `/api/images/${file.split("/").pop()}`;
}

function parseBlocks(text: string): Block[] {
  type Token = { kind: "text"; text: string } | { kind: "img"; node: ImageNode };
  const tokens: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(IMG_RE)) {
    if (m.index! > last) tokens.push({ kind: "text", text: text.slice(last, m.index!) });
    tokens.push({ kind: "img", node: { caption: m[1], src: resolveSrc(m[2]) } });
    last = m.index! + m[0].length;
  }
  if (last < text.length) tokens.push({ kind: "text", text: text.slice(last) });

  const blocks: Block[] = [];
  let pendingGallery: ImageNode[] = [];
  let pendingText = "";

  const flushText = () => {
    if (pendingText) {
      blocks.push({ kind: "text", text: pendingText });
      pendingText = "";
    }
  };
  const flushGallery = () => {
    if (pendingGallery.length > 0) {
      blocks.push({ kind: "gallery", images: pendingGallery });
      pendingGallery = [];
    }
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.kind === "img") {
      flushText();
      pendingGallery.push(t.node);
    } else {
      const isOnlyWhitespace = /^[\s ]*$/.test(t.text);
      const isBetweenImages =
        pendingGallery.length > 0 &&
        i + 1 < tokens.length &&
        tokens[i + 1].kind === "img";
      if (isOnlyWhitespace && isBetweenImages) continue;
      flushGallery();
      pendingText += t.text;
    }
  }
  flushText();
  flushGallery();

  return blocks;
}

export function InlineMarkdown({ text }: { text: string }) {
  const [lightbox, setLightbox] = useState<ImageNode | null>(null);
  const blocks = parseBlocks(text);

  return (
    <>
      <div>
        {blocks.map((b, i) => {
          if (b.kind === "text") {
            return (
              <span key={i} style={{ whiteSpace: "pre-wrap" }}>
                {b.text}
              </span>
            );
          }
          return <Gallery key={i} images={b.images} onOpen={setLightbox} />;
        })}
      </div>
      <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}

const IMAGE_BUTTON_STYLE: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "zoom-in",
};

function ImageButton({
  image, onOpen, children,
}: {
  image: ImageNode;
  onOpen: (img: ImageNode) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      style={IMAGE_BUTTON_STYLE}
      onClick={() => onOpen(image)}
      aria-label={image.caption ? `${image.caption} 확대 보기` : "이미지 확대 보기"}
    >
      {children}
    </button>
  );
}

function Gallery({
  images, onOpen,
}: {
  images: ImageNode[];
  onOpen: (img: ImageNode) => void;
}) {
  const n = images.length;
  if (n === 1) {
    const img = images[0];
    return (
      <figure style={{ margin: "var(--space-sm) 0" }}>
        <ImageButton image={img} onOpen={onOpen}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.src}
            alt={img.caption}
            loading="lazy"
            style={{
              width: "100%",
              maxHeight: 360,
              objectFit: "cover",
              borderRadius: "var(--radius-md)",
              display: "block",
            }}
          />
        </ImageButton>
        {img.caption && (
          <figcaption
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              marginTop: "var(--space-2xs)",
            }}
          >
            {img.caption}
          </figcaption>
        )}
      </figure>
    );
  }
  const cols = n === 2 ? "1fr 1fr" : n === 3 ? "1fr 1fr 1fr" : "1fr 1fr";
  const aspect = n >= 4 ? "16 / 11" : "4 / 3";
  return (
    <div
      role="group"
      aria-label={`이미지 ${n}장`}
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: "var(--space-xs)",
        margin: "var(--space-sm) 0",
      }}
    >
      {images.map((img, i) => (
        <figure key={i} style={{ margin: 0 }}>
          <ImageButton image={img} onOpen={onOpen}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt={img.caption}
              loading="lazy"
              style={{
                width: "100%",
                aspectRatio: aspect,
                objectFit: "cover",
                borderRadius: "var(--radius-md)",
                display: "block",
              }}
            />
          </ImageButton>
          {img.caption && (
            <figcaption
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                marginTop: "var(--space-2xs)",
                lineHeight: 1.4,
              }}
            >
              {img.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
