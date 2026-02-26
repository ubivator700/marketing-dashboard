// ─── In-memory temporary file store (TTL: 1 hour) ───────────────

interface StoredFile {
  buffer: Buffer;
  name: string;
  createdAt: number;
}

const store = new Map<string, StoredFile>();
const TTL = 60 * 60 * 1000; // 1 hour

// Cleanup expired files every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [id, file] of store) {
      if (now - file.createdAt > TTL) store.delete(id);
    }
  }, 10 * 60 * 1000);
}

function generateId(): string {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function storeFile(buffer: Buffer, name: string): string {
  const id = generateId();
  store.set(id, { buffer, name, createdAt: Date.now() });
  return id;
}

export function getFile(id: string): { buffer: Buffer; name: string } | null {
  const file = store.get(id);
  if (!file) return null;
  if (Date.now() - file.createdAt > TTL) {
    store.delete(id);
    return null;
  }
  return { buffer: file.buffer, name: file.name };
}
