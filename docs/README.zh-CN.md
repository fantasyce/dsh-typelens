# DSH TypeLens 中文指南

DSH TypeLens 是 DeepSeek Harness 的本地类型上下文与代码诊断插件。它不是另一个需要模型主动记住的 LSP 工具：文件读取成功后，插件会自动补充当前代码真正引用的完整类型声明；写入或编辑成功后，会自动补充有边界的 TypeScript 诊断。

原始工具结果不会被替换。即使 TypeLens 超时、遇到不支持的文件或内部错误，已经成功的 DSH 文件操作也不会因此失败。

## 安装

```sh
dsh plugin --profile web add https://github.com/fantasyce/dsh-typelens/releases/download/v0.1.1/dsh-typelens-0.1.1.tgz
dsh plugin --profile headless add https://github.com/fantasyce/dsh-typelens/releases/download/v0.1.1/dsh-typelens-0.1.1.tgz
```

0.1.1 以 GitHub Release 压缩包为正式安装源；npm 发布完成后也可直接使用包名安装。

重启对应 profile 后，可用下列命令确认组合配置中存在 `typelens`：

```sh
dsh --profile web --dump-config
```

Web 版可在「设置 → 类型透镜」中查看健康状态、请求与注入计数，分别开关自动读取上下文和自动编辑诊断，并调整预算。设置只有通过完整校验后才会原子写入；非法设置不会覆盖上一次有效配置。

## 支持范围

- TypeScript、TSX、JavaScript、JSX；
- Vue 与 Svelte 的脚本区块：优先使用可选编译器，缺失时退化为有边界的首个实例脚本提取；当前版本不分析模板语义；
- `tsconfig.json`、`jsconfig.json`、路径别名、项目引用与常见 monorepo；
- DSH 0.1.1-rc.2；macOS 为 0.1.1 实机验收平台，Linux 由 CI 覆盖 Node.js 22/24。

## 隐私与边界

TypeLens 自身不发起外网请求，也不会把源码分析结果写入磁盘缓存。插件只持久化经过校验的设置；项目图、诊断、缓存与统计都留在内存中，并在卸载时释放。需要明确的是：自动补充给 Agent 的类型上下文与诊断会进入下一次 DSH 模型请求，因此其传输边界取决于你配置的模型提供商。默认拒绝工作区外路径、依赖目录、构建产物、版本库元数据和环境文件。

四个显式工具是 `typelens_lookup_type`、`typelens_list_types`、`typelens_check` 和 `typelens_explain`。详细字段见[配置参考](configuration.md)，常见问题见[故障排查](troubleshooting.md)。
