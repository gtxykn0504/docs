---
outline: deep
order: 3
---

# 错误提示

## 输入格式错误
| 错误信息 | 触发条件 |
|---------|----------|
| `错误：缺少子命令` | `rain key` 无参数；`rain server` 无子命令 |
| `错误: 缺少服务器 ID` | `rain server add` 后未提供 ID |
| `错误: 缺少服务器标识` | `rain server remove` 后未提供标识符 |
| `错误: 缺少服务器` | `rain start`、`rain stop`、`rain reboot` 或 `rain <服务器>` 无参数 |

## 配置相关错误
| 错误信息 | 触发条件 |
|---------|----------|
| `错误: 服务器 ID 不能为空` | `add_server` 收到空 ID |
| `错误: 服务器 ID {id} 已存在` | 添加重复 ID |
| `错误: 服务器名称 {name} 已存在` | 添加重复名称 |
| `错误: 未找到服务器 '{identifier}'` | 操作指定了不存在的服务器 |
| `错误:未配置服务器` | `rain server list` 或 `rain status` 无服务器时 |
| `错误:未设置 API Key` | 执行需要 API 的操作但未配置 key|

## 网络与 API 错误
| 错误信息 | 触发条件 |
|---------|----------|
| `错误: requests 库不存在` | 未安装 requests |
| `请求失败: {code}` | API 返回其他非 2xx 状态码 |
| `错误: 获取服务器状态失败` | `get_server_status` `display_server_status` 返回 None toggle 命令中获取状态失败 |
| `错误: 当前状态为 '{status}'，无法互换（仅支持 running/stopped）` | toggle 时服务器状态不是 running 或 stopped |