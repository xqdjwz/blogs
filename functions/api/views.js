export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const postId = url.searchParams.get("id");

  if (!postId) return new Response("Missing id", { status: 400 });

  try {
    // 累加阅读量
    await env.DB.prepare("UPDATE posts SET views = views + 1 WHERE id = ?").bind(postId).run();
    // 查询并返回最新阅读量
    const result = await env.DB.prepare("SELECT views FROM posts WHERE id = ?").bind(postId).first();
    const views = result ? result.views : 0;

    return new Response(JSON.stringify({ views }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
