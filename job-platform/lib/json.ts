export function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? []);
  } catch {
    return "[]";
  }
}

export function normalizeList(input: string): string[] {
  return input
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
