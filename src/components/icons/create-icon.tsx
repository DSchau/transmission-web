import { cn } from 'cn'
import type { ComponentProps, JSX } from 'react'

/** One child of an icon's SVG, with React's camelCased attributes. */
export type IconNode = [tag: 'path' | 'circle', attrs: Record<string, string>][]

export interface IconProps extends ComponentProps<'svg'> {
  size?: number | string
  strokeWidth?: number | string
}

export type IconComponent = ((props: IconProps) => JSX.Element) & { displayName?: string }

/**
 * Makes a component from one icon's drawing. Stroke colour and width live on the root so the
 * children inherit them, which is what lets `strokeWidth` restyle a whole icon and lets
 * icon-motion clone a single part. Each icon carries an `icon-<name>` class that names it for
 * icon-gestures.ts.
 */
export function createIcon(name: string, nodes: IconNode): IconComponent {
  function Icon({ size = 24, strokeWidth = 2, className, children, ...props }: IconProps) {
    const labelled = props['aria-label'] || props['aria-labelledby'] || props.role === 'img'
    return (
      // biome-ignore lint/a11y/noSvgWithoutTitle: hidden from assistive tech unless the caller labels it
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        aria-hidden={labelled ? undefined : true}
        className={cn('icon', `icon-${name}`, className)}
        {...props}
      >
        {nodes.map(([Tag, attrs], i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: an icon's children never reorder
          <Tag key={i} {...attrs} />
        ))}
        {children}
      </svg>
    )
  }
  Icon.displayName = name.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())
  return Icon
}
