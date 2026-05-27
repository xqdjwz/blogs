export async function onRequestPost(context) {
  const { request, env } = context;
  const authHeader = request.headers.get("Authorization");

  if (authHeader !== env.ADMIN_PASSWORD) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await request.json();
    const token = env.GITHUB_TOKEN;
    const repoOwner = env.REPO_OWNER;
    const repoName = env.REPO_NAME;

    // 1. 删除文章的 .md 文件
    const mdUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/posts/${id}.md`;
    let mdSha = "";
    
    // 获取文件的 sha 值以用于删除
    const mdCheck = await fetch(mdUrl, { headers: { "Authorization": `token ${token}`, "User-Agent": "CF-Pages" } });
    if (mdCheck.ok) {
      const data = await mdCheck.json();
      mdSha = data.sha;
    }

    if (mdSha) {
      const deleteMd = await fetch(mdUrl, {
        method: "DELETE",
        headers: { "Authorization": `token ${token}`, "Content-Type": "application/json", "User-Agent": "CF-Pages" },
        body: JSON.stringify({
          message: `Delete post: ${id}`,
          sha: mdSha
        })
      });
      if (!deleteMd.ok) return new Response("删除 Markdown 文件失败", { status: 500 });
    }

    // 2. 更新 posts-list.json 索引文件
    const jsonUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/posts-list.json`;
    let jsonSha = "";
    let postsList = [];

    const jsonCheck = await fetch(jsonUrl, { headers: { "Authorization": `token ${token}`, "User-Agent": "CF-Pages" } });
    if (jsonCheck.ok) {
      const data = await jsonCheck.json();
      jsonSha = data.sha;
      const decodedJson = decodeURIComponent(escape(atob(data.content)));
      postsList = JSON.parse(decodedJson);
    }

    // 从索引中移除该文章
    postsList = postsList.filter(p => p.id !== id);

    const commitJson = await fetch(jsonUrl, {
      method: "PUT",
      headers: { "Authorization": `token ${token}`, "Content-Type": "application/json", "User-Agent": "CF-Pages" },
      body: JSON.stringify({
        message: `Remove from index: ${id}`,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(postsList, null, 2)))),
        sha: jsonSha || undefined
      })
    });

    if (!commitJson.ok) return new Response("更新 posts-list.json 失败", { status: 500 });

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
