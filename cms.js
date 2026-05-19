const CP_STORAGE_KEY = "chengpinClinicPosts";
const CP_API_ENDPOINT = "/api/news";
const CP_DEFAULT_POSTS = [
  {
    id: "welcome",
    title: "誠品診所網站第一版上線準備中",
    date: "2026-05-17",
    content:
      "最新門診公告、乳房健康衛教文章與診所活動訊息，之後都可以在這裡更新。正式上線後，管理員可登入後台新增標題、內容與圖片。",
    imageUrl: "assets/chengpin-breast-health-hero.png"
  }
];
let cpMemoryPosts = [...CP_DEFAULT_POSTS];

const hasStorage = () => {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizePost = (post) => ({
  id: post.id || `post-${Date.now()}`,
  title: String(post.title || "").trim(),
  date: post.date || new Date().toISOString().slice(0, 10),
  content: String(post.content || "").trim(),
  imageUrl: post.imageUrl || "",
  createdAt: post.createdAt || new Date().toISOString()
});

const getLocalPosts = () => {
  if (!hasStorage()) return cpMemoryPosts;

  try {
    const raw = window.localStorage.getItem(CP_STORAGE_KEY);
    if (!raw) return CP_DEFAULT_POSTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed.map(normalizePost) : CP_DEFAULT_POSTS;
  } catch {
    return CP_DEFAULT_POSTS;
  }
};

const saveLocalPosts = (posts) => {
  const normalized = posts.map(normalizePost);
  cpMemoryPosts = normalized;
  if (!hasStorage()) return;

  try {
    window.localStorage.setItem(CP_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    cpMemoryPosts = normalized;
  }
};

const dateLabel = (date) => {
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
};

const renderPostCard = (post) => {
  const image = post.imageUrl
    ? `<img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(post.title)}" loading="lazy" />`
    : `<div class="post-image-placeholder"><i data-lucide="newspaper" aria-hidden="true"></i></div>`;

  return `
    <article class="post-card">
      <a href="news.html#${escapeHtml(post.id)}" aria-label="${escapeHtml(post.title)}">
        <div class="post-image">${image}</div>
        <div class="post-body">
          <time datetime="${escapeHtml(post.date)}">${escapeHtml(dateLabel(post.date))}</time>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.content).slice(0, 118)}${post.content.length > 118 ? "..." : ""}</p>
        </div>
      </a>
    </article>
  `;
};

const renderPosts = (container, posts, { limit } = {}) => {
  const normalized = posts
    .map(normalizePost)
    .filter((post) => post.title && post.content)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const visible = limit ? normalized.slice(0, Number(limit)) : normalized;

  if (!visible.length) {
    container.innerHTML = `<div class="empty-state">目前尚無最新資訊。</div>`;
    return;
  }

  container.innerHTML = visible.map(renderPostCard).join("");
  if (window.lucide) window.lucide.createIcons();
};

const fetchPosts = async () => {
  try {
    const response = await fetch(CP_API_ENDPOINT, { cache: "no-store" });
    if (!response.ok) throw new Error("No cloud news API");
    const data = await response.json();
    if (Array.isArray(data.posts)) return data.posts.map(normalizePost);
  } catch {
    return getLocalPosts();
  }

  return getLocalPosts();
};

const submitPost = async (payload) => {
  const post = normalizePost({
    id: `post-${Date.now()}`,
    title: payload.title,
    date: payload.date,
    content: payload.content,
    imageUrl: payload.imageDataUrl,
    createdAt: new Date().toISOString()
  });

  try {
    const response = await fetch(CP_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, action: "create" })
    });
    if (!response.ok) throw new Error("Cloud save failed");
    const data = await response.json();
    return { mode: "cloud", post: data.post };
  } catch {
    const posts = [post, ...getLocalPosts().filter((item) => item.id !== "welcome")];
    const mode = hasStorage() ? "local" : "memory";
    saveLocalPosts(posts);
    return { mode, post };
  }
};

const updatePost = async (payload) => {
  const posts = getLocalPosts();
  const existing = posts.find((item) => item.id === payload.id);
  const post = normalizePost({
    ...existing,
    id: payload.id,
    title: payload.title,
    date: payload.date,
    content: payload.content,
    imageUrl: payload.imageDataUrl || existing?.imageUrl || payload.imageUrl || "",
    createdAt: existing?.createdAt || new Date().toISOString()
  });

  try {
    const response = await fetch(CP_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, action: "update" })
    });
    if (!response.ok) throw new Error("Cloud update failed");
    const data = await response.json();
    return { mode: "cloud", post: data.post, posts: data.posts };
  } catch {
    const nextPosts = existing
      ? posts.map((item) => (item.id === post.id ? post : item))
      : [post, ...posts.filter((item) => item.id !== "welcome")];
    const mode = hasStorage() ? "local" : "memory";
    saveLocalPosts(nextPosts);
    return { mode, post, posts: nextPosts };
  }
};

window.ChengpinNews = {
  fetchPosts,
  renderPosts,
  submitPost,
  updatePost,
  getLocalPosts,
  saveLocalPosts,
  defaultPosts: CP_DEFAULT_POSTS
};
