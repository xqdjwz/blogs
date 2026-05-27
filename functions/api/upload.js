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

    await env.MY_BUCKET.put(fileName, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    return new Response(JSON.stringify({ url: `https://${env.R2_CUSTOM_DOMAIN}/${fileName}` }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
