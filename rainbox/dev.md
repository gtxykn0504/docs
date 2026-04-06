---
outline: deep
order: 4
---

# 开发

## 配置文件
API Key 保存在 `C:\Users\[user]\.rain\config.json` 中，配置文件格式示例：
```json
{
  "api_key": "xxxxxxxxxx",
  "servers": [
    { "id": "123456", "name": "my-server" },
    { "id": "789012", "name": "production" }
  ]
}
```

## 开发环境依赖

```cmd
pip install requests
```

## 打包

```cmd
nuitka --standalone --windows-console-mode=force --include-package=charset_normalizer --output-filename=rain.exe --windows-icon-from-ico=ico.ico 1.py
```

## 安装包
[Inno Setup](https://jrsoftware.org/isinfo.php)是一个非常好用的安装包制作软件。您可以参考一下步骤编辑iss脚本为安装包添加"添加到用户环境变量 PATH"选项：

1. 在`[Setup]`中，添加`gesEnvironment=yes`
2. 在`[Tasks]`中，添加选项
```
Name: "addtopath"; Description: "添加到用户环境变量 PATH"; GroupDescription: "其他任务:"; Flags: unchecked
```

3. 在任意位置添加以下脚本
```
[Registry]
; 仅当用户勾选 addtopath 且路径不存在时才添加
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; \
    ValueData: "{olddata};{app}"; Check: NeedsAddPath(ExpandConstant('{app}')); \
    Tasks: addtopath

[Code]
const
  EnvironmentKey = 'Environment';

// 检查路径是否已存在于 PATH 中
function NeedsAddPath(Param: string): boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path', OrigPath) then
  begin
    Result := True;
    exit;
  end;
  // 前后加分号判断，避免误匹配
  Result := Pos(';' + Param + ';', ';' + OrigPath + ';') = 0;
end;

// 从 PATH 中移除指定路径（卸载时调用，幂等操作）
procedure RemovePath(Path: string);
var
  Paths: string;
  P: Integer;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path', Paths) then
    exit;
  // 确保路径前后有分号进行匹配
  P := Pos(';' + Path + ';', ';' + Paths + ';');
  if P = 0 then exit;
  if P > 1 then P := P - 1;
  Delete(Paths, P, Length(Path) + 1);
  // 清理首尾可能残留的分号
  while (Length(Paths) > 0) and (Paths[1] = ';') do Delete(Paths, 1, 1);
  while (Length(Paths) > 0) and (Paths[Length(Paths)] = ';') do Delete(Paths, Length(Paths), 1);
  // 如果 PATH 变为空字符串，则删除该值；否则写入新值
  if Paths = '' then
    RegDeleteValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path')
  else
    RegWriteStringValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path', Paths);
end;

// 卸载时自动清理 PATH
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
    RemovePath(ExpandConstant('{app}'));
end;
```
