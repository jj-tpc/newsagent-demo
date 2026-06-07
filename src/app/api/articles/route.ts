import { NextResponse } from "next/server";
import { articleStore } from "@/lib/articles/store";
import type { Article } from "@/lib/articles/types";

export async function GET() {
  return NextResponse.json(await articleStore.list());
}
export async function POST(req: Request) {
  const body = (await req.json()) as Article;
  if (!body.id || !body.title) {
    return NextResponse.json({ error: "id and title required" }, { status: 400 });
  }
  const created = await articleStore.create({
    ...{ images: [], tags: [], content: "", publishedDate: "" },
    ...body,
  });
  return NextResponse.json(created, { status: 201 });
}
