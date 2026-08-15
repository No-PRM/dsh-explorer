/** Emit declaration files to lib/types and normalize relative import
 *  extensions (.ts/.tsx → .js) so the .d.ts files resolve standalone. */
import { execFileSync } from 'node:child_process'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc')
execFileSync(process.execPath, [tsc, '--emitDeclarationOnly', '-p', 'tsconfig.types.json'], { stdio: 'inherit' })

const outDir = join(root, 'lib', 'types')
for (const f of await readdir(outDir)) {
  if (!f.endsWith('.d.ts')) continue
  const p = join(outDir, f)
  const src = await readFile(p, 'utf8')
  const out = src.replace(/from '(\.[^']*)\.tsx?'/g, (m, spec) => "from '" + spec + ".js'")
  if (out !== src) await writeFile(p, out)
}
