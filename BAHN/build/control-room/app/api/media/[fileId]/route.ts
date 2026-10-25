export const runtime = "nodejs"

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", oga: "audio/ogg", ogg: "audio/ogg", mp3: "audio/mpeg",
  m4a: "audio/mp4", wav: "audio/wav", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", pdf: "application/pdf" }

// A photo, voice note, video or file a person sent on Telegram, fetched with the Bahn bot token on the server.
// The browser only ever sees /api/media/<file id>; the token never leaves this process.
export async function GET(_request: Request, context: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await context.params
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return Response.json({ error: "TELEGRAM_BOT_TOKEN is not set for the control room" }, { status: 503 })
  if (!/^[\w-]{10,200}$/.test(fileId)) return Response.json({ error: "bad file id" }, { status: 400 })
  const info = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null) as { ok?: boolean; result?: { file_path?: string } } | null
  if (!info?.ok || !info.result?.file_path) return Response.json({ error: "Telegram does not have this file any more" }, { status: 404 })
  const file = await fetch(`https://api.telegram.org/file/bot${token}/${info.result.file_path}`, { cache: "no-store" })
  if (!file.ok || !file.body) return Response.json({ error: "could not download the file" }, { status: 502 })
  const name = info.result.file_path.split("/").pop() ?? "file"
  // Telegram serves everything as octet-stream; the extension decides so the browser shows it instead of downloading.
  const type = TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream"
  return new Response(file.body, { headers: { "Content-Type": type, "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, max-age=3600" } })
}
