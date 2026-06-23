import type { ComponentDefinition, ComponentType } from '../types/component.js'
import { PageRootDefinition } from './PageRoot.js'
import { ContainerDefinition } from './Container.js'
import { CardDefinition } from './Card.js'
import { HeadingDefinition } from './Heading.js'
import { TextDefinition } from './Text.js'
import { ButtonDefinition } from './Button.js'
import { ImageDefinition } from './Image.js'
import { InputDefinition } from './Input.js'
import { DividerDefinition } from './Divider.js'
import { BackgroundPanelDefinition } from './BackgroundPanel.js'
import { GlassPanelDefinition } from './GlassPanel.js'
import { GradientCardDefinition } from './GradientCard.js'
import { NavbarDefinition } from './Navbar.js'
import { BadgeDefinition } from './Badge.js'
import { AvatarDefinition } from './Avatar.js'
import { HeroBlockDefinition } from './HeroBlock.js'
import { StatsCardDefinition } from './StatsCard.js'
import { FeatureTileDefinition } from './FeatureTile.js'
import { SearchBoxDefinition } from './SearchBox.js'
import { TabsDefinition } from './Tabs.js'
import { SidebarDefinition } from './Sidebar.js'
import { PricingCardDefinition } from './PricingCard.js'
import { ProgressBarDefinition } from './ProgressBar.js'

/**
 * MVP 组件注册表。所有组件必须先注册才能被使用。
 * 后续扩展组件也必须在此处声明（参见 docs/01 §6）。
 */
const REGISTRY: Record<ComponentType, ComponentDefinition> = {
  PageRoot: PageRootDefinition,
  Container: ContainerDefinition,
  Card: CardDefinition,
  Heading: HeadingDefinition,
  Text: TextDefinition,
  Button: ButtonDefinition,
  Image: ImageDefinition,
  Input: InputDefinition,
  Divider: DividerDefinition,
  BackgroundPanel: BackgroundPanelDefinition,
  GlassPanel: GlassPanelDefinition,
  GradientCard: GradientCardDefinition,
  Navbar: NavbarDefinition,
  Badge: BadgeDefinition,
  Avatar: AvatarDefinition,
  HeroBlock: HeroBlockDefinition,
  StatsCard: StatsCardDefinition,
  FeatureTile: FeatureTileDefinition,
  SearchBox: SearchBoxDefinition,
  Tabs: TabsDefinition,
  Sidebar: SidebarDefinition,
  PricingCard: PricingCardDefinition,
  ProgressBar: ProgressBarDefinition
}

export function getComponentDefinition(type: ComponentType): ComponentDefinition {
  const def = REGISTRY[type]
  if (!def) {
    throw new Error(`Unknown component type: ${type}`)
  }
  return def
}

export function listComponentDefinitions(): ComponentDefinition[] {
  return Object.values(REGISTRY)
}

export function isContainer(type: ComponentType): boolean {
  return getComponentDefinition(type).acceptsChildren
}

export function hasDefinition(type: string): type is ComponentType {
  return type in REGISTRY
}
