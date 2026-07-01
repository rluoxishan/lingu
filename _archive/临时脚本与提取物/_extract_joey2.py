# -*- coding: utf-8 -*-
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
p = Path(r"d:/LINGUSET/云平台-机器人通信协议-内部标准版.docx")
out = Path(r"d:/LINGUSET/_joey_comments.txt")

lines = []
with zipfile.ZipFile(p) as z:
    if "word/comments.xml" in z.namelist():
        root = ET.fromstring(z.read("word/comments.xml"))
        for c in root.iter(f"{W}comment"):
            author = c.get(f"{W}author", "")
            texts = "".join(t.text or "" for t in c.iter(f"{W}t"))
            cid = c.get(f"{W}id", "")
            lines.append(f"[{cid}] {author}: {texts}")

out.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {len(lines)} comments to {out}")
