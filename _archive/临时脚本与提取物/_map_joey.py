# -*- coding: utf-8 -*-
"""Map Joey comments to anchored text in internal standard docx."""
import zipfile
import re
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

p = Path(r"d:/LINGUSET/云平台-机器人通信协议-内部标准版.docx")
out = Path(r"d:/LINGUSET/_joey_anchored.txt")

with zipfile.ZipFile(p) as z:
    doc_xml = z.read("word/document.xml")
    comments_xml = z.read("word/comments.xml") if "word/comments.xml" in z.namelist() else None

root = ET.fromstring(doc_xml)

# comment id -> text
comments = {}
if comments_xml:
    cr = ET.fromstring(comments_xml)
    for c in cr.iter(f"{W}comment"):
        cid = c.get(f"{W}id")
        author = c.get(f"{W}author", "")
        text = "".join(t.text or "" for t in c.iter(f"{W}t"))
        comments[cid] = (author, text)

lines = []
for p_el in root.iter(f"{W}p"):
    # collect paragraph text and comment refs
    texts = []
    refs = []
    for child in p_el.iter():
        tag = child.tag.split("}")[-1]
        if tag == "t" and child.text:
            texts.append(child.text)
        elif tag == "commentRangeStart":
            refs.append(("start", child.get(f"{W}id")))
        elif tag == "commentRangeEnd":
            refs.append(("end", child.get(f"{W}id")))
        elif tag == "commentReference":
            refs.append(("ref", child.get(f"{W}id")))
    para = "".join(texts).strip()
    if refs:
        for kind, cid in refs:
            author, ctext = comments.get(cid, ("?", "?"))
            lines.append(f"--- comment {cid} [{author}] on para ---")
            lines.append(f"  COMMENT: {ctext}")
            lines.append(f"  PARA: {para[:300]}")
            lines.append("")

# also dump highlighted paragraphs
for p_el in root.iter(f"{W}p"):
    texts = []
    yellow = False
    for r in p_el.iter(f"{W}r"):
        for shd in r.iter(f"{W}shd"):
            if shd.get(f"{W}fill") in ("FFF2CC", "FFFF00"):
                yellow = True
        for h in r.iter(f"{W}highlight"):
            if h.get(f"{W}val"):
                yellow = True
        for t in r.iter(f"{W}t"):
            if t.text:
                texts.append(t.text)
    para = "".join(texts).strip()
    if yellow and para:
        lines.append(f"YELLOW: {para[:200]}")

out.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {out}")
