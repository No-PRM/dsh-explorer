// Dev runner: builds with tsdown --watch and mirrors the built lib/client.js
// to the live profile install so the client-HMR chain reloads automatically.
// When the profile install is a junction to this project (recommended), the
// built file is already the served file and the copy step is skipped.
import { spawn } from 'node:child_process'
import { watchFile, copyFile, mkdir, realpath } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = join(here, '..')
const built = join(root, 'lib', 'client.js')
const install = 'C:\\Users\\Jian\\.dsh\\profiles\\web\\node_modules\\dsh-client-ui-explorer\\lib\\client.js'

const npmCmd = process.platform === 'win32' ? 'C:\\Program Files\\nodejs\\npm.cmd' : 'npm'
const child = spawn(npmCmd, ['run', 'watch'], { cwd: root, stdio: 'inherit' })

async function sameFile(a, b) {
  try {
    const [ra, rb] = await Promise.all([realpath(a), realpath(b)])
    return ra === rb
  } catch (e) { return false }
}

let last = 0
watchFile(built, { interval: 300 }, async () => {
  try {
    const st = await (await import('node:fs')).stat(built)
    if (st.mtimeMs === last) return
    last = st.mtimeMs
    if (await sameFile(built, install)) {
      console.log('[dev] built (served via junction)')
      return
    }
    await mkdir(join(install, '..'), { recursive: true })
    await copyFile(built, install)
    console.log('[dev] synced lib/client.js -> profile install')
  } catch (e) { /* not built yet */ }
})

process.on('SIGINT', () => child.kill('SIGINT'))
