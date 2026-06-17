/**
 * Token 引用格式：
 *   $colors.primary
 *   $spacing.4        （数字 key 允许，用于 spacing/4 这种）
 *   $radius.md
 * 必须以 $ 开头，以 path.to.key 形式给出完整路径。
 * key 允许字母/下划线开头，后可跟字母/数字/下划线/短横线。
 */
const TOKEN_REF_PATTERN = /^\$[a-zA-Z_][a-zA-Z0-9_-]*(?:\.[a-zA-Z0-9_][a-zA-Z0-9_-]*)+$/

/**
 * 判断一个字符串是否为合法 token 引用。
 */
export function isTokenRef(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_REF_PATTERN.test(value)
}

/**
 * 解析 token 引用为 token key 数组，例如
 *   $colors.primary -> ['colors', 'primary']
 * 不合法引用返回 null。
 */
export function parseTokenRef(ref: string): string[] | null {
  if (!isTokenRef(ref)) return null
  return ref.slice(1).split('.')
}

/**
 * 在 tokens 中按路径查找实际值。
 */
export function resolveToken(
  tokens: Record<string, Record<string, string>>,
  ref: string
): string | null {
  const path = parseTokenRef(ref)
  if (!path) return null
  let cur: unknown = tokens
  for (const key of path) {
    if (cur && typeof cur === 'object' && key in (cur as object)) {
      cur = (cur as Record<string, unknown>)[key]
    } else {
      return null
    }
  }
  return typeof cur === 'string' ? cur : null
}

/**
 * 将 token 引用转成 CSS 变量：$colors.primary -> var(--pf-colors-primary)
 */
export function tokenRefToCssVar(ref: string): string | null {
  const path = parseTokenRef(ref)
  if (!path) return null
  return `var(--pf-${path.join('-')})`
}
