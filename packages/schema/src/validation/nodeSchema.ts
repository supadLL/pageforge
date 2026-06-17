import type { JsonSchema } from './jsonSchema.js'
import { MVP_COMPONENT_TYPES } from '../types/component.js'
import { styleMapSchema } from './styleMapSchema.js'

/**
 * 节点基础结构（children 在 nodeSchema 中再递归）
 */
const nodeBase: Record<string, JsonSchema> = {
  id: { type: 'string', minLength: 1, description: '节点 id，本地生成' },
  type: {
    type: 'string',
    enum: [...MVP_COMPONENT_TYPES],
    description: '组件类型'
  },
  name: { type: 'string', description: '节点显示名（图层面板优先用）' },
  props: {
    type: 'object',
    description: '组件 props，由组件 propSchema 约束具体形状',
    additionalProperties: true
  },
  style: { ...styleMapSchema, description: '基础样式' },
  events: {
    type: 'array',
    items: { $ref: '#/definitions/nodeEvent' }
  },
  state: {
    type: 'object',
    additionalProperties: false,
    properties: {
      hidden: { type: 'boolean' },
      locked: { type: 'boolean' }
    }
  }
}

export const nodeEventSchema: JsonSchema = {
  type: 'object',
  required: ['type', 'action'],
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['click', 'submit', 'change'] },
    action: {
      oneOf: [
        {
          type: 'object',
          required: ['kind', 'to'],
          additionalProperties: false,
          properties: {
            kind: { const: 'navigate' },
            to: { type: 'string' }
          }
        },
        {
          type: 'object',
          required: ['kind', 'url'],
          additionalProperties: false,
          properties: {
            kind: { const: 'openUrl' },
            url: { type: 'string' },
            target: { type: 'string', enum: ['_blank', '_self'] }
          }
        },
        {
          type: 'object',
          required: ['kind', 'nodeId'],
          additionalProperties: false,
          properties: {
            kind: { const: 'toggleVisibility' },
            nodeId: { type: 'string' }
          }
        },
        {
          type: 'object',
          required: ['kind', 'code'],
          additionalProperties: false,
          properties: {
            kind: { const: 'customCode' },
            code: { type: 'string' }
          }
        }
      ]
    }
  }
}

export const responsiveOverrideSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    style: {
      type: 'object',
      description: '该断点下的样式覆盖',
      additionalProperties: true
    },
    props: {
      type: 'object',
      additionalProperties: true
    }
  }
}

/**
 * 递归 node schema —— 通过 ajv 的 $id 自引用实现递归。
 * 注意：
 *  1. $id 必须使用 http(s) 协议，否则 fast-uri 在递归 resolve 时栈溢出
 *  2. children 引用本 schema 的 $id 即可，ajv 8 支持同 schema 内自引用
 *  3. event / responsive 放 definitions 内便于复用
 */
export const nodeSchema: JsonSchema = {
  $id: 'https://pageforge.local/schemas/node',
  type: 'object',
  required: ['id', 'type', 'props', 'style'],
  additionalProperties: false,
  properties: {
    ...nodeBase,
    children: {
      type: 'array',
      items: { $ref: 'https://pageforge.local/schemas/node' }
    },
    responsive: {
      type: 'object',
      additionalProperties: false,
      properties: {
        desktop: { $ref: '#/definitions/responsiveOverride' },
        laptop: { $ref: '#/definitions/responsiveOverride' },
        tablet: { $ref: '#/definitions/responsiveOverride' },
        mobile: { $ref: '#/definitions/responsiveOverride' }
      }
    }
  },
  definitions: {
    nodeEvent: nodeEventSchema,
    responsiveOverride: responsiveOverrideSchema
  }
}

// 显式把 nodeSchema 注册到 ajv，使 $id 自引用可解析
// （ajv 8 默认会处理同 schema 内的 $ref 到自身 $id）
// 这里在 validation/index.ts 里集中 compile 时已自动处理。
