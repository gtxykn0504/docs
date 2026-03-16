import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const docsRoot = path.resolve(__dirname, '..')

export type SidebarAutoItem = {
  text: string
  path: string
}

export type SidebarItem = {
  text: string
  link: string
}

export type SidebarGroup = {
  text: string
  items: SidebarItem[]
}

function normalizeLink(link: string) {
  if (!link.startsWith('/')) return `/${link}`
  return link
}

type ResolvedPath = {
  scopePath: string
  scopeKey: string
  absDir: string
  isRoot: boolean
}

function resolvePathConfig(rawPath: string): ResolvedPath {
  const normalized = rawPath.trim().replace(/\\/g, '/')

  if (!normalized) {
    throw new Error('path cannot be empty.')
  }

  if (!normalized.startsWith('/')) {
    throw new Error(`path must start with '/'. Received: ${rawPath}`)
  }

  const scopePath = normalized === '/'
    ? '/'
    : `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`
  const scopeKey = scopePath === '/' ? '/' : `${scopePath}/`
  const relative = scopePath === '/' ? '' : scopePath.slice(1)

  return {
    scopePath,
    scopeKey,
    absDir: path.resolve(docsRoot, relative),
    isRoot: scopePath === '/'
  }
}

function toLink(relativePath: string) {
  return normalizeLink(relativePath ? `/${relativePath}` : '/')
}

function readFrontmatterAndTitle(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const fmMatch = raw.match(/^---\s*([\s\S]*?)\s*---/)
  let order = Number.POSITIVE_INFINITY

  if (fmMatch) {
    const fm = fmMatch[1]
    const orderMatch = fm.match(/^\s*order\s*:\s*([-+]?\d+(?:\.\d+)?)/m)
    if (orderMatch) order = Number(orderMatch[1])
  }

  const h1 = raw.match(/^#\s+(.+)$/m)
  const title = h1 ? h1[1].trim() : path.basename(filePath, '.md')

  return { order, title }
}

function generateSidebarGroup(entry: SidebarAutoItem): SidebarGroup {
  const { absDir, isRoot } = resolvePathConfig(entry.path)

  if (!fs.existsSync(absDir)) {
    return { text: entry.text, items: [] }
  }

  const relativeDir = path.relative(docsRoot, absDir).split(path.sep).join('/')
  const files = fs.readdirSync(absDir).filter((name) => {
    if (!name.endsWith('.md')) return false
    // When scanning docs root '/', do not include root index.md in sidebar.
    if (isRoot && name.toLowerCase() === 'index.md') return false
    return true
  })

  const items = files
    .map((name) => {
      const full = path.join(absDir, name)
      const { order, title } = readFrontmatterAndTitle(full)
      const baseName = path.basename(name, '.md')
      const rel = relativeDir ? `${relativeDir}/${baseName}` : baseName

      // index.md -> 目录根路径
      const link = baseName === 'index' ? toLink(relativeDir) : toLink(rel)

      return {
        order,
        text: title,
        link
      }
    })
    .sort((a, b) => {
      if (a.order === b.order) return a.text.localeCompare(b.text)
      return a.order - b.order
    })

  return {
    text: entry.text,
    items: items.map(({ text, link }): SidebarItem => ({ text, link }))
  }
}

export function generateSidebarByPath(sidebarAuto: SidebarAutoItem[]) {
  const sidebarConfig: Record<string, SidebarGroup[]> = {}

  for (const entry of sidebarAuto) {
    const { scopeKey } = resolvePathConfig(entry.path)
    const group = generateSidebarGroup(entry)

    if (!sidebarConfig[scopeKey]) {
      sidebarConfig[scopeKey] = []
    }

    sidebarConfig[scopeKey].push(group)
  }

  return sidebarConfig
}

export default generateSidebarByPath
