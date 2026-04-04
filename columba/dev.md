---
outline: deep
order: 4
---

# 与我们一起

个人的力量总是有限的，Columba 仍有许多可以改进之处。如果您有任何建议、想法或遇到了问题，欢迎在 [GitHub 仓库](https://github.com/gtxykn0504/columba) 中提出 Issue 或通过 Pull Request 贡献代码。



## 模块详解

> [!TIP]
> 实在写不动了，这一部分由AI编写，本人审核了下。如果有问题，欢迎反馈，感激不尽

### 常量定义

```python
CONFIG_FILE = "config.ini"
LOG_FILE = "login_notifier.log"
ICON_FILE = "columba.ico"
```

- 定义配置文件名、日志文件名、图标文件名。程序运行时从当前目录读取这些文件。

---

### 日志配置

```python
handler = RotatingFileHandler(LOG_FILE, maxBytes=3*1024*1024, backupCount=0, encoding='utf-8')
handler.setLevel(logging.INFO)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[handler, console_handler]
)
log = logging.info
```

- 使用 `RotatingFileHandler` 实现日志轮转，单个文件最大 3MB，`backupCount=0` 表示超过大小后清空重写（不保留历史备份）。
- 同时输出到控制台（`StreamHandler`），方便调试。
- `log` 简写为 `logging.info` 的引用，用于记录日志。

---

### 工具函数 `show_error`

```python
def show_error(msg):
    ctypes.windll.user32.MessageBoxW(0, msg, "错误", 0x10)
```

- 调用 Windows API `MessageBoxW` 显示错误对话框。
- `0x10` 对应 `MB_ICONERROR`，显示错误图标。
- 用于提权失败、启动错误等场景，给用户明确提示。

---

### 权限检查与提权

####  is_admin

```python
def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False
```

- 调用 `Shell32.IsUserAnAdmin` 判断当前进程是否以管理员身份运行。
- 异常时返回 `False`（如未找到函数）。

#### run_as_admin

```python
def run_as_admin():
    try:
        if getattr(sys, 'frozen', False):
            script = sys.argv[0]
            params = " ".join(sys.argv[1:])
        else:
            script = sys.executable
            params = f'"{sys.argv[0]}" ' + " ".join(sys.argv[1:])

        ret = ctypes.windll.shell32.ShellExecuteW(
            None, "runas", script, params, None, 1
        )

        if ret > 32:
            log("提权成功，新进程已启动")
        else:
            error_code = ret
            show_error(f"提权失败 (错误码: {error_code})，请手动以管理员身份运行。")
            log(f"提权失败，ShellExecuteW 返回 {error_code}")
    except Exception as e:
        log(f"提权过程异常: {e}")
        show_error(f"提权失败 (错误码: 未知)，请手动以管理员身份运行。")
    sys.exit(0)
```

- **功能**：使用 `ShellExecuteW` 的 `runas` 操作重新启动当前进程，请求 UAC 提权。
- **参数构建**：
  - 若程序已打包为 exe（`sys.frozen`），直接使用 `sys.argv[0]` 作为可执行文件路径。
  - 否则，使用 Python 解释器（`sys.executable`）和当前脚本作为参数。
- **返回值判断**：
  - `ret > 32` 表示成功启动新进程，当前进程退出。
  - 其他值表示失败，显示包含错误码的提示框（异常时错误码显示“未知”）。
- **注意**：调用后当前进程立即退出（`sys.exit(0)`），新进程以管理员身份运行。

---

### 配置管理

#### check_config

```python
def check_config():
    if not os.path.exists(CONFIG_FILE):
        log(f"错误：配置文件 {CONFIG_FILE} 不存在！")
        sys.exit(1)
```

- 检查配置文件是否存在，不存在则记录日志并退出程序。

#### load_config

```python
def load_config():
    check_config()
    config = configparser.ConfigParser()
    config.read(CONFIG_FILE, encoding='utf-8')
    smtp = config["SMTP"]
    msg = config["MESSAGE"]
    allowed_types_str = config.get("FILTER", "logon_types", fallback="2,7,10")
    allowed_types = set()
    for t in allowed_types_str.split(','):
        t = t.strip()
        if t.isdigit():
            allowed_types.add(int(t))
    return smtp, msg, allowed_types
```

- 读取 `config.ini`，返回三个部分：SMTP 配置字典、邮件模板字典、允许的登录类型集合。
- 使用 `fallback` 默认值 `"2,7,10"`，若 `[FILTER]` 节无 `logon_types` 项则使用默认。
- 将逗号分隔的字符串转换为整数集合，便于快速判断。

---

### 登录类型描述 `get_logon_type_desc`

```python
def get_logon_type_desc(logon_type):
    desc_map = {
        2: "交互式登录 (Interactive)",
        3: "网络登录 (Network)",
        4: "批处理登录 (Batch)",
        5: "服务登录 (Service)",
        7: "解锁登录 (Unlock)",
        8: "网络明文登录 (Network Cleartext)",
        9: "新凭证登录 (New Credentials)",
        10: "远程交互式登录 (RemoteInteractive)",
        11: "缓存交互式登录 (CachedInteractive)",
    }
    return desc_map.get(logon_type, f"未知类型 ({logon_type})")
```

- 将数字登录类型代码转换为可读的中文描述（带英文原文）。
- 若代码不在映射表中，返回“未知类型 (代码)”。

---

### 邮件发送 `send_mail`

```python
def send_mail(smtp_cfg, msg_cfg, event_data, test=False):
    try:
        msg = MIMEMultipart()
        msg["From"] = formataddr(("Columba", smtp_cfg["from_addr"]))
        msg["To"] = smtp_cfg["to_addr"]

        if test:
            msg["Subject"] = Header("测试邮件 - Columba 通知", "utf-8")
            body = "这是一封测试邮件，您的邮件配置正常。"
        else:
            if "logon_type" in event_data:
                event_data["logon_type_desc"] = get_logon_type_desc(int(event_data["logon_type"]))
            else:
                event_data["logon_type_desc"] = "未知"
            if event_data["event_type"] == "success":
                subject = msg_cfg["subject_success"]
                body = msg_cfg["body_success"].format(**event_data)
            else:
                subject = msg_cfg["subject_failure"]
                body = msg_cfg["body_failure"].format(**event_data)
            msg["Subject"] = Header(subject, "utf-8")

        msg.attach(MIMEText(body, "plain", "utf-8"))

        if smtp_cfg.getboolean("use_tls"):
            server = smtplib.SMTP(smtp_cfg["server"], int(smtp_cfg["port"]))
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(smtp_cfg["server"], int(smtp_cfg["port"]))
        server.login(smtp_cfg["username"], smtp_cfg["password"])
        server.send_message(msg)
        server.quit()
        log("邮件发送成功")
        return True
    except Exception as e:
        log(f"邮件发送失败: {e}")
        return False
```

- **参数**：
  - `smtp_cfg`：SMTP 配置字典。
  - `msg_cfg`：邮件模板字典。
  - `event_data`：事件数据字典（成功或失败）。
  - `test`：是否为测试邮件，测试时不使用模板，直接发送固定内容。
- **邮件构造**：
  - 使用 `MIMEMultipart` 支持多部分内容。
  - 发件人显示名称为“Columba”，通过 `formataddr` 构造。
  - 主题和正文均使用 UTF-8 编码。
  - 正文模板中的变量通过 `.format(**event_data)` 替换。
- **连接方式**：
  - 若 `use_tls=True`，先建立普通 SMTP 连接，再调用 `starttls()` 升级为 TLS。
  - 否则直接使用 `SMTP_SSL` 建立 SSL 连接（通常用于 465 端口）。
- **异常处理**：任何发送失败均记录日志并返回 `False`，不影响主流程。

---

### `LoginMonitor` 类（安全日志监听）

#### __ init __

```python
def __init__(self, callback, allowed_logon_types):
    self.callback = callback
    self.running = True
    self.processed = {}
    self.allowed_logon_types = allowed_logon_types
```

- `callback`：事件回调函数，收到事件后调用。
- `running`：控制循环的布尔标志。
- `processed`：字典，键为事件记录号，用于去重。限制大小 1000，自动清理。
- `allowed_logon_types`：允许的登录类型集合。

#### _parse_logon_type

```python
def _parse_logon_type(self, strings, index):
    logon_type = None
    if len(strings) > index:
        try:
            logon_type = int(strings[index])
        except ValueError:
            for i, s in enumerate(strings):
                if s.isdigit():
                    logon_type = int(s)
                    log(f"登录类型在索引 {i} 找到: {logon_type}")
                    break
    return logon_type
```

- 尝试从事件插入字符串的指定索引获取登录类型。
- 如果该索引不存在或不是数字，则遍历整个字符串列表，找到第一个纯数字项作为登录类型（兼容某些旧系统）。
- 返回整数或 `None`。

#### _parse_event

```python
def _parse_event(self, event):
    # ... 详细代码见源码
```

- 根据事件 ID 4624（成功）或 4625（失败）解析事件数据。
- 使用 `event.StringInserts` 获取插入字符串数组。
- 不同事件 ID 的字段索引不同：
  - 4624：用户名索引 5，域 6，登录类型索引 8，进程名 17，源 IP 18。
  - 4625：用户名 5，域 6，状态码 7，子状态 9，登录类型索引 10，源 IP 19。
- 返回包含所有所需字段的字典，若解析失败返回 `None`。

#### run

```python
def run(self):
    pythoncom.CoInitialize()
    log("开始监听安全日志（4624/4625）...")
    while self.running:
        hand = None
        try:
            hand = win32evtlog.OpenEventLog(None, "Security")
            flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
            events = win32evtlog.ReadEventLog(hand, flags, 0)
            for event in events:
                if event.EventID not in (4624, 4625):
                    continue
                if event.RecordNumber in self.processed:
                    continue
                self.processed[event.RecordNumber] = None
                if len(self.processed) > 1000:
                    self.processed.pop(next(iter(self.processed)))
                data = self._parse_event(event)
                if data:
                    log(f"检测到事件 {event.EventID}: {data['username']} (类型 {data.get('logon_type')})")
                    self.callback(data)
            win32evtlog.CloseEventLog(hand)
            hand = None
        except Exception as e:
            log(f"监听出错: {e}")
            if hand:
                try:
                    win32evtlog.CloseEventLog(hand)
                except:
                    pass
            time.sleep(5)
        else:
            time.sleep(2)
    pythoncom.CoUninitialize()
```

- **COM 初始化**：在线程中调用 `CoInitialize`，确保 COM 正常工作。
- **循环**：
  - 打开安全日志，读取所有新事件（`ReadEventLog` 从最新开始）。
  - 遍历事件，只处理 4624 和 4625。
  - 通过 `RecordNumber` 去重，并将记录号存入 `processed` 字典（限制大小 1000）。
  - 解析事件，若符合过滤条件则回调。
  - 关闭日志句柄。
  - 若无异常，休眠 2 秒后继续；若异常，休眠 5 秒后重试。
- **退出**：`CoUninitialize` 释放 COM。

#### stop

```python
def stop(self):
    self.running = False
```

- 设置标志，使 `run` 循环退出。

---

### `TrayApp` 类（托盘应用）

#### __ init __

```python
def __init__(self):
    self.smtp_cfg, self.msg_cfg, self.allowed_types = load_config()
    self.monitor = None
    self.thread = None
```

- 加载配置，初始化实例变量。

#### send_notification

```python
def send_notification(self, data):
    send_mail(self.smtp_cfg, self.msg_cfg, data)
```

- 事件回调函数，调用邮件发送。

#### test_mail

```python
def test_mail(self):
    log("测试邮件")
    send_mail(self.smtp_cfg, self.msg_cfg, None, test=True)
```

- 发送测试邮件，不依赖事件数据。

#### edit_config

```python
def edit_config(self):
    if os.path.exists(CONFIG_FILE):
        subprocess.Popen(
            ["notepad.exe", CONFIG_FILE],
            creationflags=subprocess.CREATE_NO_WINDOW
        )
    self.smtp_cfg, self.msg_cfg, self.allowed_types = load_config()
    if self.monitor:
        self.monitor.allowed_logon_types = self.allowed_types
    log("配置已更新")
```

- 用记事本打开 `config.ini`，通过 `CREATE_NO_WINDOW` 避免控制台窗口。
- 重新加载配置，并更新监控线程的允许类型（如果监控已启动）。

#### view_log

```python
def view_log(self):
    if os.path.exists(LOG_FILE):
        subprocess.Popen(
            ["notepad.exe", LOG_FILE],
            creationflags=subprocess.CREATE_NO_WINDOW
        )
```

- 用记事本打开日志文件，同样避免控制台窗口。

#### on_quit

```python
def on_quit(self, icon):
    if self.monitor:
        self.monitor.stop()
    icon.stop()
    log("程序退出")
    os._exit(0)
```

- 停止监控线程，关闭托盘图标，强制退出进程（`os._exit` 确保立即终止）。

#### run

```python
def run(self):
    self.monitor = LoginMonitor(self.send_notification, self.allowed_types)
    self.thread = threading.Thread(target=self.monitor.run, daemon=True)
    self.thread.start()

    if not os.path.exists(ICON_FILE):
        log(f"错误：图标文件 {ICON_FILE} 不存在！")
        sys.exit(1)
    try:
        image = Image.open(ICON_FILE)
    except Exception as e:
        log(f"错误：加载图标失败 - {e}")
        sys.exit(1)

    menu = pystray.Menu(
        pystray.MenuItem("测试邮件", self.test_mail),
        pystray.MenuItem("编辑配置", self.edit_config),
        pystray.MenuItem("查看日志", self.view_log),
        pystray.MenuItem("退出", self.on_quit)
    )
    icon = pystray.Icon("LoginNotifier", image, "Columba", menu)
    log("程序已启动，托盘图标显示")
    icon.run()
```

- 创建监控线程并启动。
- 检查图标文件是否存在，加载失败则退出。
- 构建托盘菜单，创建托盘图标并进入消息循环（`icon.run()` 阻塞，直到调用 `icon.stop()`）。

---

### `main` 函数

```python
def main():
    try:
        if not is_admin():
            log("当前非管理员权限，正在请求提权...")
            run_as_admin()
            return

        log("以管理员身份运行")
        app = TrayApp()
        app.run()
    except Exception as e:
        log(f"程序启动失败: {e}")
        import traceback
        log(traceback.format_exc())
        input("按回车键退出...")
```

- 检查管理员权限，若不足则调用 `run_as_admin` 提权（该函数会退出当前进程）。
- 若已管理员运行，创建 `TrayApp` 实例并运行。
- 捕获所有未处理异常，记录日志并暂停，方便调试。

---

### 入口

```python
if __name__ == "__main__":
    main()
```

- 程序入口，调用 `main`。


## 依赖与安装

### 开发环境依赖

```bash
pip install pywin32 pystray pillow
```

### 打包（Nuitka）

可使用以下命令生成独立可执行文件：

```bash
nuitka --standalone --windows-console-mode=disable --windows-uac-admin --include-data-files=config.ini=./config.ini --include-data-files=login_notifier.log=./login_notifier.log --include-data-files=columba.ico=./columba.ico --windows-icon-from-ico=columba.ico 1.py
```
