export function SearchingIndicator({ query }: { query: string }) {
  return <div style={{ fontSize: 13, color: "#2563eb" }}>🔎 다음의 검색어로 찾아보고 있습니다: <b>{query}</b></div>;
}
