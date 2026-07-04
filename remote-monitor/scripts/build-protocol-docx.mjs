/**
 * Regenerate protocol docx from markdown.
 * Prefers Python postprocessor; falls back to Node (table widths for Tencent Docs).
 * Usage: node build-protocol-docx.mjs [input.md] [output.docx]
 */
import { execSync, spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mdPath =
  process.argv[2] ||
  path.resolve(__dirname, '../docs/灵鱿科技远程监控与控制协议-V1.0.0.md')
const docxPath = process.argv[3] || mdPath.replace(/\.md$/i, '.docx')
const py = path.resolve(__dirname, 'build-protocol-docx.py')
const nodeBuild = path.resolve(__dirname, 'build-protocol-docx-node.mjs')

const pyOk = spawnSync('python', ['--version'], { shell: true }).status === 0

if (pyOk) {
  execSync(`python "${py}" "${mdPath}" "${docxPath}"`, { stdio: 'inherit' })
} else {
  execSync(`node "${nodeBuild}" "${mdPath}" "${docxPath}"`, { stdio: 'inherit' })
}
