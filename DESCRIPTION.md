PageForge —— AI 驱动的可视化前端页面生成器（类墨刀桌面端）。

Schema-first 架构：编辑器、AI、导出全部围绕同一棵 Node Tree 工作。拖拽搭页面、AI 图生代码、一键转 Vue/React/uni-app，一条龙从草图到可工程化代码。

核心能力：
• 可视化画布：拖拽编辑、属性面板、图层树、命令系统与撤销重做、响应式断点
• AI 集成：多 Provider 抽象层（GLM-4V / OpenAI / Claude 预留）、截图图生页面、自然语言微调页面
• 框架转译：Node Tree → HTML / Vue 3 SFC / React + CSS Modules / uni-app 小程序页面
• 工程化：.pageforge 工程目录、原子保存、本地预览服务、独立预览窗口

技术栈：Electron + electron-vite + Vue 3 + Pinia + TypeScript + ajv + vitest

安全边界：contextIsolation / sandbox / preload 白名单 API / API Key safeStorage 加密 / 渲染进程零 Node 权限

仓库包含完整的设计文档（docs/，17 份逐步可执行的步骤文档）与 314 个单元测试。
