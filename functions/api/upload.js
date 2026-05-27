export async function onRequestPost(context) {
  const { request, env } = context;
  
  // 简易密码验证（防止他人恶意往您的 R2 传图）
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== env.ADMIN_PASSWORD) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return new Response('No file uploaded', { status: 400 });
    }

    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;

    // 写入绑定的 R2 存储桶
    await env.MY_BUCKET.put(fileName, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    const imageUrl = `https://${env.R2_CUSTOM_DOMAIN}/${fileName}`;
    return new Response(JSON.stringify({ url: imageUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
