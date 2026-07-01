# -*- coding: utf-8 -*-
import zipfile
import re
from pathlib import Path
from xml.etree import ElementTree as ET

BASE = Path(r"d:/LINGUSET")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

def extract_docx_text_with_highlights(path):
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    lines = []
    for p in root.iter(f"{W}p"):
        texts = []
        for t in p.iter(f"{W}t"):
            if t.text:
                texts.append(t.text)
        line = "".join(texts).strip()
        if line:
            # check highlight/shading on paragraph
            shd = None
            for shd_el in p.iter(f"{W}shd"):
                shd = shd_el.get(f"{W}fill")
            hl = None
            for r in p.iter(f"{W}r"):
                for h in r.iter(f"{W}highlight"):
                    hl = h.get(f"{W}val")
            lines.append((line, shd, hl))
    return lines

def extract_comments(path):
    with zipfile.ZipFile(path) as z:
        if "word/comments.xml" not in z.namelist():
            return []
        root = ET.fromstring(z.read("word/comments.xml"))
        out = []
        for c in root.iter(f"{W}comment"):
            cid = c.get(f"{W}id")
            author = c.get(f"{W}author", "")
            texts = []
            for t in c.iter(f"{W}t"):
                if t.text:
                    texts.append(t.text)
            out.append((cid, author, "".join(texts)))
        return out

for p in sorted(BASE.glob("*")):
    if "内部标准" in p.name:
        print("FILE:", p.name, p.stat().st_size)
        if p.suffix == ".docx":
            comments = extract_comments(p)
            print("  comments:", len(comments))
            for cid, author, text in comments:
                print(f"    [{author}] {text[:200]}")
            # yellow/highlight lines
            for line, shd, hl in extract_docx_text_with_highlights(p):
                if shd in ("FFF2CC", "FFFF00", "yellow") or hl:
                    print(f"  HIGHLIGHT: {line[:120]}")

md = BASE / "云平台-机器人通信协议-内部标准版.md"
if md.exists():
    text = md.read_text(encoding="utf-8")
    for kw in ["joey", "Joey", "JOEY", "【", "TODO", "FIXME", "删除", "修改", "补充"]:
        if kw.lower() in text.lower():
            print("MD contains:", kw)
    # show lines with brackets or unusual markers
    for i, line in enumerate(text.splitlines(), 1):
        if any(x in line for x in ["【", "】", "Joey", "joey", ">>", "<<", "TODO", "注：", "删除", "保留", "待定"]):
            if "Joey" in line or "joey" in line or "【" in line or "TODO" in line or "删除" in line or "待定" in line:
                print(f"  L{i}: {line[:150]}")
