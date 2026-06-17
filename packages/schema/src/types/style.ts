/**
 * Style 表达式：字符串或 Token 引用。
 * Token 引用规则（参见 docs/01 §3 Design Tokens）：
 *   $colors.primary
 *   $spacing.4
 *   $radius.md
 *   ...
 * 完整路径避免短引用命名冲突，渲染时统一解析为 var(--pf-...)。
 */
export type StyleValue = string | number

export type StyleMap = {
  // 布局
  display?: StyleValue
  flexDirection?: StyleValue
  alignItems?: StyleValue
  justifyContent?: StyleValue
  gap?: StyleValue
  flexWrap?: StyleValue
  width?: StyleValue
  height?: StyleValue
  minWidth?: StyleValue
  minHeight?: StyleValue
  maxWidth?: StyleValue
  maxHeight?: StyleValue
  padding?: StyleValue
  margin?: StyleValue
  boxSizing?: StyleValue

  // 视觉
  color?: StyleValue
  backgroundColor?: StyleValue
  backgroundImage?: StyleValue
  border?: StyleValue
  borderColor?: StyleValue
  borderRadius?: StyleValue
  boxShadow?: StyleValue
  opacity?: StyleValue
  objectFit?: StyleValue
  outline?: StyleValue

  // 文字
  fontFamily?: StyleValue
  fontSize?: StyleValue
  fontWeight?: StyleValue
  lineHeight?: StyleValue
  textAlign?: StyleValue
  letterSpacing?: StyleValue
  textDecoration?: StyleValue

  // 定位
  position?: StyleValue
  top?: StyleValue
  right?: StyleValue
  bottom?: StyleValue
  left?: StyleValue
  zIndex?: StyleValue

  // 其他
  overflow?: StyleValue
  cursor?: StyleValue
}

export type StyleKey = keyof StyleMap
