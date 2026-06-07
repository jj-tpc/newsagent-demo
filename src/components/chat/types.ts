import type { ChatSource } from "@/lib/chat/orchestrator";
export interface UiMessage {
  role: "user" | "assistant";
  text: string;
  polishedQuery?: string;
  sources?: ChatSource[];
}
