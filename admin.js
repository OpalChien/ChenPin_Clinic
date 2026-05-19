const loginPanel = document.querySelector("[data-login-panel]");
const editorPanel = document.querySelector("[data-editor-panel]");
const loginForm = document.querySelector("[data-login-form]");
const postForm = document.querySelector("[data-post-form]");
const loginMessage = document.querySelector("[data-login-message]");
const postMessage = document.querySelector("[data-post-message]");
const postList = document.querySelector("[data-post-list]");
const postListMessage = document.querySelector("[data-post-list-message]");
const refreshPostsButton = document.querySelector("[data-refresh-posts]");
const formMode = document.querySelector("[data-form-mode]");
const imageLabel = document.querySelector("[data-image-label]");
const submitText = document.querySelector("[data-submit-text]");
const imageInput = postForm?.querySelector('input[name="image"]');
const titleInput = postForm?.elements.namedItem("title");
const dateInput = postForm?.elements.namedItem("date");
const contentInput = postForm?.elements.namedItem("content");
const imagePreview = document.querySelector("[data-image-preview]");
const logoutButton = document.querySelector("[data-logout]");
const cancelEditButton = document.querySelector("[data-cancel-edit]");

let activePassword = "";
let editingPost = null;
let cachedPosts = [];

const today = () => new Date().toISOString().slice(0, 10);

const adminEscapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const adminDateLabel = (date) => {
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

const setFormMode = (mode) => {
  const isEditing = mode === "edit";
  if (formMode) formMode.textContent = isEditing ? "修改公告" : "新增公告";
  if (imageLabel) imageLabel.textContent = isEditing ? "更換圖片（選填）" : "上傳圖片";
  if (submitText) submitText.textContent = isEditing ? "儲存修改" : "發布文章";
  if (cancelEditButton) cancelEditButton.hidden = !isEditing;
};

const resetEditorForm = ({ clearMessage = true } = {}) => {
  editingPost = null;
  postForm?.reset();
  if (dateInput) dateInput.value = today();
  if (imagePreview) {
    imagePreview.hidden = true;
    imagePreview.innerHTML = "";
  }
  if (clearMessage && postMessage) postMessage.textContent = "";
  setFormMode("create");
};

const verifyPassword = async (password) => {
  try {
    const response = await fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password })
    });

    const contentType = response.headers.get("content-type") || "";
    if (response.status === 404 || !contentType.includes("application/json")) {
      return {
        ok: true,
        localOnly: true,
        message: "目前是本機展示模式；正式上線後會由 Vercel 驗證密碼。"
      };
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { ok: false, message: data.error || "密碼不正確，請再試一次。" };
    }

    return { ok: true };
  } catch {
    return {
      ok: true,
      localOnly: true,
      message: "目前是本機展示模式；正式上線後會由 Vercel 驗證密碼。"
    };
  }
};

const renderAdminPosts = (posts) => {
  if (!postList) return;

  const visiblePosts = posts
    .filter((post) => post.title && post.content)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  if (!visiblePosts.length) {
    postList.innerHTML = `<div class="empty-state">目前尚無公告。</div>`;
    return;
  }

  postList.innerHTML = visiblePosts
    .map((post) => {
      const excerpt = post.content.length > 52 ? `${post.content.slice(0, 52)}...` : post.content;

      return `
        <article class="admin-post-item">
          <div>
            <time datetime="${adminEscapeHtml(post.date)}">${adminEscapeHtml(adminDateLabel(post.date))}</time>
            <strong>${adminEscapeHtml(post.title)}</strong>
            <p>${adminEscapeHtml(excerpt)}</p>
          </div>
          <button class="button button-outline compact-button" type="button" data-edit-post="${adminEscapeHtml(post.id)}">
            <i data-lucide="pencil" aria-hidden="true"></i>
            修改
          </button>
        </article>
      `;
    })
    .join("");

  postList.querySelectorAll("[data-edit-post]").forEach((button) => {
    button.addEventListener("click", () => {
      const post = cachedPosts.find((item) => item.id === button.dataset.editPost);
      if (post) startEditingPost(post);
    });
  });

  if (window.lucide) window.lucide.createIcons();
};

const loadExistingPosts = async ({ silent = false } = {}) => {
  if (!window.ChengpinNews) return;
  if (postListMessage && !silent) postListMessage.textContent = "正在載入既有公告...";

  cachedPosts = await window.ChengpinNews.fetchPosts();
  renderAdminPosts(cachedPosts);

  if (postListMessage) {
    postListMessage.textContent = cachedPosts.length ? "" : "目前尚無公告。";
  }
};

const setEditorVisible = (visible) => {
  if (!loginPanel || !editorPanel) return;
  loginPanel.hidden = visible;
  editorPanel.hidden = !visible;
  if (visible) {
    resetEditorForm();
    loadExistingPosts();
  }
  if (window.lucide) window.lucide.createIcons();
};

const resizeImageToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("圖片讀取失敗"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("圖片格式無法使用"));
      image.onload = () => {
        const maxWidth = 1400;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

const startEditingPost = (post) => {
  if (!postForm) return;

  editingPost = post;
  if (titleInput) titleInput.value = post.title;
  if (dateInput) dateInput.value = post.date || today();
  if (contentInput) contentInput.value = post.content;
  if (imageInput) imageInput.value = "";

  if (imagePreview) {
    imagePreview.innerHTML = post.imageUrl
      ? `<img src="${adminEscapeHtml(post.imageUrl)}" alt="${adminEscapeHtml(post.title)}" />`
      : `<div class="image-preview-empty">此公告目前沒有圖片。</div>`;
    imagePreview.hidden = false;
  }

  setFormMode("edit");
  if (postMessage) postMessage.textContent = "正在修改既有公告，儲存後會覆蓋原內容。";
  postForm.scrollIntoView({ behavior: "smooth", block: "start" });
};

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = new FormData(loginForm).get("password");
  const result = await verifyPassword(password);

  if (!result.ok) {
    loginMessage.textContent = result.message;
    return;
  }

  activePassword = password;
  loginMessage.textContent = result.message || "";
  loginForm.reset();
  setEditorVisible(true);
});

logoutButton?.addEventListener("click", () => {
  activePassword = "";
  cachedPosts = [];
  setEditorVisible(false);
});

refreshPostsButton?.addEventListener("click", () => {
  loadExistingPosts();
});

cancelEditButton?.addEventListener("click", () => {
  resetEditorForm();
});

imageInput?.addEventListener("change", async () => {
  if (!imageInput.files?.[0] || !imagePreview) {
    imagePreview.hidden = true;
    return;
  }

  try {
    const previewUrl = await resizeImageToDataUrl(imageInput.files[0]);
    imagePreview.innerHTML = `<img src="${previewUrl}" alt="圖片預覽" />`;
    imagePreview.hidden = false;
  } catch (error) {
    imageInput.value = "";
    if (postMessage) postMessage.textContent = error.message;
  }
});

postForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!activePassword) {
    postMessage.textContent = "請重新登入後再發布。";
    setEditorVisible(false);
    return;
  }

  const formData = new FormData(postForm);
  const imageFile = imageInput?.files?.[0];
  const imageDataUrl = imageFile ? await resizeImageToDataUrl(imageFile) : "";
  const wasEditing = Boolean(editingPost);
  const payload = {
    password: activePassword,
    id: editingPost?.id,
    title: formData.get("title"),
    date: formData.get("date"),
    content: formData.get("content"),
    imageUrl: editingPost?.imageUrl || "",
    imageName: imageFile?.name || "",
    imageDataUrl
  };

  postMessage.textContent = wasEditing ? "正在儲存修改..." : "正在發布...";

  try {
    const result = wasEditing
      ? await window.ChengpinNews.updatePost(payload)
      : await window.ChengpinNews.submitPost(payload);

    await loadExistingPosts({ silent: true });
    resetEditorForm({ clearMessage: false });
    postMessage.textContent =
      result.mode === "cloud"
        ? wasEditing
          ? "已更新雲端公告，訪客可在最新資訊頁看到修改。"
          : "已發布到雲端，訪客可在最新資訊頁看到。"
        : result.mode === "local"
          ? wasEditing
            ? "已先在這台電腦的瀏覽器更新。部署雲端儲存後，訪客才會同步看到。"
            : "已先儲存在這台電腦的瀏覽器。部署雲端儲存後，訪客才會同步看到。"
          : "此預覽環境無法永久儲存，功能流程已完成。部署雲端儲存後即可正式使用。";
  } catch {
    postMessage.textContent = "儲存失敗，請稍後再試一次。";
  }
});
