const loginPanel = document.querySelector("[data-login-panel]");
const editorPanel = document.querySelector("[data-editor-panel]");
const loginForm = document.querySelector("[data-login-form]");
const postForm = document.querySelector("[data-post-form]");
const loginMessage = document.querySelector("[data-login-message]");
const postMessage = document.querySelector("[data-post-message]");
const imageInput = postForm?.querySelector('input[name="image"]');
const imagePreview = document.querySelector("[data-image-preview]");
const logoutButton = document.querySelector("[data-logout]");

let activePassword = "";

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

const setEditorVisible = (visible) => {
  if (!loginPanel || !editorPanel) return;
  loginPanel.hidden = visible;
  editorPanel.hidden = !visible;
  if (visible && postForm) {
    postForm.date.value = new Date().toISOString().slice(0, 10);
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
  setEditorVisible(false);
});

imageInput?.addEventListener("change", async () => {
  if (!imageInput.files?.[0] || !imagePreview) {
    imagePreview.hidden = true;
    return;
  }

  const previewUrl = await resizeImageToDataUrl(imageInput.files[0]);
  imagePreview.innerHTML = `<img src="${previewUrl}" alt="圖片預覽" />`;
  imagePreview.hidden = false;
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
  const payload = {
    password: activePassword,
    title: formData.get("title"),
    date: formData.get("date"),
    content: formData.get("content"),
    imageName: imageFile?.name || "",
    imageDataUrl
  };

  postMessage.textContent = "正在發布...";
  const result = await window.ChengpinNews.submitPost(payload);
  postForm.reset();
  postForm.date.value = new Date().toISOString().slice(0, 10);
  if (imagePreview) imagePreview.hidden = true;
  postMessage.textContent =
    result.mode === "cloud"
      ? "已發布到雲端，訪客可在最新資訊頁看到。"
      : result.mode === "local"
        ? "已先儲存在這台電腦的瀏覽器。部署雲端儲存後，訪客才會同步看到。"
        : "此預覽環境無法永久儲存，功能流程已完成。部署雲端儲存後即可正式發布。";
});
