# 使用 Cloudflare R2 打造极速、免费的个人图床

在数字写作和搭建教程博客的过程中，一个稳定、快速且低成本的**图床（图片存储服务器）**是必不可少的。今天我们将介绍如何利用 **Cloudflare R2** 搭建一个完全免费的个人图床。

## 为什么选择 Cloudflare R2？

1. **极其慷慨的免费额度**：每月 **10 GB** 免费存储空间，且**不限流量**（不收外发流量费 Egress Fee）。
2. **全球 CDN 加速**：得益于 Cloudflare 的边缘网络，图片在世界各地的加载速度都极快。
3. **支持自定义域名**：可以绑定自己的个性化域名，防止图床链接因平台跑路而失效。

---

## 快速配置步骤

### 1. 创建 R2 存储桶
登录您的 Cloudflare 控制台，点击左侧菜单的 **R2**，点击 **Create bucket**，为其命名并保存。

### 2. 绑定自定义域名
进入刚创建的存储桶，选择 **Settings** 选项卡，在 **Public access** 下找到 **Custom Domains**，点击 **Connect Domain** 并绑定您的子域名（例如 `images.blogs.nyc.mn`）。

---

## 代码测试 (一键复制功能测试)

如果您需要在代码中读取 R2 中的图片，可以使用以下极简的 JavaScript 上传脚本进行测试：

```javascript
// 测试一键复制代码块
async function uploadToR2(file, bucketName) {
  const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/r2/buckets/${bucketName}/objects/${file.name}`;
  
  console.log("正在准备上传图片至 R2...");
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Authorization": "Bearer YOUR_API_TOKEN"
    }
  });

  if (response.ok) {
    console.log("图片上传成功！");
  } else {
    console.error("上传失败:", response.statusText);
  }
}


