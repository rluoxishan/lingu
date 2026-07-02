#!/usr/bin/env python3
"""Build protocol docx from markdown with table widths, heading outline, TOC, and fonts."""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

TABLE_WIDTH = 9360
FONT_LATIN = "Arial"
FONT_EAST_ASIA = "微软雅黑"
HEADING_NAMES = [("Heading 1", 0), ("Heading 2", 1), ("Heading 3", 2), ("Heading 4", 3)]


def run_md_to_docx(md_path: Path, out_docx: Path) -> None:
    subprocess.run(
        ["npx", "--yes", "@mohtasham/md-to-docx", str(md_path), str(out_docx)],
        check=True,
        shell=True,
    )


def para_text(block: str) -> str:
    text = re.sub(r"<w:tab[^/]*/>", " ", block)
    text = re.sub(r"<[^>]+>", "", block)
    return re.sub(r"\s+", " ", text).strip()


def set_para_style(block: str, style: str) -> str:
    block = re.sub(r'<w:pStyle w:val="[^"]+"\s*/>', "", block)
    if "<w:pPr>" in block:
        return block.replace("<w:pPr>", f'<w:pPr><w:pStyle w:val="{style}"/>', 1)
    return block.replace("<w:p>", f'<w:p><w:pPr><w:pStyle w:val="{style}"/></w:pPr>', 1)


def promote_heading_levels(xml: str) -> str:
    def fix_para(m: re.Match[str]) -> str:
        block = m.group(0)
        text = para_text(block)
        styles = re.findall(r'<w:pStyle w:val="([^"]+)"', block)
        style = styles[-1] if styles else None
        if not style or not text:
            return block
        if text == "目录":
            return block
        if style in {"Heading2", "2"} and (re.match(r"^\d+\s", text) or text.startswith("附录")):
            return set_para_style(block, "Heading1")
        if style in {"Heading3", "3"} and re.match(r"^\d+\.\d+(?:\s|$)", text):
            return set_para_style(block, "Heading2")
        if style in {"Heading4", "4"} and re.match(r"^\d+\.\d+\.\d+", text):
            return set_para_style(block, "Heading3")
        if style == "2":
            return set_para_style(block, "Heading2")
        if style == "3":
            return set_para_style(block, "Heading3")
        if style == "4":
            return set_para_style(block, "Heading4")
        return block

    return re.sub(r"<w:p>[\s\S]*?</w:p>", fix_para, xml)


def fix_table_widths(xml: str) -> str:
    def fix_tbl(block: str) -> str:
        grid_match = re.search(r"<w:tblGrid>([\s\S]*?)</w:tblGrid>", block)
        if not grid_match:
            return block
        col_count = len(re.findall(r"<w:gridCol", grid_match.group(1)))
        if col_count == 0:
            return block
        base = TABLE_WIDTH // col_count
        remainder = TABLE_WIDTH - base * col_count
        widths = [base + (1 if i < remainder else 0) for i in range(col_count)]
        fixed = re.sub(
            r"<w:tblGrid>[\s\S]*?</w:tblGrid>",
            "<w:tblGrid>" + "".join(f'<w:gridCol w:w="{w}"/>' for w in widths) + "</w:tblGrid>",
            block,
        )
        fixed = fixed.replace('<w:tblLayout w:type="autofit"/>', '<w:tblLayout w:type="fixed"/>')
        fixed = re.sub(
            r'<w:tblW w:w="0" w:type="auto"/>',
            f'<w:tblW w:w="{TABLE_WIDTH}" w:type="dxa"/>',
            fixed,
        )
        fixed = re.sub(
            r'<w:tblW w:type="dxa" w:w="9746"/>',
            f'<w:tblW w:w="{TABLE_WIDTH}" w:type="dxa"/>',
            fixed,
        )
        col_idx = 0

        def fix_cell(cell_block: str) -> str:
            nonlocal col_idx
            w = widths[col_idx % col_count]
            col_idx += 1
            if re.search(r"<w:tcW[^/]*/>", cell_block):
                return re.sub(r"<w:tcW[^/]*/>", f'<w:tcW w:w="{w}" w:type="dxa"/>', cell_block)
            if "<w:tcPr>" in cell_block:
                return cell_block.replace("<w:tcPr>", f'<w:tcPr><w:tcW w:w="{w}" w:type="dxa"/>', 1)
            return cell_block.replace("<w:tc>", f'<w:tc><w:tcPr><w:tcW w:w="{w}" w:type="dxa"/></w:tcPr>', 1)

        return re.sub(r"<w:tc>([\s\S]*?)</w:tc>", lambda m: fix_cell(m.group(0)), fixed)

    return re.sub(r"<w:tbl>([\s\S]*?)</w:tbl>", lambda m: fix_tbl(m.group(0)), xml)


def font_rpr_inner() -> str:
    return (
        f'<w:rFonts w:ascii="{FONT_LATIN}" w:hAnsi="{FONT_LATIN}" '
        f'w:eastAsia="{FONT_EAST_ASIA}" w:cs="{FONT_LATIN}"/>'
        '<w:sz w:val="24"/><w:szCs w:val="24"/>'
    )


def normalize_document_fonts(xml: str) -> str:
    fonts = (
        f'<w:rFonts w:ascii="{FONT_LATIN}" w:hAnsi="{FONT_LATIN}" '
        f'w:eastAsia="{FONT_EAST_ASIA}" w:cs="{FONT_LATIN}"/>'
    )

    def patch_run(m: re.Match[str]) -> str:
        block = m.group(0)
        if "instrText" in block or "fldChar" in block:
            return block
        if "<w:rPr>" in block:
            body = re.sub(r"<w:rFonts[^/]*/>", "", block)
            return body.replace("<w:rPr>", f"<w:rPr>{fonts}", 1)
        return block.replace("<w:r>", f"<w:r><w:rPr>{fonts}</w:rPr>", 1)

    return re.sub(r"<w:r>([\s\S]*?)</w:r>", patch_run, xml)


def toc_field_xml() -> str:
    fonts = (
        f'<w:rFonts w:ascii="{FONT_LATIN}" w:hAnsi="{FONT_LATIN}" '
        f'w:eastAsia="{FONT_EAST_ASIA}" w:cs="{FONT_LATIN}"/>'
    )
    return (
        '<w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>'
        f'<w:r><w:rPr>{fonts}<w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>'
        '<w:t>目录</w:t></w:r></w:p>'
        '<w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr>'
        '<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>'
        '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r>'
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
        f'<w:r><w:rPr>{fonts}</w:rPr>'
        '<w:t>（打开文档时将自动生成；若仍为空，请 Ctrl+A 后按 F9 更新域）</w:t></w:r>'
        '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'
        '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
    )


def insert_toc(xml: str) -> str:
    xml = re.sub(r"<w:instrText[^>]*>[\s\S]*?TOC[\s\S]*?</w:instrText>", "", xml)
    xml = re.sub(r"<w:fldChar[^>]*/>", "", xml)
    first_section = re.search(
        r'<w:p>[\s\S]*?<w:t[^>]*>1 编写目的</w:t>[\s\S]*?</w:p>',
        xml,
    )
    if not first_section:
        return xml
    return xml[: first_section.start()] + toc_field_xml() + xml[first_section.start() :]


def ensure_outline_levels(styles_xml: str) -> str:
    for name, lvl in HEADING_NAMES:
        pattern = rf"(<w:style[^>]*>)([\s\S]*?<w:name w:val=\"{name}\"[\s\S]*?)(</w:style>)"

        def add_outline(m: re.Match[str], level: int = lvl) -> str:
            body = m.group(2)
            if "outlineLvl" in body:
                return m.group(0)
            if "<w:pPr>" in body:
                body = body.replace("<w:pPr>", f'<w:pPr><w:outlineLvl w:val="{level}"/>', 1)
            else:
                body = f'<w:pPr><w:outlineLvl w:val="{level}"/></w:pPr>' + body
            return m.group(1) + body + m.group(3)

        styles_xml = re.sub(pattern, add_outline, styles_xml)
    return styles_xml


def set_default_fonts(styles_xml: str) -> str:
    font_block = (
        f'<w:rFonts w:ascii="{FONT_LATIN}" w:hAnsi="{FONT_LATIN}" '
        f'w:eastAsia="{FONT_EAST_ASIA}" w:cs="{FONT_LATIN}"/>'
    )
    if "<w:docDefaults>" in styles_xml:
        styles_xml = re.sub(
            r"<w:rPrDefault>[\s\S]*?</w:rPrDefault>",
            f'<w:rPrDefault><w:rPr>{font_block}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault>',
            styles_xml,
            count=1,
        )
    for heading in ["Heading1", "Heading2", "Heading3", "Heading4", "Title", "TOC1"]:
        pattern = rf'(<w:style[^>]*w:styleId="{heading}"[^>]*>[\s\S]*?<w:rPr>)([\s\S]*?)(</w:rPr>)'

        def patch_heading(m: re.Match[str]) -> str:
            body = re.sub(r"<w:rFonts[^/]*/>", "", m.group(2))
            return m.group(1) + font_block + body + m.group(3)

        styles_xml = re.sub(pattern, patch_heading, styles_xml)
    return styles_xml


def enable_update_fields(settings_xml: str) -> str:
    if "<w:updateFields" in settings_xml:
        settings_xml = re.sub(
            r"<w:updateFields w:val=\"[^\"]+\"/>",
            '<w:updateFields w:val="true"/>',
            settings_xml,
        )
    elif "<w:settings" in settings_xml:
        settings_xml = settings_xml.replace(
            "<w:settings",
            '<w:settings',
            1,
        )
        settings_xml = re.sub(
            r"(<w:settings[^>]*>)",
            r'\1<w:updateFields w:val="true"/>',
            settings_xml,
            count=1,
        )
    else:
        settings_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:updateFields w:val="true"/>'
            "</w:settings>"
        )
    return settings_xml


def repack_docx(src_docx: Path, tmp_dir: Path, out_docx: Path) -> None:
    with zipfile.ZipFile(src_docx, "r") as zin:
        with zipfile.ZipFile(out_docx, "w", zipfile.ZIP_DEFLATED) as zout:
            for info in zin.infolist():
                path = tmp_dir / info.filename
                if info.is_dir() or not path.is_file():
                    continue
                zout.writestr(info, path.read_bytes())


def postprocess_docx(docx_path: Path) -> None:
    tmp = Path(tempfile.mkdtemp(prefix="protocol-docx-"))
    try:
        with zipfile.ZipFile(docx_path, "r") as zin:
            zin.extractall(tmp)
        doc_xml_path = tmp / "word" / "document.xml"
        styles_xml_path = tmp / "word" / "styles.xml"
        settings_xml_path = tmp / "word" / "settings.xml"

        xml = doc_xml_path.read_text(encoding="utf-8")
        xml = fix_table_widths(xml)
        xml = promote_heading_levels(xml)
        xml = insert_toc(xml)
        xml = normalize_document_fonts(xml)
        doc_xml_path.write_text(xml, encoding="utf-8")

        if styles_xml_path.exists():
            styles = styles_xml_path.read_text(encoding="utf-8")
            styles = ensure_outline_levels(styles)
            styles = set_default_fonts(styles)
            styles_xml_path.write_text(styles, encoding="utf-8")

        if settings_xml_path.exists():
            settings = settings_xml_path.read_text(encoding="utf-8")
        else:
            settings = ""
        settings_xml_path.write_text(enable_update_fields(settings), encoding="utf-8")

        out = docx_path.with_suffix(".docx.new")
        repack_docx(docx_path, tmp, out)
        shutil.move(str(out), docx_path)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def build(md_path: Path, docx_path: Path) -> None:
    tmp_docx = docx_path.with_suffix(".tmp.docx")
    try:
        run_md_to_docx(md_path, tmp_docx)
        shutil.copy(tmp_docx, docx_path)
        postprocess_docx(docx_path)
        print(f"Built: {docx_path}")
    finally:
        tmp_docx.unlink(missing_ok=True)


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    default_md = script_dir.parent / "docs" / "灵鱿科技远程监控与控制协议-V1.0.0.md"
    md_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_md
    docx_path = Path(sys.argv[2]) if len(sys.argv) > 2 else md_path.with_suffix(".docx")
    build(md_path, docx_path)


if __name__ == "__main__":
    main()
