import { list, put } from "@vercel/blob";

const DATA_PATH = "chengpin-clinic/news/posts.json";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const FALLBACK_POSTS = [
  {
    id: "welcome",
    title: "誠品診所網站第一版上線準備中",
    date: "2026-05-17",
    content:
      "最新門診公告、乳房健康衛教文章與診所活動訊息，之後都可以在這裡更新。正式上線後，管理員可登入後台新增標題、內容與圖片。",
    imageUrl: "/assets/chengpin-breast-health-hero.png",
    createdAt: "2026-05-17T00:00:00.000Z"
  }
];

const json = (body, init = {}) =>
  Response.json(body, {
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {})
    },
    status: init.status || 200
  });

const cleanPost = (post) => ({
  id: post.id || `post-${Date.now()}`,
  title: String(post.title || "").trim().slice(0, 80),
  date: post.date || new Date().toISOString().slice(0, 10),
  content: String(post.content || "").trim().slice(0, 1800),
  imageUrl: post.imageUrl || "",
  createdAt: post.createdAt || new Date().toISOString()
});

const hasCloudStorage = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const readPosts = async () => {
  if (!hasCloudStorage()) return FALLBACK_POSTS;

  const result = await list({ prefix: DATA_PATH, limit: 1 });
  const dataBlob = result.blobs.find((blob) => blob.pathname === DATA_PATH);
  if (!dataBlob) return FALLBACK_POSTS;

  const response = await fetch(`${dataBlob.url}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) return FALLBACK_POSTS;

  const posts = await response.json();
  return Array.isArray(posts) ? posts.map(cleanPost) : FALLBACK_POSTS;
};

const savePosts = async (posts) => {
  await put(DATA_PATH, JSON.stringify(posts.map(cleanPost), null, 2), {
    access: "public",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });
};

const uploadImage = async ({ imageDataUrl, imageName }) => {
  if (!imageDataUrl) return "";

  const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) return "";

  const [, contentType, base64] = match;
  const extension = contentType.split("/")[1].replace("jpeg", "jpg");
  const safeName = String(imageName || `news.${extension}`)
    .replace(/[^\w.-]+/g, "-")
    .slice(0, 80);
  const buffer = Buffer.from(base64, "base64");

  const blob = await put(`chengpin-clinic/news/images/${Date.now()}-${safeName}`, buffer, {
    access: "public",
    addRandomSuffix: true,
    cacheControlMaxAge: 31536000,
    contentType
  });

  return blob.url;
};

const validateAdmin = (password) => {
  if (!ADMIN_PASSWORD) {
    return {
      ok: false,
      response: json({ error: "尚未設定 ADMIN_PASSWORD 環境變數。" }, { status: 503 })
    };
  }

  if (password !== ADMIN_PASSWORD) {
    return {
      ok: false,
      response: json({ error: "密碼不正確。" }, { status: 401 })
    };
  }

  return { ok: true };
};

export async function GET() {
  const posts = await readPosts();
  return json({ posts });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const validation = validateAdmin(body.password);
  const action = String(body.action || "create").toLowerCase();

  if (!validation.ok) return validation.response;

  if (action === "login") {
    return json({ ok: true });
  }

  if (!["create", "update"].includes(action)) {
    return json({ error: "未知的操作。" }, { status: 400 });
  }

  if (!hasCloudStorage()) {
    return json({ error: "尚未設定 Vercel Blob，無法寫入雲端資料。" }, { status: 501 });
  }

  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();

  if (!title || !content) {
    return json({ error: "請填寫標題與內容。" }, { status: 400 });
  }

  const posts = await readPosts();

  if (action === "update") {
    const postId = String(body.id || "").trim();
    if (!postId) {
      return json({ error: "找不到要修改的公告。" }, { status: 400 });
    }

    const existing = posts.find((item) => item.id === postId);
    if (!existing) {
      return json({ error: "找不到要修改的公告。" }, { status: 404 });
    }

    const uploadedImageUrl = await uploadImage(body);
    const post = cleanPost({
      ...existing,
      title,
      date: body.date || existing.date || new Date().toISOString().slice(0, 10),
      content,
      imageUrl: uploadedImageUrl || existing.imageUrl
    });
    const nextPosts = posts.map((item) => (item.id === postId ? post : item));
    await savePosts(nextPosts);

    return json({ post, posts: nextPosts });
  }

  const imageUrl = await uploadImage(body);
  const post = cleanPost({
    id: `post-${Date.now()}`,
    title,
    date: body.date || new Date().toISOString().slice(0, 10),
    content,
    imageUrl,
    createdAt: new Date().toISOString()
  });

  const nextPosts = [post, ...posts.filter((item) => item.id !== "welcome")];
  await savePosts(nextPosts);

  return json({ post, posts: nextPosts });
}
