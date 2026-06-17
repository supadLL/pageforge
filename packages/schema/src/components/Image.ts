import type { ComponentDefinition } from '../types/component.js'
import type { JsonSchema } from '../validation/jsonSchema.js'
import type { StyleMap } from '../types/style.js'

const imageProps: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    src: {
      type: 'string',
      'x-asset': true,
      description: '图片资源路径或 URL'
    },
    alt: { type: 'string', default: '', description: '替代文本' },
    fit: {
      type: 'string',
      enum: ['cover', 'contain', 'fill', 'none', 'scale-down'],
      default: 'cover',
      description: 'object-fit'
    }
  }
}

const imageStyle: StyleMap = {
  display: 'block',
  width: '100%',
  height: 'auto',
  objectFit: 'cover',
  borderRadius: '$radius.sm',
  boxSizing: 'border-box'
}

export const ImageDefinition: ComponentDefinition = {
  type: 'Image',
  label: '图片',
  category: 'basic',
  defaultProps: { src: '', alt: '', fit: 'cover' },
  defaultStyle: imageStyle,
  propSchema: imageProps,
  acceptsChildren: false,
  render: { kind: 'vue' },
  exportHints: { tag: 'img', selfClosing: true }
}
