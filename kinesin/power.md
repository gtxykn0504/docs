---
outline: deep
order: 4
---

# 权限获取

根据插件权限机制，Kinesin需要获取以下权限：

## 1. storage（存储）

用于保存用户的重定向规则、分组配置和同步设置。所有数据都存储在本地，不会上传到任何服务器（除非用户主动配置并启用同步功能）。

Used to save user's redirect rules, group configurations, and sync settings. All data is stored locally and will not be uploaded to any server unless the user actively configures and enables the sync feature.

## 2. declarativeNetRequest（声明式网络请求）

用于根据用户定义的规则拦截和重定向网络请求。这是插件的核心功能，允许将特定 URL 模式重定向到目标地址，实现自定义跳转。

Used to intercept and redirect network requests based on user-defined rules. This is the core functionality of the extension, allowing specific URL patterns to be redirected to target addresses for custom navigation.

## 3. host_permissions: `<all_urls>`（主机权限：所有网址）

允许插件在所有网站上执行重定向规则。由于用户可能需要在任何网站上创建重定向规则（例如将短链接跳转到长链接），因此需要访问所有网址的权限。插件不会读取或收集用户的浏览数据，仅执行用户主动配置的重定向操作。

Allows the extension to execute redirect rules on all websites. Since users may need to create redirect rules on any website (e.g., redirecting short links to long links), permission to access all URLs is required. The extension does not read or collect user's browsing data; it only performs redirect operations actively configured by the user.
