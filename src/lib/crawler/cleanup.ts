import OpenAI from "openai";

export type Cleaned = { content: string; tags: string[] };

const CLEANUP_SCHEMA = {
  type: "object",
  properties: {
    content: { type: "string", description: "정리된 본문 텍스트" },
    tags: {
      type: "array",
      items: { type: "string" },
      minItems: 4,
      maxItems: 6,
    },
  },
  required: ["content", "tags"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT_TEMPLATE = (keyword: string) =>
  "너는 신문 기사 정리 도우미다. 사용자가 제공한 기사 본문에서 " +
  "본문 텍스트만 깔끔하게 정리해라. **요약하지 말고, 제목을 만들지 말고, " +
  "기사 내용 자체를 보존**한다. 광고/구독 안내/'저작권자 ⓒ' 같은 보일러플레이트는 제거하고, " +
  "줄바꿈은 자연스러운 단락 단위로 정리한다. " +
  "그리고 본문을 보고 한국어 태그 4-6개를 뽑아라. " +
  `검색 키워드 '${keyword}' 자체는 태그에 포함하지 말 것.`;

let cached: OpenAI | null = null;
function client(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  cached = new OpenAI({ apiKey });
  return cached;
}

export async function cleanupArticle(
  bodyText: string,
  keyword: string,
  model: string,
): Promise<Cleaned> {
  const res = await client().chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT_TEMPLATE(keyword) },
      { role: "user", content: `기사 본문:\n\n${bodyText}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "article_cleanup", schema: CLEANUP_SCHEMA, strict: true },
    },
  });
  const raw = res.choices[0].message.content;
  if (!raw) throw new Error("OpenAI returned empty response");
  return JSON.parse(raw) as Cleaned;
}
