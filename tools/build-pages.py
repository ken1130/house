#!/usr/bin/env python3
"""產生 GitHub Pages 預覽版。

原始檔的路徑都是從網域根目錄開始（例如 /styles.css），
但 GitHub Pages 的專案網址多一層 /house/，直接放上去會全部找不到檔案。
這支腳本把網站複製到輸出資料夾，並把根路徑加上前綴。
原始檔不會被修改，之後搬到自己的主機（網域根目錄）時直接用原始檔即可。

用法：python3 tools/build-pages.py [輸出資料夾] [前綴]
預設：_site /house
"""
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "_site").resolve()
BASE = (sys.argv[2] if len(sys.argv) > 2 else "/house").rstrip("/")

# 要發布的檔案與資料夾（docs/、tools/ 等不發布）
SITE = ["index.html", "forms.html", "forms.js", "script.js", "hero-video.js",
        "hero-videos.json", "styles.css", "favicon.svg", "assets", "recruit"]
TEXT = {".html", ".css", ".js", ".json"}

# 引號或 url( 之後緊接的根路徑：'/assets/…'、"/recruit/"、'/'、"/#about" 等
ROOT_PATH = re.compile(
    r"""(["'`(])/(?=(?:assets/|recruit|forms\.|styles\.css|script\.js|hero-video|favicon\.svg|api/|#|["'`]))"""
)
NOINDEX = '<meta name="robots" content="noindex,nofollow">'

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)

for name in SITE:
    src = ROOT / name
    if src.is_dir():
        shutil.copytree(src, OUT / name)
    else:
        shutil.copy2(src, OUT / name)

changed = 0
for path in OUT.rglob("*"):
    if not path.is_file() or path.suffix not in TEXT:
        continue
    text = path.read_text(encoding="utf-8")
    new, n = ROOT_PATH.subn(lambda m: f"{m.group(1)}{BASE}/", text)
    if path.suffix == ".html" and NOINDEX not in new:
        # 預覽版不給搜尋引擎收錄，避免和正式站重複
        new = new.replace("<head>", "<head>" + NOINDEX, 1)
    if new != text:
        path.write_text(new, encoding="utf-8")
    changed += n
    print(f"{path.relative_to(OUT)}: {n} 處")

(OUT / ".nojekyll").touch()
print(f"完成：{OUT}（前綴 {BASE}，共改寫 {changed} 處）")
