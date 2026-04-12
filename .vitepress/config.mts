import { defineConfig } from 'vitepress'
import generateSidebarByPath from './sidebar.mts'
import type { SidebarAutoItem } from './sidebar.mts'

const sidebarAuto: SidebarAutoItem[] = [
  {
    text: 'Kinesin',
    path: '/kinesin',
  },
  {
    text: 'Rainbox',
    path: '/rainbox',
  },
  {
    text: 'Columba',
    path: '/columba',
  }
]

const sidebarByPath = generateSidebarByPath(sidebarAuto)

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'KeDocs',
  description: '代码跃海 世界同潮',
  cleanUrls: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '隐私协议', link: '/privacy' },
      { text: '知识库', link: 'https://kegongteng.cn' },
      { text: '联系', link: 'mailto:i@kegongteng.cn' },
    ],

    logo: {
      dark: "/avatar-dark.png",
      light: "/avatar.png",
    },
    sidebar: sidebarByPath,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/gtxykn0504' }
    ],

    search: {
      provider: 'local'
    }
  }
})
