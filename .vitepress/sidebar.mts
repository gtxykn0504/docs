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
  link?: string
  items?: SidebarItem[]
  collapsed?: boolean
}

export type SidebarGroup = {
  text: string
  items: SidebarItem[]
}

type OrderedLinkItem = {
  order: number
  text: string
  link: string
}

type NestedSection = {
  order: number
  text: string
  items: SidebarItem[]
  collapsed: boolean
}

function sortByOrderAndText<T extends { order: number; text: string }>(a: T, b: T) {
  if (a.order === b.order) return a.text.localeCompare(b.text)
  return a.order - b.order
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
  let subheading: string | undefined

  if (fmMatch) {
    const fm = fmMatch[1]
    const orderMatch = fm.match(/^\s*order\s*:\s*([-+]?\d+(?:\.\d+)?)/m)
    if (orderMatch) order = Number(orderMatch[1])

    const subheadingMatch = fm.match(/^\s*Subheading\s*:\s*(.+)$/m)
    if (subheadingMatch) {
      subheading = subheadingMatch[1].trim()
    }
  }

  const h1 = raw.match(/^#\s+(.+)$/m)
  const title = h1 ? h1[1].trim() : path.basename(filePath, '.md')

  return { order, title, subheading }
}

function listMarkdownFiles(absDir: string, includeIndex: boolean) {
  return fs.readdirSync(absDir).filter((name) => {
    if (!name.endsWith('.md')) return false
    if (!includeIndex && name.toLowerCase() === 'index.md') return false
    return true
  })
}

function listMarkdownItems(absDir: string, relativeDir: string, includeIndex: boolean) {
  return listMarkdownFiles(absDir, includeIndex)
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
    .sort(sortByOrderAndText)
}

function buildNestedSection(absDir: string, relativeDir: string, dirName: string): NestedSection | null {
  const childAbsDir = path.join(absDir, dirName)
  const childRelativeDir = relativeDir ? `${relativeDir}/${dirName}` : dirName
  const indexPath = path.join(childAbsDir, 'index.md')
  const sectionMeta = fs.existsSync(indexPath)
    ? readFrontmatterAndTitle(indexPath)
    : null

  if (!sectionMeta?.subheading) return null

  const sectionItems = listMarkdownItems(childAbsDir, childRelativeDir, true)
  if (!sectionItems.length) return null

  return {
    order: sectionMeta.order,
    text: sectionMeta.subheading,
    items: sectionItems.map(({ text, link }): SidebarItem => ({ text, link })),
    collapsed: false
  }
}

function generateSidebarGroup(entry: SidebarAutoItem): SidebarGroup {
  const { absDir, isRoot } = resolvePathConfig(entry.path)

  if (!fs.existsSync(absDir)) {
    return { text: entry.text, items: [] }
  }

  const relativeDir = path.relative(docsRoot, absDir).split(path.sep).join('/')

  const topLevelItems = listMarkdownItems(
    absDir,
    relativeDir,
    // When scanning docs root '/', do not include root index.md in sidebar.
    !isRoot
  )

  const nestedSections = fs.readdirSync(absDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => buildNestedSection(absDir, relativeDir, dirent.name))
    .filter((item): item is NestedSection => Boolean(item))

  const items = [
    ...topLevelItems.map((item) => ({ kind: 'link' as const, ...item })),
    ...nestedSections.map((item) => ({ kind: 'section' as const, ...item }))
  ]
    .sort(sortByOrderAndText)

  return {
    text: entry.text,
    items: items.map((item): SidebarItem => {
      if (item.kind === 'link') {
        return { text: item.text, link: item.link }
      }

      return {
        text: item.text,
        items: item.items,
        collapsed: item.collapsed
      }
    })
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
