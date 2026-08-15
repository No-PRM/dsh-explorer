/** Emit declaration files to lib/types and normalize relative import
 *  extensions (.ts/.tsx → .js) so the .d.ts files resolve standalone. */
import { execFileSync } from 'node:child_process'
import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const outDir = join(root, 'lib', 'types')
await rm(outDir, { recursive: true, force: true })
const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc')
execFileSync(process.execPath, [tsc, '--emitDeclarationOnly', '-p', 'tsconfig.types.json'], { stdio: 'inherit' })

async function walk(p) {
  for (const e of await readdir(p, { withFileTypes: true })) {
    const fp = join(p, e.name)
    if (e.isDirectory()) {
      await walk(fp)
    } else if (e.name.endsWith('.d.ts')) {
      const src = await readFile(fp, 'utf8')
      const out = src.replace(/from '(\.[^']*)\.tsx?'/g, (m, spec) => "from '" + spec + ".js'")
      if (out !== src) await writeFile(fp, out)
    }
  }
}
await walk(outDir)
