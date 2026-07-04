/**
 * Build protocol docx from markdown + postprocess table widths (Tencent Docs / Word compatible).
 * Usage: node build-protocol-docx-node.mjs [input.md] [output.docx]
 */
import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import AdmZip from 'adm-zip'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TABLE_WIDTH = 9360
const FONT_LATIN = 'Arial'
const FONT_EAST_ASIA = '微软雅黑'

const mdPath =
  process.argv[2] ||
  path.resolve(__dirname, '../docs/灵鱿科技远程监控与控制协议-V1.0.0.md')
const docxPath = process.argv[3] || mdPath.replace(/\.md$/i, '.docx')

function runMdToDocx(src, dest) {
  execSync(`npx --yes @mohtasham/md-to-docx "${src}" "${dest}"`, {
    stdio: 'inherit',
    shell: true
  })
}

function paraText(block) {
  return block
    .replace(/<w:tab[^/]*\/>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function setParaStyle(block, style) {
  let b = block.replace(/<w:pStyle w:val="[^"]+"\s*\/>/g, '')
  if (b.includes('<w:pPr>')) {
    return b.replace('<w:pPr>', `<w:pPr><w:pStyle w:val="${style}"/>`, 1)
  }
  return b.replace('<w:p>', `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>`, 1)
}

function promoteHeadingLevels(xml) {
  return xml.replace(/<w:p>[\s\S]*?<\/w:p>/g, (block) => {
    const text = paraText(block)
    const styles = [...block.matchAll(/<w:pStyle w:val="([^"]+)"/g)].map((m) => m[1])
    const style = styles.at(-1)
    if (!style || !text || text === '目录') return block
    if (
      (style === 'Heading2' || style === '2') &&
      (/^\d+\s/.test(text) || text.startsWith('附录'))
    ) {
      return setParaStyle(block, 'Heading1')
    }
    if ((style === 'Heading3' || style === '3') && /^\d+\.\d+(?:\s|$)/.test(text)) {
      return setParaStyle(block, 'Heading2')
    }
    if (style === '2') return setParaStyle(block, 'Heading2')
    if (style === '3') return setParaStyle(block, 'Heading3')
    if (style === '4') return setParaStyle(block, 'Heading4')
    return block
  })
}

function fixTableWidths(xml) {
  return xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, (block) => {
    const gridMatch = block.match(/<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/)
    if (!gridMatch) return block
    const colCount = (gridMatch[1].match(/<w:gridCol/g) || []).length
    if (!colCount) return block

    const base = Math.floor(TABLE_WIDTH / colCount)
    const remainder = TABLE_WIDTH - base * colCount
    const widths = Array.from({ length: colCount }, (_, i) => base + (i < remainder ? 1 : 0))

    let fixed = block.replace(
      /<w:tblGrid>[\s\S]*?<\/w:tblGrid>/,
      `<w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
    )
    fixed = fixed.replace('<w:tblLayout w:type="autofit"/>', '<w:tblLayout w:type="fixed"/>')
    fixed = fixed.replace(
      /<w:tblW w:w="0" w:type="auto"\/>/g,
      `<w:tblW w:w="${TABLE_WIDTH}" w:type="dxa"/>`
    )
    fixed = fixed.replace(
      /<w:tblW w:type="dxa" w:w="9746"\/>/g,
      `<w:tblW w:w="${TABLE_WIDTH}" w:type="dxa"/>`
    )

    let colIdx = 0
    return fixed.replace(/<w:tc>[\s\S]*?<\/w:tc>/g, (cell) => {
      const w = widths[colIdx % colCount]
      colIdx += 1
      if (/<w:tcW[^/]*\/>/.test(cell)) {
        return cell.replace(/<w:tcW[^/]*\/>/, `<w:tcW w:w="${w}" w:type="dxa"/>`)
      }
      if (cell.includes('<w:tcPr>')) {
        return cell.replace('<w:tcPr>', `<w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>`, 1)
      }
      return cell.replace('<w:tc>', `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>`, 1)
    })
  })
}

function normalizeDocumentFonts(xml) {
  const fonts = `<w:rFonts w:ascii="${FONT_LATIN}" w:hAnsi="${FONT_LATIN}" w:eastAsia="${FONT_EAST_ASIA}" w:cs="${FONT_LATIN}"/>`
  return xml.replace(/<w:r>[\s\S]*?<\/w:r>/g, (block) => {
    if (block.includes('instrText') || block.includes('fldChar')) return block
    if (block.includes('<w:rPr>')) {
      const body = block.replace(/<w:rFonts[^/]*\/>/g, '')
      return body.replace('<w:rPr>', `<w:rPr>${fonts}`, 1)
    }
    return block.replace('<w:r>', `<w:r><w:rPr>${fonts}</w:rPr>`, 1)
  })
}

function postprocessDocx(docxFile) {
  const zip = new AdmZip(docxFile)
  const entry = zip.getEntry('word/document.xml')
  if (!entry) throw new Error('word/document.xml not found in docx')

  let xml = entry.getData().toString('utf8')
  xml = fixTableWidths(xml)
  xml = promoteHeadingLevels(xml)
  xml = normalizeDocumentFonts(xml)
  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf8'))
  zip.writeZip(docxFile)
}

function build() {
  const tmp = path.join(os.tmpdir(), `protocol-${Date.now()}.docx`)
  try {
    runMdToDocx(mdPath, tmp)
    fs.copyFileSync(tmp, docxPath)
    postprocessDocx(docxPath)
    console.log(`Built (table-fixed): ${docxPath}`)
  } finally {
    fs.unlinkSync(tmp)
  }
}

build()
