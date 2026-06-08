#!/usr/bin/env node
/**
 * 로컬 data/articles/ 디렉토리의 기사 JSON + 이미지를 Vercel Blob에 일괄 업로드.
 *
 * 사용:
 *   1) Vercel 대시보드 → 프로젝트 → Storage → Blob → token 복사
 *   2) 아래처럼 환경변수로 토큰 주고 실행
 *
 *      Windows PowerShell:
 *        $env:BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_..."
 *        node scripts/upload-articles.mjs
 *
 *      Mac/Linux:
 *        BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..." node scripts/upload-articles.mjs
 *
 *   3) 옵션:
 *      --dry-run             실제 업로드 안 함, 어떤 파일을 올릴지만 출력
 *      --skip-existing       Blob에 이미 같은 key가 있으면 그 파일은 건너뜀
 *      --only=<glob>         특정 패턴 (예: --only="2026-001*.json")
 */

import { put, head } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const articlesDir = path.join(root, "data", "articles");
const imagesDir = path.join(articlesDir, "images");

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) {
  console.error("ERROR: BLOB_READ_WRITE_TOKEN 환경변수가 필요합니다.");
  console.error("       Vercel 대시보드 → 프로젝트 → Storage → Blob 에서 token을 받아 설정하세요.");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipExisting = args.includes("--skip-existing");
const onlyArg = args.find((a) => a.startsWith("--only="));
const onlyPattern = onlyArg ? onlyArg.slice("--only=".length) : null;

function matchesOnly(name) {
  if (!onlyPattern) return true;
  // 매우 단순한 glob — *만 지원
  const re = new RegExp("^" + onlyPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
  return re.test(name);
}

const TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

async function blobExists(key) {
  try {
    await head(key, { token: TOKEN });
    return true;
  } catch (e) {
    if ((e?.name ?? "") === "BlobNotFoundError" || /not found/i.test(e?.message ?? "")) return false;
    throw e;
  }
}

async function uploadOne(key, data, contentType) {
  if (dryRun) {
    console.log(`  [dry-run] ${key}  (${data.byteLength} bytes, ${contentType})`);
    return;
  }
  if (skipExisting && (await blobExists(key))) {
    console.log(`  [skip-existing] ${key}`);
    return;
  }
  await put(key, data, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    cacheControlMaxAge: 60,
    token: TOKEN,
  });
  console.log(`  ✓ ${key}  (${data.byteLength} bytes)`);
}

async function main() {
  console.log(`업로드 대상 디렉토리: ${articlesDir}`);
  if (dryRun) console.log("[dry-run 모드] 실제 업로드 안 함");
  if (skipExisting) console.log("[skip-existing 모드] 이미 있는 키는 건너뜀");
  if (onlyPattern) console.log(`[only] '${onlyPattern}' 패턴만`);

  let articlesUploaded = 0;
  let imagesUploaded = 0;
  let skipped = 0;
  let failed = 0;

  // 1. 기사 JSON
  console.log("\n=== 기사 JSON ===");
  let jsonFiles;
  try {
    jsonFiles = (await fs.readdir(articlesDir))
      .filter((n) => n.endsWith(".json"))
      .filter(matchesOnly)
      .sort();
  } catch (e) {
    console.error(`articles 디렉토리 읽기 실패: ${e.message}`);
    process.exit(1);
  }
  if (jsonFiles.length === 0) {
    console.log("(없음)");
  }
  for (const f of jsonFiles) {
    const key = `articles/${f}`;
    try {
      const buf = await fs.readFile(path.join(articlesDir, f));
      await uploadOne(key, buf, "application/json");
      articlesUploaded += 1;
    } catch (e) {
      console.error(`  ✗ ${key}  ERROR: ${e.message}`);
      failed += 1;
    }
  }

  // 2. 이미지
  console.log("\n=== 이미지 ===");
  let imageFiles = [];
  try {
    imageFiles = (await fs.readdir(imagesDir))
      .filter((n) => n !== ".gitkeep")
      .filter(matchesOnly)
      .sort();
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    console.log("(images 디렉토리 없음 — skip)");
  }
  if (imageFiles.length === 0) {
    console.log("(없음)");
  }
  for (const f of imageFiles) {
    const key = `articles/images/${f}`;
    try {
      const buf = await fs.readFile(path.join(imagesDir, f));
      const ext = path.extname(f).toLowerCase();
      const ct = TYPES[ext] ?? "application/octet-stream";
      await uploadOne(key, buf, ct);
      imagesUploaded += 1;
    } catch (e) {
      console.error(`  ✗ ${key}  ERROR: ${e.message}`);
      failed += 1;
    }
  }

  console.log("\n=== 요약 ===");
  console.log(`기사: ${articlesUploaded}건 업로드, 이미지: ${imagesUploaded}장`);
  if (skipped > 0) console.log(`스킵: ${skipped}`);
  if (failed > 0) console.log(`실패: ${failed}`);
  if (dryRun) console.log("dry-run 모드 — 실제로는 아무것도 안 올라갔습니다.");
}

main().catch((e) => {
  console.error("\nFATAL:", e);
  process.exit(1);
});
