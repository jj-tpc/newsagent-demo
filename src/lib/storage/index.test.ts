import { it, expect, afterEach, beforeEach } from "vitest";
import { shouldUseBlob } from "./index";

const SAVED = {
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  BLOB_STORE_ID: process.env.BLOB_STORE_ID,
  VERCEL: process.env.VERCEL,
};

beforeEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL;
});

afterEach(() => {
  for (const [k, v] of Object.entries(SAVED)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

it("uses Blob when an explicit read-write token is present", () => {
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_xxx";
  expect(shouldUseBlob()).toBe(true);
});

it("uses Blob in the managed/OIDC case: Vercel runtime + BLOB_STORE_ID, no explicit token", () => {
  process.env.VERCEL = "1";
  process.env.BLOB_STORE_ID = "store_xxx";
  expect(shouldUseBlob()).toBe(true);
});

it("does NOT use Blob when BLOB_STORE_ID exists but not on Vercel (local dev)", () => {
  process.env.BLOB_STORE_ID = "store_xxx";
  expect(shouldUseBlob()).toBe(false);
});

it("does NOT use Blob when on Vercel but no store id and no token", () => {
  process.env.VERCEL = "1";
  expect(shouldUseBlob()).toBe(false);
});

it("falls back to local disk when nothing is configured", () => {
  expect(shouldUseBlob()).toBe(false);
});
