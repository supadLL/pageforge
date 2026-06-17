export type AssetType = 'image' | 'font' | 'file'

export type AssetSource = 'upload' | 'ai' | 'remote' | 'template'

export interface Asset {
  id: string
  type: AssetType
  name: string
  /** 项目目录内相对路径，例如 assets/hero.png */
  path: string
  mime: string
  size: number
  width?: number
  height?: number
  hash?: string
  source?: AssetSource
  createdAt: string
}
