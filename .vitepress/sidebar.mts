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

type OrderedGroup = {
  order: number
  text: string
  group: SidebarGroup
}

type SidebarDocMeta = {
  order: number
  text: string
  link: string
}

type OrderedSidebarItem = {
  order: number
  text: string
  item: SidebarItem
  subOrder?: number
  source: 'doc' | 'subheading'
}

type HeadingBucket = {
  order: number
  text: string
  key: string
  entries: OrderedSidebarItem[]
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
  let heading: string | undefined
  let subheading: string | undefined
  let subOrder: number | undefined

  if (fmMatch) {
    const fm = fmMatch[1]
    const orderMatch = fm.match(/^\s*order\s*:\s*([-+]?\d+(?:\.\d+)?)/m)
    if (orderMatch) order = Number(orderMatch[1])

    const headingMatch = fm.match(/^\s*heading\s*:\s*(.+)$/m)
    if (headingMatch) heading = headingMatch[1].trim()

    const subheadingMatch = fm.match(/^\s*subheading\s*:\s*(.+)$/m)
    if (subheadingMatch) subheading = subheadingMatch[1].trim()

    const subOrderMatch = fm.match(/^\s*sub-order\s*:\s*([-+]?\d+(?:\.\d+)?)/m)
    if (subOrderMatch) subOrder = Number(subOrderMatch[1])
  }

  const h1 = raw.match(/^#\s+(.+)$/m)
  const title = h1 ? h1[1].trim() : path.basename(filePath, '.md')

  return { order, title, heading, subheading, subOrder }
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

function toSidebarLinkItems(items: SidebarDocMeta[]): SidebarItem[] {
  return items.map(({ text, link }): SidebarItem => ({ text, link }))
}

function toOrderedSidebarItems(items: SidebarDocMeta[]): OrderedSidebarItem[] {
  return items.map((doc) => ({
    order: doc.order,
    text: doc.text,
    item: { text: doc.text, link: doc.link },
    source: 'doc'
  }))
}

function sortBySubOrderAndText<T extends { subOrder?: number; text: string }>(a: T, b: T) {
  const aOrder = a.subOrder ?? Number.POSITIVE_INFINITY
  const bOrder = b.subOrder ?? Number.POSITIVE_INFINITY
  if (aOrder === bOrder) return a.text.localeCompare(b.text)
  return aOrder - bOrder
}

function buildOrderedItems(entries: OrderedSidebarItem[]): SidebarItem[] {
  const pinned = entries
    .filter((entry) => entry.source === 'subheading' && entry.subOrder !== undefined)
    .sort(sortBySubOrderAndText)
  const floating = entries
    .filter((entry) => entry.source !== 'subheading' || entry.subOrder === undefined)
    .sort(sortByOrderAndText)

  const arranged = [...floating]

  for (const pin of pinned) {
    const index = Math.max(0, (pin.subOrder as number) - 1)
    if (index >= arranged.length) {
      arranged.push(pin)
      continue
    }

    arranged.splice(index, 0, pin)
  }

  return arranged.map(({ item }) => item)
}

function generateSidebarGroups(entry: SidebarAutoItem): OrderedGroup[] {
  const { absDir, isRoot } = resolvePathConfig(entry.path)

  if (!fs.existsSync(absDir)) {
    return [{ order: Number.NEGATIVE_INFINITY, text: entry.text, group: { text: entry.text, items: [] } }]
  }

  const relativeDir = path.relative(docsRoot, absDir).split(path.sep).join('/')

  const topLevelItems = listMarkdownItems(
    absDir,
    relativeDir,
    // When scanning docs root '/', do not include root index.md in sidebar.
    !isRoot
  )

  const rootEntries: OrderedSidebarItem[] = toOrderedSidebarItems(topLevelItems)
  const headingBuckets = new Map<string, HeadingBucket>()

  const ensureHeadingBucket = (key: string, order: number, text: string, docs: SidebarDocMeta[]) => {
    const existing = headingBuckets.get(key)
    const entries = toOrderedSidebarItems(docs)

    if (existing) {
      existing.entries.push(...entries)
      return
    }

    headingBuckets.set(key, {
      key,
      order,
      text,
      entries
    })
  }

  const addSubheadingToTarget = (
    targetHeadingKey: string | undefined,
    label: string,
    order: number,
    subOrder: number | undefined,
    items: SidebarItem[]
  ) => {
    const entry: OrderedSidebarItem = {
      order,
      text: label,
      subOrder,
      source: 'subheading',
      item: {
        text: label,
        collapsed: true,
        items
      }
    }

    if (targetHeadingKey && headingBuckets.has(targetHeadingKey)) {
      headingBuckets.get(targetHeadingKey)!.entries.push(entry)
      return
    }

    rootEntries.push(entry)
  }

  const walkDirectories = (parentAbsDir: string, parentRelativeDir: string, activeHeadingKey?: string) => {
    const childDirs = fs.readdirSync(parentAbsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())

    for (const dirent of childDirs) {
      const childAbsDir = path.join(parentAbsDir, dirent.name)
      const childRelativeDir = parentRelativeDir ? `${parentRelativeDir}/${dirent.name}` : dirent.name
      const childItems = listMarkdownItems(childAbsDir, childRelativeDir, true)
      const indexPath = path.join(childAbsDir, 'index.md')
      const meta = fs.existsSync(indexPath)
        ? readFrontmatterAndTitle(indexPath)
        : undefined

      let nextActiveHeadingKey = activeHeadingKey

      if (meta?.heading) {
        const headingKey = childRelativeDir
        ensureHeadingBucket(headingKey, meta.order, meta.heading, childItems)
        nextActiveHeadingKey = headingKey
      }

      if (meta?.subheading && childItems.length) {
        const subOrder = meta.subOrder ?? meta.order
        const parentHeadingKey = meta?.heading ? nextActiveHeadingKey : activeHeadingKey
        addSubheadingToTarget(parentHeadingKey, meta.subheading, subOrder, meta.subOrder, toSidebarLinkItems(childItems))
      }

      walkDirectories(childAbsDir, childRelativeDir, nextActiveHeadingKey)
    }
  }

  walkDirectories(absDir, relativeDir)

  const childGroups = Array.from(headingBuckets.values())
    .map((bucket): OrderedGroup => {
      const groupItems = buildOrderedItems(bucket.entries)

      return {
        order: bucket.order,
        text: bucket.text,
        group: {
          text: bucket.text,
          items: groupItems
        }
      }
    })
    .sort(sortByOrderAndText)

  const rootItems = buildOrderedItems(rootEntries)

  const rootGroup: OrderedGroup = {
    order: Number.NEGATIVE_INFINITY,
    text: entry.text,
    group: {
      text: entry.text,
      items: rootItems
    }
  }

  return [rootGroup, ...childGroups]
}

export function generateSidebarByPath(sidebarAuto: SidebarAutoItem[]) {
  const sidebarConfig: Record<string, SidebarGroup[]> = {}

  for (const entry of sidebarAuto) {
    const { scopeKey } = resolvePathConfig(entry.path)
    const groups = generateSidebarGroups(entry)

    if (!sidebarConfig[scopeKey]) {
      sidebarConfig[scopeKey] = []
    }

    sidebarConfig[scopeKey].push(...groups.map(({ group }) => group))
  }

  return sidebarConfig
}

export default generateSidebarByPath
