/**
 * Design Tokens
 * 完整路径引用，禁止短引用（避免命名冲突）。
 */
export interface DesignTokens {
  colors: Record<string, string>
  fontSize: Record<string, string>
  fontFamily: Record<string, string>
  spacing: Record<string, string>
  radius: Record<string, string>
  shadow: Record<string, string>
  motion: Record<string, string>
}

export const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    primary: '#E0321C',
    text: '#1A1A1A',
    muted: '#6B7280',
    background: '#FFFFFF',
    surface: '#F5F6F8',
    border: '#E5E7EB'
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '32px'
  },
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px'
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    pill: '9999px'
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 2px 8px rgba(0,0,0,0.08)',
    lg: '0 8px 24px rgba(0,0,0,0.12)'
  },
  motion: {
    fast: '120ms ease',
    base: '200ms ease',
    slow: '320ms ease'
  }
}
