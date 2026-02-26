import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { getFile } from "@/lib/chat/file-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { fileId } = await params;
  const file = getFile(fileId);

  if (!file) {
    return NextResponse.json({ error: "File not found or expired" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
      "Content-Length": String(file.buffer.length),
    },
  });
}
