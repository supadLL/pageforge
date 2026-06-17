/**
 * PageForge 跨进程共享类型
 * 这里只放主/preload/renderer 都会用到的轻量类型。
 * 业务领域类型放在 packages/schema。
 */

/**
 * 渲染进程通过 window.pageforge 拿到的 API 形状。
 * preload 暴露的 window.pageforge 对象的类型声明。
 */
export interface PageForgeWindow {
  pageforge: import('../preload/index').PageForgeApi
}
