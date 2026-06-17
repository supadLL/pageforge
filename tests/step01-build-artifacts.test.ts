import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { existsSync, statSync } from 'node:fs'

/**
 * Step 01 验收：build 产物健全性 + 关键源文件存在性
 * vitest 在 node 环境下运行（见 vitest.config.ts environmentMatchGlobs）。
 * 更深的 IPC 行为测试需要启动 Electron（E2E 范畴），本步骤只做轻量校验。
 */
const root = process.cwd()

describe('P0 工程骨架 build 产物', () => {
  it('主进程产物存在且非空', () => {
    // main 产物为 .cjs（package.json type:module 下 CJS 必须用 .cjs 扩展名）
    const p = path.join(root, 'out/main/index.cjs')
    expect(existsSync(p)).toBe(true)
    expect(statSync(p).size).toBeGreaterThan(0)
  })

  it('preload 产物存在且非空', () => {
    const p = path.join(root, 'out/preload/index.js')
    expect(existsSync(p)).toBe(true)
    expect(statSync(p).size).toBeGreaterThan(0)
  })

  it('renderer 入口 HTML 存在', () => {
    const p = path.join(root, 'out/renderer/index.html')
    expect(existsSync(p)).toBe(true)
  })

  it('renderer 产物 assets 目录存在', () => {
    const p = path.join(root, 'out/renderer/assets')
    expect(existsSync(p)).toBe(true)
  })
})

describe('P0 源码关键文件', () => {
  it('主进程入口存在', () => {
    expect(existsSync(path.join(root, 'electron/main/index.ts'))).toBe(true)
  })

  it('preload 入口存在', () => {
    expect(existsSync(path.join(root, 'electron/preload/index.ts'))).toBe(true)
  })

  it('渲染进程 App.vue 存在', () => {
    expect(existsSync(path.join(root, 'src/App.vue'))).toBe(true)
  })
})
