# 光陽團隊網站

從線上站複製下來的靜態版面，作為後續開發的基礎。

預覽網址：https://ken1130.github.io/house/

## 本機預覽

網站的路徑都是從網域根目錄開始，需要用伺服器開，不能直接雙擊 `index.html`。

```bash
python3 -m http.server 47821
```

然後開 http://localhost:47821

## 檔案

| 路徑 | 內容 |
|---|---|
| `index.html`、`styles.css`、`script.js`、`hero-video.js` | 首頁 |
| `hero-videos.json`、`assets/hero-videos/` | 首頁輪播影片 |
| `forms.html`、`forms.js` | 找房需求／售屋評估表單 |
| `recruit/` | 招募頁 |
| `assets/` | 圖片 |
| `tools/build-pages.py` | 產生 GitHub Pages 預覽版 |

## 預覽版怎麼發布

推送到 `main` 後，GitHub Actions 會自動執行 `tools/build-pages.py`，把結果放到 `gh-pages` 分支，GitHub Pages 從該分支發布。

GitHub Pages 的網址多一層 `/house/`，所以腳本會在發布用的複本裡把根路徑（例如 `/styles.css`）改成 `/house/styles.css`，並加上不給搜尋引擎收錄的標記。**原始檔不會被修改**，之後搬到自己的主機時直接用原始檔。

## 已知限制

- 表單送出會失敗：後端（`/api/leads`、`/api/recruit`）不在這個儲存庫裡，需要另外架設。
- 導覽列上多個入口顯示「內容規劃中」，尚未製作。
