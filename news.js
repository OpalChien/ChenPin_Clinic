const newsList = document.querySelector("[data-news-list]");

if (newsList && window.ChengpinNews) {
  window.ChengpinNews.fetchPosts().then((posts) => {
    window.ChengpinNews.renderPosts(newsList, posts);
  });
}
