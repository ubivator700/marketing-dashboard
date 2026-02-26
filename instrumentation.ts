/* ─────────────────────────────────────────────────────────────────
   Next.js Instrumentation — runs ONCE when the server starts.
   Automatically checks & migrates the MySQL database schema.
   ───────────────────────────────────────────────────────────────── */

export async function register() {
  // Only run on the Node.js server runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runAutoMigrate } = await import("@/lib/auto-migrate");
    try {
      await runAutoMigrate();
    } catch (err) {
      console.error("[instrumentation] Auto-migrate failed, server will continue:", err);
      // Don't throw — let the server start even if migration fails.
      // API routes will fail with DB errors, which is more debuggable.
    }
  }
}
