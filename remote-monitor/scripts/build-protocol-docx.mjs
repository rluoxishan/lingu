/**
 * Regenerate protocol docx from markdown with proper table column widths.
 * md-to-docx emits gridCol/tcW=100 or omits tcW entirely.
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const AdmZip = require('adm-zip')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TABLE_WIDTH = 9360

function fixDocumentXml(xml) {
  return xml.replace(/<w:tbl>([\s\S]*?)<\/w:tbl>/g, (block) => {
    const gridMatch = block.match(/<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/)
    if (!gridMatch) return block

    const colCount = (gridMatch[1].match(/<w:gridCol/g) || []).length
    if (colCount === 0) return block

    const base = Math.floor(TABLE_WIDTH / colCount)
    const remainder = TABLE_WIDTH - base * colCount
    const widths = Array.from({ length: colCount }, (_, i) => base + (i < remainder ? 1 : 0))

    let fixed = block.replace(
      /<w:tblGrid>[\s\S]*?<\/w:tblGrid>/,
      `<w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`,
    )
    fixed = fixed.replace(/<w:tblLayout w:type="autofit"\/>/g, '<w:tblLayout w:type="fixed"/>')
    fixed = fixed.replace(/<w:tblW w:w="0" w:type="auto"\/>/g, `<w:tblW w:w="${TABLE_WIDTH}" w:type="dxa"/>`)
    fixed = fixed.replace(/<w:tblW w:type="dxa" w:w="9746"\/>/g, `<w:tblW w:w="${TABLE_WIDTH}" w:type="dxa"/>`)

    let colIdx = 0
    fixed = fixed.replace(/<w:tc>([\s\S]*?)<\/w:tc>/g, (cellBlock) => {
      const w = widths[colIdx % colCount]
      colIdx++
      if (/<w:tcW[^/]*\/>/.test(cellBlock)) {
        return cellBlock.replace(/<w:tcW[^/]*\/>/g, `<w:tcW w:w="${w}" w:type="dxa"/>`)
      }
      if (cellBlock.includes('<w:tcPr>')) {
        return cellBlock.replace('<w:tcPr>', `<w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>`)
      }
      return cellBlock.replace('<w:tc>', `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>`)
    })

    return fixed
  })
}

function buildDocx(mdPath, docxPath) {
  execSync(`npx --yes @mohtasham/md-to-docx "${mdPath}" "${docxPath}.tmp.docx"`, { stdio: 'inherit' })

  const zip = new AdmZip(`${docxPath}.tmp.docx`)
  const entry = zip.getEntry('word/document.xml')
  const xml = entry.getData().toString('utf8')
  zip.updateFile('word/document.xml', Buffer.from(fixDocumentXml(xml), 'utf8'))
  zip.writeZip(docxPath)
  fs.unlinkSync(`${docxPath}.tmp.docx`)
  console.log(`Built: ${docxPath}`)
}

const mdPath =
  process.argv[2] ||
  path.resolve(__dirname, '../docs/灵鱿科技远程监控与控制协议-V1.0.0.md')
const docxPath =
  process.argv[3] || mdPath.replace(/\.md$/i, '.docx')

buildDocx(mdPath, docxPath)
