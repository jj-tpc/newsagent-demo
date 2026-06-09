"use client";
import React, { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ImageLightbox, type LightboxImage } from "./ImageLightbox";
import { stripEmoji } from "@/lib/chat/strip-emoji";

// 처리 흐름:
//  1) 입력 텍스트에서 이모지를 제거
//  2) ![캡션](파일명) 토큰을 뽑아내고, 연속 이미지는 <Gallery>로 묶음
//  3) 나머지 텍스트 블록은 react-markdown으로 렌더 (## 제목 / **bold** / 목록 등)
//  4) 모든 이미지는 클릭 시 ImageLightbox로 확대

type ImageNode = LightboxImage;
type Block =
  | { kind: "text"; text: string }
  | { kind: "gallery"; images: ImageNode[] };

const IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
// LLM이 종종 강조 기호 안쪽에 공백을 넣어 `** 굵게 **`로 출력하는데,
// CommonMark는 여는 `**` 뒤·닫는 `**` 앞에 공백이 있으면 강조로 보지 않는다.
// 짝이 맞는 `**…**` 안쪽 공백만 다듬어 정상 볼드로 복원한다.
const SPACED_STRONG_RE = /\*\*([^*]+?)\*\*/g;

function normalizeStrong(s: string): string {
  return s.replace(SPACED_STRONG_RE, (whole, inner: string) => {
    const trimmed = inner.trim();
    return trimmed ? `**${trimmed}**` : whole;
  });
}

function resolveSrc(file: string): string {
  if (file.startsWith("http")) return file;
  return `/api/images/${file.split("/").pop()}`;
}

function parseBlocks(raw: string): Block[] {
  const text = normalizeStrong(stripEmoji(raw));
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

const MD_COMPONENTS: Components = {
  // 페이지에 이미 sr-only <h1>이 있으므로 답변 안의 마크다운 헤딩은 한 단계 내려서 렌더
  h1: (props) => <h2 className="md-h2" {...props} />,
  h2: (props) => <h2 className="md-h2" {...props} />,
  h3: (props) => <h3 className="md-h3" {...props} />,
  h4: (props) => <h4 className="md-h4" {...props} />,
  p: (props) => <p className="md-p" {...props} />,
  ul: (props) => <ul className="md-ul" {...props} />,
  ol: (props) => <ol className="md-ol" {...props} />,
  li: (props) => <li className="md-li" {...props} />,
  strong: (props) => <strong className="emph" {...props} />,
  em: (props) => <em className="md-em" {...props} />,
  del: (props) => <del className="md-del" {...props} />,
  blockquote: (props) => <blockquote className="md-blockquote" {...props} />,
  code: (props) => <code className="md-code" {...props} />,
  table: (props) => (
    <div className="md-table-wrap">
      <table className="md-table" {...props} />
    </div>
  ),
  th: (props) => <th className="md-th" {...props} />,
  td: (props) => <td className="md-td" {...props} />,
  a: ({ href, ...rest }) => (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...rest}
    />
  ),
};

export function InlineMarkdown({ text }: { text: string }) {
  const [lightbox, setLightbox] = useState<ImageNode | null>(null);
  const blocks = parseBlocks(text);

  return (
    <>
      <div className="md-body">
        {blocks.map((b, i) => {
          if (b.kind === "text") {
            return (
              <ReactMarkdown key={i} components={MD_COMPONENTS} remarkPlugins={[remarkGfm]}>
                {b.text}
              </ReactMarkdown>
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
