---
outline: deep
order: 3
---

# 配置文件说明

Columba 的配置文件为 `config.ini`，采用标准 INI 格式，放置于程序同目录下。首次运行前请按需修改，保存时请使用 **UTF-8** 编码。

## 文件结构

```ini
[SMTP]
server = 
port = 
username = 
password = 
from_addr = 
to_addr = 
use_tls = 

[MESSAGE]
subject_success = 
body_success = 
subject_failure = 
body_failure = 

[FILTER]
logon_types = 
```

---

## [SMTP] 邮件服务器设置

| 键名       | 说明                                                                   | 必需 | 示例值                 |
|------------|------------------------------------------------------------------------|------|------------------------|
| server     | SMTP 服务器地址                                                        | 是   | `smtp.qq.com`          |
| port       | SMTP 服务器端口（SSL 一般为 465，TLS 一般为 587）                      | 是   | `465`                  |
| username   | 登录邮箱的用户名（通常为完整邮箱地址）                                 | 是   | `your@qq.com`          |
| password   | 邮箱密码或授权码（推荐使用授权码）                                     | 是   | `xxxxxxxxxxxxxx`       |
| from_addr  | 发件人邮箱地址（通常与 username 相同）                                 | 是   | `your@qq.com`          |
| to_addr    | 收件人邮箱地址，可多个（用逗号分隔）                                   | 是   | `admin@example.com`    |
| use_tls    | 是否使用 TLS 加密（`true` / `false`）。若端口为 465 一般设为 `false` 使用 SSL，端口 587 设为 `true` | 是   | `false`                |


## [MESSAGE] 邮件内容模板

支持在主题和正文中使用变量，程序会自动替换为实际值。

### 主题与正文

| 键名            | 说明               | 默认值（示例）                                                       |
|-----------------|--------------------|----------------------------------------------------------------------|
| subject_success | 成功登录邮件主题   | `[通知] 用户 {username} 已登录 {computer}`                           |
| body_success    | 成功登录邮件正文   | `用户 {username} 于 {time} 从 {source_ip} 登录 {computer}，登录类型：{logon_type_desc}` |
| subject_failure | 失败登录邮件主题   | `[告警] 用户 {username} 登录失败`                                    |
| body_failure    | 失败登录邮件正文   | `用户 {username} 于 {time} 从 {source_ip} 登录失败，原因：{failure_reason}` |

### 可用变量

| 变量名             | 说明                                                               | 适用事件 |
|--------------------|--------------------------------------------------------------------|----------|
| `{username}`       | 登录用户名                                                         | 成功/失败 |
| `{domain}`         | 登录域（若为本地账户则为计算机名）                                 | 成功/失败 |
| `{time}`           | 登录时间（格式 `YYYY-MM-DD HH:MM:SS`）                             | 成功/失败 |
| `{computer}`       | 计算机名                                                           | 成功/失败 |
| `{source_ip}`      | 来源 IP 地址（远程登录时显示，本地登录可能为 `-`）                 | 成功/失败 |
| `{logon_type}`     | 登录类型代码（如 10）                                              | 成功 |
| `{logon_type_desc}`| 登录类型描述（如“远程交互式登录”）                                 | 成功 |
| `{process_name}`   | 触发登录的进程名（如 `C:\Windows\System32\svchost.exe`）           | 成功 |
| `{failure_reason}` | 失败原因（包含状态码和子状态，如“状态码: 0xC0000064, 子状态: 0”） | 失败 |

---

## [FILTER] 事件过滤

| 键名         | 说明                                                              | 默认值     |
|--------------|-------------------------------------------------------------------|------------|
| logon_types  | 需要监控的登录类型列表，用英文逗号分隔，仅支持数字代码。留空则监控所有类型。 | `2,7,10`   |

### 常用登录类型代码

| 代码 | 描述                         | 典型场景                   |
|------|------------------------------|----------------------------|
| 2    | 交互式登录                   | 本地控制台登录             |
| 3    | 网络登录                     | 访问共享文件夹             |
| 4    | 批处理登录                   | 计划任务                   |
| 5    | 服务登录                     | 系统服务启动               |
| 7    | 解锁登录                     | 从屏保或锁屏恢复           |
| 8    | 网络明文登录                 | IIS 基本认证               |
| 9    | 新凭证登录                   | RunAs 不同用户             |
| 10   | 远程交互式登录               | 远程桌面（RDP）            |
| 11   | 缓存交互式登录               | 域控不可达时使用缓存凭证   |

## 完整配置示例

```ini
[SMTP]
server = smtp.qq.com
port = 465
username = columba@qq.com
password = xxxxxxxxxxxxxx
from_addr = columba@qq.com
to_addr = admin@example.com, backup@example.com
use_tls = false

[FILTER]
logon_types = 2,7,10

[MESSAGE]
subject_success = Columba 登录通知 - 成功
body_success = 用户 {username} 在计算机 {computer} 上登录成功
			登录类型: {logon_type_desc}
			时间: {time}
			来源 IP: {source_ip}
			进程: {process_name}
subject_failure = Columba 登录通知 - 失败
body_failure = 用户 {username} 在计算机 {computer} 上的登录尝试失败
			登录类型: {logon_type_desc}
			时间: {time}
			来源 IP: {source_ip}
			失败原因: {failure_reason}
```

---
