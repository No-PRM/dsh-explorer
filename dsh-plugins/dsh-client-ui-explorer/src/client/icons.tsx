/** File-type icons via @tabler/icons-react (mature icon library, tree-shaken). */
import type { ReactNode } from 'react'
import { IconBraces, IconChevronsDown, IconChevronsUp, IconDatabase, IconFile, IconFileAlert, IconFileCode, IconFileCode2, IconFileInfo, IconFileMusic, IconFileText, IconFileTypeBmp, IconFileTypeCss, IconFileTypeCsv, IconFileTypeDoc, IconFileTypeHtml, IconFileTypeJs, IconFileTypeJpg, IconFileTypeJsx, IconFileTypePdf, IconFileTypePhp, IconFileTypePng, IconFileTypeSql, IconFileTypeSvg, IconFileTypeTs, IconFileTypeTxt, IconFileTypeVue, IconFileTypeXls, IconFileTypeXml, IconFileTypeZip, IconKey, IconLock, IconPhoto, IconSettings, IconTerminal2, IconVideo, type TablerIcon } from './tabler-icons.ts'
export type IconComponent = TablerIcon

export interface IconSpec {
  Icon: IconComponent
  color: string
}

/** Basename → icon spec: exact filename first, then extension. */
const FILE_ICONS: Record<string, IconSpec> = {
  __default: { Icon: IconFile, color: '#8b949e' },
  __lock: { Icon: IconLock, color: '#d9a13c' },
  __image: { Icon: IconPhoto, color: '#b392f0' },
  __archive: { Icon: IconFileTypeZip, color: '#e3b341' },
  __video: { Icon: IconVideo, color: '#9f7aea' },
  __audio: { Icon: IconFileMusic, color: '#f78c6c' },
  __config: { Icon: IconSettings, color: '#a5a5a5' },
  /* exact filenames */
  '__file:package.json': { Icon: IconBraces, color: '#7f8c8d' },
  '__file:package-lock.json': { Icon: IconLock, color: '#d9a13c' },
  '__file:yarn.lock': { Icon: IconLock, color: '#d9a13c' },
  '__file:pnpm-lock.yaml': { Icon: IconLock, color: '#d9a13c' },
  '__file:tsconfig.json': { Icon: IconSettings, color: '#a5a5a5' },
  '__file:vite.config.js': { Icon: IconFileCode, color: '#646cff' },
  '__file:vite.config.ts': { Icon: IconFileCode, color: '#646cff' },
  '__file:.gitignore': { Icon: IconFileAlert, color: '#f05138' },
  '__file:.gitattributes': { Icon: IconFileAlert, color: '#f05138' },
  '__file:readme.md': { Icon: IconFileText, color: '#519aba' },
  '__file:license': { Icon: IconFileInfo, color: '#b8b8b8' },
  '__file:dockerfile': { Icon: IconFileCode2, color: '#2496ed' },
  '__file:makefile': { Icon: IconFileCode2, color: '#d7875b' },
  '__file:.env': { Icon: IconKey, color: '#e3b341' },
  '__file:.editorconfig': { Icon: IconFileInfo, color: '#a5a5a5' },
  /* extensions */
  '.js': { Icon: IconFileTypeJs, color: '#f1e05a' },
  '.mjs': { Icon: IconFileTypeJs, color: '#f1e05a' },
  '.cjs': { Icon: IconFileTypeJs, color: '#f1e05a' },
  '.jsx': { Icon: IconFileTypeJsx, color: '#61dafb' },
  '.ts': { Icon: IconFileTypeTs, color: '#3178c6' },
  '.mts': { Icon: IconFileTypeTs, color: '#3178c6' },
  '.cts': { Icon: IconFileTypeTs, color: '#3178c6' },
  '.tsx': { Icon: IconFileTypeJsx, color: '#3178c6' },
  '.json': { Icon: IconBraces, color: '#cbcb41' },
  '.md': { Icon: IconFileText, color: '#519aba' },
  '.markdown': { Icon: IconFileText, color: '#519aba' },
  '.txt': { Icon: IconFileTypeTxt, color: '#9aa5b1' },
  '.log': { Icon: IconFileTypeTxt, color: '#9aa5b1' },
  '.yml': { Icon: IconFileText, color: '#cb171e' },
  '.yaml': { Icon: IconFileText, color: '#cb171e' },
  '.toml': { Icon: IconFileInfo, color: '#9c4221' },
  '.ini': { Icon: IconFileInfo, color: '#e6c07b' },
  '.css': { Icon: IconFileTypeCss, color: '#42a5f5' },
  '.scss': { Icon: IconFileTypeCss, color: '#cd6799' },
  '.sass': { Icon: IconFileTypeCss, color: '#cd6799' },
  '.less': { Icon: IconFileTypeCss, color: '#1d365d' },
  '.html': { Icon: IconFileTypeHtml, color: '#e34f26' },
  '.htm': { Icon: IconFileTypeHtml, color: '#e34f26' },
  '.xml': { Icon: IconFileTypeXml, color: '#e37933' },
  '.svg': { Icon: IconFileTypeSvg, color: '#b392f0' },
  '.py': { Icon: IconFileCode, color: '#3776ab' },
  '.pyw': { Icon: IconFileCode, color: '#3776ab' },
  '.ipynb': { Icon: IconFileCode2, color: '#f5a623' },
  '.rs': { Icon: IconFileCode2, color: '#dea584' },
  '.go': { Icon: IconFileCode2, color: '#00add8' },
  '.java': { Icon: IconFileCode2, color: '#e76f00' },
  '.kt': { Icon: IconFileCode2, color: '#7f52ff' },
  '.swift': { Icon: IconFileCode2, color: '#f05138' },
  '.c': { Icon: IconFileCode2, color: '#5c6bc0' },
  '.h': { Icon: IconFileCode2, color: '#5c6bc0' },
  '.cpp': { Icon: IconFileCode2, color: '#5c6bc0' },
  '.cc': { Icon: IconFileCode2, color: '#5c6bc0' },
  '.cxx': { Icon: IconFileCode2, color: '#5c6bc0' },
  '.hpp': { Icon: IconFileCode2, color: '#5c6bc0' },
  '.cs': { Icon: IconFileCode2, color: '#68217a' },
  '.php': { Icon: IconFileTypePhp, color: '#777bb4' },
  '.rb': { Icon: IconFileCode2, color: '#cc342d' },
  '.lua': { Icon: IconFileCode2, color: '#000080' },
  '.sh': { Icon: IconTerminal2, color: '#89e051' },
  '.bash': { Icon: IconTerminal2, color: '#89e051' },
  '.zsh': { Icon: IconTerminal2, color: '#89e051' },
  '.fish': { Icon: IconTerminal2, color: '#89e051' },
  '.ps1': { Icon: IconTerminal2, color: '#012456' },
  '.cmd': { Icon: IconTerminal2, color: '#012456' },
  '.bat': { Icon: IconTerminal2, color: '#012456' },
  '.sql': { Icon: IconFileTypeSql, color: '#e38c00' },
  '.db': { Icon: IconDatabase, color: '#e38c00' },
  '.sqlite': { Icon: IconDatabase, color: '#e38c00' },
  '.vue': { Icon: IconFileTypeVue, color: '#42b883' },
  '.svelte': { Icon: IconFileCode2, color: '#ff3e00' },
  '.graphql': { Icon: IconFileCode2, color: '#e10098' },
  '.gql': { Icon: IconFileCode2, color: '#e10098' },
  '.dart': { Icon: IconFileCode2, color: '#0175c2' },
  '.ex': { Icon: IconFileCode2, color: '#7a2b8e' },
  '.exs': { Icon: IconFileCode2, color: '#7a2b8e' },
  '.zig': { Icon: IconFileCode2, color: '#f5a623' },
  '.cshtml': { Icon: IconFileTypeHtml, color: '#e34f26' },
  '.dockerfile': { Icon: IconFileCode2, color: '#2496ed' },
  '.png': { Icon: IconFileTypePng, color: '#b392f0' },
  '.jpg': { Icon: IconFileTypeJpg, color: '#b392f0' },
  '.jpeg': { Icon: IconFileTypeJpg, color: '#b392f0' },
  '.gif': { Icon: IconPhoto, color: '#b392f0' },
  '.webp': { Icon: IconPhoto, color: '#b392f0' },
  '.ico': { Icon: IconPhoto, color: '#b392f0' },
  '.avif': { Icon: IconPhoto, color: '#b392f0' },
  '.bmp': { Icon: IconFileTypeBmp, color: '#b392f0' },
  '.mp4': { Icon: IconVideo, color: '#9f7aea' },
  '.webm': { Icon: IconVideo, color: '#9f7aea' },
  '.mov': { Icon: IconVideo, color: '#9f7aea' },
  '.mkv': { Icon: IconVideo, color: '#9f7aea' },
  '.mp3': { Icon: IconFileMusic, color: '#f78c6c' },
  '.wav': { Icon: IconFileMusic, color: '#f78c6c' },
  '.ogg': { Icon: IconFileMusic, color: '#f78c6c' },
  '.flac': { Icon: IconFileMusic, color: '#f78c6c' },
  '.pdf': { Icon: IconFileTypePdf, color: '#e5534b' },
  '.doc': { Icon: IconFileTypeDoc, color: '#4285f4' },
  '.docx': { Icon: IconFileTypeDoc, color: '#4285f4' },
  '.xls': { Icon: IconFileTypeXls, color: '#34a853' },
  '.xlsx': { Icon: IconFileTypeXls, color: '#34a853' },
  '.ppt': { Icon: IconFileTypeDoc, color: '#ea4335' },
  '.pptx': { Icon: IconFileTypeDoc, color: '#ea4335' },
  '.csv': { Icon: IconFileTypeCsv, color: '#34a853' },
  '.zip': { Icon: IconFileTypeZip, color: '#e3b341' },
  '.tar': { Icon: IconFileTypeZip, color: '#e3b341' },
  '.gz': { Icon: IconFileTypeZip, color: '#e3b341' },
  '.7z': { Icon: IconFileTypeZip, color: '#e3b341' },
  '.rar': { Icon: IconFileTypeZip, color: '#e3b341' },
  '.wasm': { Icon: IconFileCode2, color: '#654ff0' },
  '.lock': { Icon: IconLock, color: '#d9a13c' },
  '.env': { Icon: IconKey, color: '#e3b341' },
  '.yml.lock': { Icon: IconLock, color: '#d9a13c' },
}

/** Resolve a file basename to its type icon spec. */
export function fileIconSpec(name: string): IconSpec {
  const lower = name.toLowerCase()
  const exact = FILE_ICONS['__file:' + lower]
  if (exact) return exact
  const dot = lower.lastIndexOf('.')
  const ext = dot === -1 ? '' : lower.slice(dot)
  return FILE_ICONS[ext] ?? FILE_ICONS.__default
}

/** Render one icon spec as an inline SVG (tabler icon). */
export function TypeIcon({ spec, size }: { spec: IconSpec; size?: number }): ReactNode {
  const I = spec.Icon
  return <I size={size || 14} color={spec.color} stroke={2} />
}

/** Expand-all / collapse-all glyphs (tabler double chevrons). */
export function IconExpandAll({ size = 14 }: { size?: number }): ReactNode {
  return <IconChevronsDown size={size} stroke={2} />
}

export function IconCollapseAll({ size = 14 }: { size?: number }): ReactNode {
  return <IconChevronsUp size={size} stroke={2} />
}
