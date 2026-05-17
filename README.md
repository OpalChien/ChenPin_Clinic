# 誠品診所網站

這是一個可上線的診所網站，包含電腦版、手機版、最新資訊頁與管理員新增文章頁。

## 本機預覽

若只要看前台，直接打開 `index.html` 即可預覽。若要用本機伺服器測試：

```powershell
python -m http.server 4173
```

然後開啟 `http://localhost:4173`。

## 最新資訊後台

- 公開頁：`news.html`
- 管理頁：`admin.html`
- 管理密碼不寫在 GitHub 程式碼裡，請放在 Vercel 的 `ADMIN_PASSWORD` 環境變數。

在一般本機預覽時，文章會存在目前這台電腦的瀏覽器 localStorage，方便先測流程。要讓所有網路訪客都看到新增文章，需要部署到 Vercel 並啟用雲端儲存。

## Vercel 免費上線建議

這個專案已包含 Vercel Function：`api/news.js`，可搭配 Vercel Blob 儲存最新資訊與圖片。

1. 建立 Vercel 專案並上傳這個資料夾，或連接 GitHub repo。
2. 在 Vercel 專案建立 Blob store。Vercel 會自動建立 `BLOB_READ_WRITE_TOKEN` 環境變數。
3. 在 Vercel Project Settings > Environment Variables 新增 `ADMIN_PASSWORD`，值設定為您要使用的後台密碼。
4. Redeploy 後開啟：
   - 前台：網站首頁
   - 最新資訊：`/news`
   - 管理頁：`/admin`

正式公開後建議使用不等於電話號碼的強密碼。

## 其他上線方式

1. Netlify Drop：最快得到公開網址，但若要雲端後台需另外接 Netlify Functions 或 CMS。
2. Cloudflare Pages：可上傳靜態檔，後台資料需接 Workers、D1 或 R2。
3. GitHub Pages：適合靜態網站，不適合直接做密碼後台與圖片上傳。

正式上線前建議補齊：

- 診所實拍照片與醫師照片
- Line 官方帳號或線上預約網址
- 正式網域，例如 `chengpinclinic.com.tw`
- Google 商家評論連結
- 隱私權政策頁面與表單後端
