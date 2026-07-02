/**
 * Regenerate protocol docx from markdown (delegates to build-protocol-docx.py).
 * Usage: node build-protocol-docx.mjs [input.md] [output.docx]
 */
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mdPath =
  process.argv[2] ||
  path.resolve(__dirname, '../docs/灵鱿科技远程监控与控制协议-V1.0.0.md')
const docxPath =
  process.argv[3] || mdPath.replace(/\.md$/i, '.docx')
const py = path.resolve(__dirname, 'build-protocol-docx.py')

execSync(`python "${py}" "${mdPath}" "${docxPath}"`, { stdio: 'inherit' })
