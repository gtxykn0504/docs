---
outline: deep
order: 3
---

# 同步功能

通过服务器同步规则，您可以在多个设备和浏览器之间共享自定义的重定向规则，实现无缝的浏览体验。

## 配置同步服务器

Kinesin 的服务器端使用 PHP 编写，您可以按照以下步骤自行部署同步服务。

### 1. 下载服务器端代码

访问 [GitHub 仓库](https://github.com/gtxykn0504/kinesin/tree/main/server) 下载 `redirect.php` 文件。

### 2. 编辑配置文件

打开 `redirect.php`，根据您的实际情况修改以下两处配置：

- **设置 API 密钥**：  
  找到 `define('API_KEY', 'your-secret-key-here');`  
  将 `your-secret-key-here` 替换为您自定义的密码，用于保证同步请求的安全性。

- **指定规则存储文件**：  
  找到 `$storageFile = __DIR__ . '/rules.json';`  
  您可以修改 `rules.json` 的存储路径（例如 `/var/data/kinesin-rules.json`），请确保 PHP 进程对该文件及其所在目录拥有读写权限。

### 3. 部署到服务器

- 配置一个支持 PHP 的 Web 服务器（如 Apache、Nginx）。
- 将编辑后的 `redirect.php` 上传到服务器上的合适目录。
- 手动创建 `rules.json` 文件并设置正确的权限。

### 4. 插件端配置

1. 点击浏览器工具栏中的 Kinesin 图标。
2. 在弹出窗口中，点击右上角的 ⚙️ 图标进入设置页面。
3. 找到 同步设置 区域，输入您的 服务器 URL（例如 `https://example.com/redirect.php`）和 API 密钥。
4. 启用“启用同步”开关，然后点击“保存”即可。

## 自动下载规则

如果您开启“启动时自动下载规则”选项，Kinesin 将在每次浏览器启动或点击插件图标时自动从服务器拉取最新的规则，您可以在插件弹窗或设置页面中查看当前的同步状态。