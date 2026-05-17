const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    const target = event.target.closest("a");
    if (!target) return;
    document.body.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.body.classList.remove("nav-open");
  navToggle?.setAttribute("aria-expanded", "false");
});

window.addEventListener("load", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

const latestPosts = document.querySelector("[data-latest-posts]");

if (latestPosts && window.ChengpinNews) {
  window.ChengpinNews.fetchPosts().then((posts) => {
    window.ChengpinNews.renderPosts(latestPosts, posts, {
      limit: Number(latestPosts.dataset.limit || 0) || undefined
    });
  });
}
