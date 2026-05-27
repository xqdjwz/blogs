export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const postId = url.searchParams.get("id");

  if (!postId) return new Response("Missing id", { status: 400 });

  try {
    if (request.method === "POST") {
      // 增加阅读量（如果不存在则插入，存在则加 1）
      await env.DB.prepare(`
        INSERT INTO post_views (id, views) VALUES (?, 1)
        ON CONFLICT(id) DO UPDATE SET views = views + 1
      `).bind(postId).run();
    }

    // 获取当前阅读量
    const result = await env.DB.prepare("SELECT views FROM post_views WHERE id = ?").bind(postId).first();
    const views = result ? result.views : 0;

    return new Response(JSON.stringify({ views }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
