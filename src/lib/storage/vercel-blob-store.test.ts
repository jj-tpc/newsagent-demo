import { it, expect, vi, beforeEach } from "vitest";
import { BlobNotFoundError } from "@vercel/blob";
import * as blob from "@vercel/blob";
import { VercelBlobFileStore } from "./vercel-blob-store";

vi.mock("@vercel/blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vercel/blob")>();
  return { ...actual, head: vi.fn(), del: vi.fn() };
});

beforeEach(() => {
  vi.mocked(blob.head).mockReset();
  vi.mocked(blob.del).mockReset();
});

it("readText returns null when the blob does not exist", async () => {
  // The SDK's head() throws BlobNotFoundError for a missing key.
  vi.mocked(blob.head).mockRejectedValue(new BlobNotFoundError());
  const store = new VercelBlobFileStore();
  await expect(store.readText("config/settings.json")).resolves.toBeNull();
});

it("readBuffer returns null when the blob does not exist", async () => {
  vi.mocked(blob.head).mockRejectedValue(new BlobNotFoundError());
  const store = new VercelBlobFileStore();
  await expect(store.readBuffer("images/missing.png")).resolves.toBeNull();
});

it("externalUrl returns null when the blob does not exist", async () => {
  vi.mocked(blob.head).mockRejectedValue(new BlobNotFoundError());
  const store = new VercelBlobFileStore();
  await expect(store.externalUrl("images/missing.png")).resolves.toBeNull();
});

it("delete swallows BlobNotFoundError", async () => {
  vi.mocked(blob.del).mockRejectedValue(new BlobNotFoundError());
  const store = new VercelBlobFileStore();
  await expect(store.delete("config/settings.json")).resolves.toBeUndefined();
});

it("readText still rethrows non-not-found errors", async () => {
  vi.mocked(blob.head).mockRejectedValue(new Error("Vercel Blob: This store has been suspended."));
  const store = new VercelBlobFileStore();
  await expect(store.readText("config/settings.json")).rejects.toThrow(/suspended/);
});
