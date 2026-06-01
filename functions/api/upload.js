async function verifyPassword(password, env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM config WHERE key = 'admin_password'").first();
    if (row && row.value) return password === row.value;
  } catch (e) {}
  return password === env.ADMIN_PASSWORD;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const authHeader = request.headers.get("Authorization");

  if (!(await verifyPassword(authHeader, env))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image');
    if (!file) return new Response('No file', { status: 400 });

    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;

    // 将图片流写入 R2 存储桶
    await env.MY_BUCKET.put(fileName, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    // 1. 优先：从 D1 数据库中动态获取配置好的 R2 域名
    let r2Domain = "";
    try {
      const row = await env.DB.prepare("SELECT value FROM config WHERE key = 'site_r2_domain'").first();
      if (row && row.value) {
        r2Domain = row.value.trim();
      }
    } catch (dbErr) {
      // 数据库读取异常时保持为空，走下方的备用逻辑
    }

    // 2. 备选：如果 D1 中未读取到，则读取旧的 Cloudflare 环境变量
    if (!r2Domain && env.R2_CUSTOM_DOMAIN) {
      r2Domain = `https://${env.R2_CUSTOM_DOMAIN}`;
    }

    // 3. 兜底：如果都为空，则以当前 Pages 的域名作为备用地址
    if (!r2Domain) {
      const urlObj = new URL(request.url);
      r2Domain = urlObj.origin;
    }

    // 4. 安全格式化：确保域名协议完整，且末尾不带多余的斜杠 "/"
    if (r2Domain.endsWith('/')) {
      r2Domain = r2Domain.slice(0, -1);
    }
    if (!r2Domain.startsWith('http://') && !r2Domain.startsWith('https://')) {
      r2Domain = `https://${r2Domain}`;
    }

    // 5. 拼接最终图片公网访问 URL
    const finalUrl = `${r2Domain}/${fileName}`;

    return new Response(JSON.stringify({ url: finalUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
