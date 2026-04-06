---
outline: deep
order: 2
---

# 依赖与打包

## 开发环境依赖

```bash
pip install pywin32 pystray pillow
```

## 打包（Nuitka）

可使用以下命令生成独立可执行文件：

```bash
nuitka --standalone --windows-console-mode=disable --windows-uac-admin --include-data-files=config.ini=./config.ini --include-data-files=login_notifier.log=./login_notifier.log --include-data-files=columba.ico=./columba.ico --windows-icon-from-ico=columba.ico 1.py
```

## 制作安装包（Inno Setup）

[Inno Setup](https://jrsoftware.org/isinfo.php)是一个非常好用的安装包制作软件。本软件由于需要管理员权限，直接打包会出现「要求的操作需要提升的权限」的错误消息，您可以参考一下步骤编辑iss脚本配置权限：

1. 在 Inno Setup 的 Script 的 [Setup] 中加上：`PrivilegesRequired=admin`

2. 在 [Run] 所有的 Flags 都加上：`runascurrentuser`，例如：

```
[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent runascurrentuser

```