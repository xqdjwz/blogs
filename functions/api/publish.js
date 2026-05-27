export async function onRequestPost(context) {
  const { request, env } = context;
  const authHeader = request.headers.get("Authorization");

  if (authHeader !== env.ADMIN_PASSWORD) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { title, id, content, date, summary } = await request.json();
    const token = env.GITHUB_TOKEN;
    const repoOwner = env.REPO_OWNER;
    const repoName = env.REPO_NAME;

    // 1. 提交 Markdown 教程内容
    const mdUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/posts/${id}.md`;
    let mdSha = "";
    
    // 检查文件是否已存在以获取 sha
    const mdCheck = await fetch(mdUrl, { headers: { "Authorization": `token ${token}`, "User-Agent": "CF-Pages" } });
    if (mdCheck.ok) {
      const data = await mdCheck.json();
      mdSha = data.sha;
    }

    const commitMd = await fetch(mdUrl, {
      method: "PUT",
      headers: { "Authorization": `token ${token}`, "Content-Type": "application/json", "User-Agent": "CF-Pages" },
      body: JSON.stringify({
        message: `Publish post: ${title}`,
        content: btoa(unescape(encodeURIComponent(content))),
        sha: mdSha || undefined
      })
    });

    if (!commitMd.ok) {
      return new Response("提交 Markdown 失败", { status: 500 });
    }

    // 2. 读取、更新并提交 posts-list.json
    const jsonUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/posts-list.json`;
    let jsonSha = "";
    let postsList = [];

    const jsonCheck = await fetch(jsonUrl, { headers: { "Authorization": `token ${token}`, "User-Agent": "CF-Pages" } });
    if (jsonCheck.ok) {
      const data = await jsonCheck.json();
      jsonSha = data.sha;
      // 解码原 json
      const decodedJson = decodeURIComponent(escape(atob(data.content)));
      postsList = JSON.parse(decodedJson);
    }

    // 移除旧的同名记录（更新时），并追加新记录到最前面
    postsList = postsList.filter(p => p.id !== id);
    postsList.unshift({ id, title, date, summary });

    const commitJson = await fetch(jsonUrl, {
      method: "PUT",
      headers: { "Authorization": `token ${token}`, "Content-Type": "application/json", "User-Agent": "CF-Pages" },
      body: JSON.stringify({
        message: `Update posts-list.json for: ${title}`,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(postsList, null, 2)))),
        sha: jsonSha || undefined
      })
    });

    if (!commitJson.ok) {
      return new Response("更新 posts-list.json 失败", { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
