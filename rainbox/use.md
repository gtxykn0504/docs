---
outline: deep
order: 2
---

# 两种模式

Rainbox支持通过交互式 Shell 或者 命令行使用，但在使用前，请您先完成初始化。


## 安装

1. 下载 [Github Repo中的安装包](https://github.com/gtxykn0504/rainbox)。
2. 运行安装程序，按照提示完成安装。
3. **可选**：勾选“添加到用户环境变量 PATH”，安装完成后可在任意命令行窗口直接使用 `rain` 命令。

::: danger 重要提示
使用命令行窗口输入命令时，务必带有`rain`，而在交互模式（双击打开）无需。
:::

4. 安装完成后，可选择立即启动 Rainbox（进入交互模式）。

## 初始化

### 获取 API Key
1. 登录 [雨云控制台](https://www.rainyun.com/)。
2. 进入 **API 密钥管理** 页面，点击“创建 API Key”，复制生成的密钥。

### 设置 API Key
```cmd
(rain) key xxxxxxxxxxxxxx
```
成功后会显示 `✓ API Key 已保存`。


## 添加服务器

### 获取服务器 ID
1. 登录雨云控制台，进入 **RCS 云服务器** 产品页面。
2. 每个服务器都有一个数字 ID（例如 `123456`）。

### 添加服务器
```cmd
(rain) server add 123456 my-server
```
- `123456`：服务器 ID
- `my-server`：自定义名称

### 查看已添加的服务器
```cmd
(rain) server list
```

### 删除服务器
```cmd
(rain) server remove my-server
```
可使用 ID 或名称删除。


## 常用操作

### 查看服务器状态
- **查看单个服务器**：
  ```cmd
  (rain) status my-server
  ```
- **查看所有已配置服务器**：
  ```cmd
  (rain) status
  ```


### 启动服务器
```cmd
(rain) start my-server
```

### 停止服务器
```cmd
(rain) stop my-server
```

### 重启服务器
```cmd
(rain) reboot my-server
```

### 智能切换（Toggle）
根据服务器当前状态自动执行开机或关机：
- 若服务器 **运行中** → 执行关机
- 若服务器 **已停止** → 执行开机
- 其他状态（如启动中、错误等）会提示无法切换

```cmd
(rain) my-server
```


## 命令
| 输入 | 作用 |
|------|------|
| `(rain) help` | 显示帮助信息 |
| `(rain) key <KEY>` | 设置 API Key |
| `(rain) server add <ID> [名称]` | 添加服务器 |
| `(rain) server remove <服务器>` | 删除服务器 |
| `(rain) server list` | 列出所有服务器 |
| `(rain) status [服务器]` | 查看状态（未指定服务器则显示所有服务器状态） |
| `(rain) start <服务器>` | 开机 |
| `(rain) stop <服务器>` | 关机 |
| `(rain) reboot <服务器>` | 重启 |
| `<服务器>` | 智能切换（toggle） |
