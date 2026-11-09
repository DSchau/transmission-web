/*
 * The app's icons, from the Central Icon System (v1.35, Figma file ZLZdIuD9mXZkMwG4GIeqsM),
 * exported at the `filled=off, stroke=2, radius=2, join=round` variant. Each is named after
 * its Central icon. To add one, export the same variant as SVG, keep every child's geometry
 * and caps/joins, drop `stroke="black"` and `stroke-width="2"` (the root sets them), and
 * turn `fill="black"` into `currentColor`.
 */
import { createIcon } from './create-icon'

export type { IconComponent, IconProps } from './create-icon'

export const ArrowDown = createIcon('arrow-down', [
  ['path', { d: 'M18 14L12 20L6 14', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M12 19V4', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const ArrowDownCircle = createIcon('arrow-down-circle', [
  [
    'path',
    {
      d: 'M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M12 8V16M9 13L12 16L15 13', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const ArrowTopBottom = createIcon('arrow-top-bottom', [
  [
    'path',
    {
      d: 'M3 7.49985L6.29289 4.20696C6.68342 3.81643 7.31658 3.81643 7.70711 4.20696L11 7.49985',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M13 16.5L16.2929 19.7929C16.6834 20.1834 17.3166 20.1834 17.7071 19.7929L21 16.5',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M7 5V20', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M17 4V19', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const ArrowUp = createIcon('arrow-up', [
  ['path', { d: 'M12 5V20', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M6 10L12 4L18 10', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const ArrowUpCircle = createIcon('arrow-up-circle', [
  [
    'path',
    {
      d: 'M21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M12 16V8', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M9 11L12 8L15 11', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const ArrowWallDown = createIcon('arrow-wall-down', [
  [
    'path',
    {
      d: 'M16.25 13.0002L12.7071 16.543C12.3166 16.9336 11.6834 16.9336 11.2929 16.543L7.75 13.0002',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M12 3V16.25', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M19 21H5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const ArrowWallUp = createIcon('arrow-wall-up', [
  [
    'path',
    {
      d: 'M16.25 10.9998L12.7071 7.45696C12.3166 7.06643 11.6834 7.06643 11.2929 7.45695L7.75 10.9998',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M12 21V7.75', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M19 3H5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const AppearanceLightMode = createIcon('appearance-light-mode', [
  ['circle', { cx: '12', cy: '12', r: '9' }],
  [
    'path',
    {
      d: 'M12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16V21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3V8ZM12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16V8Z',
      fill: 'currentColor',
    },
  ],
])
export const Audio = createIcon('audio', [
  [
    'path',
    {
      d: 'M9.99609 18.5C9.99609 19.8807 8.65295 21 6.99609 21C5.33924 21 3.99609 19.8807 3.99609 18.5C3.99609 17.1193 5.33924 16 6.99609 16C8.65295 16 9.99609 17.1193 9.99609 18.5Z',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M19.9961 15.5C19.9961 16.8807 18.6529 18 16.9961 18C15.3392 18 13.9961 16.8807 13.9961 15.5C13.9961 14.1193 15.3392 13 16.9961 13C18.6529 13 19.9961 14.1193 19.9961 15.5Z',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M9.99609 18.5V7.48808C9.99609 6.60486 10.5754 5.82622 11.4214 5.57243L17.4214 3.77243C18.7046 3.38746 19.9961 4.34835 19.9961 5.68808V15.5',
      strokeLinejoin: 'round',
    },
  ],
])
export const Book = createIcon('book', [
  [
    'path',
    {
      d: 'M7 21H17C18.1046 21 19 20.1046 19 19V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V19M7 21C5.89543 21 5 20.1046 5 19M7 21H10M5 19C5 17.8954 5.89543 17 7 17H17C18.1046 17 19 16.1046 19 15V12',
    },
  ],
  ['path', { d: 'M9 7H15', strokeLinecap: 'round' }],
  ['path', { d: 'M9 11H12', strokeLinecap: 'round' }],
])
export const Cd = createIcon('cd', [
  ['circle', { cx: '12', cy: '12', r: '9' }],
  [
    'path',
    {
      d: 'M9.99988 6.875C8.57117 7.433 7.43299 8.57117 6.875 9.99988M13.9999 17.1251C15.4288 16.5671 16.5671 15.4288 17.1251 13.9999',
      strokeLinecap: 'round',
    },
  ],
  ['circle', { cx: '12', cy: '12', r: '2' }],
])
export const ChainLink1 = createIcon('chain-link-1', [
  [
    'path',
    {
      d: 'M13 18L10.9142 20.0858C10.1332 20.8668 8.86684 20.8668 8.08579 20.0858L3.91422 15.9142C3.13317 15.1332 3.13317 13.8668 3.91422 13.0858L6 11',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M11 5.9997L13.0858 3.91391C13.8668 3.13286 15.1332 3.13286 15.9142 3.91391L20.0858 8.08548C20.8668 8.86653 20.8668 10.1329 20.0858 10.9139L18 12.9997',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M9 15L15 9', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const ChainLink2 = createIcon('chain-link-2', [
  ['path', { d: 'M7 12H17', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  [
    'path',
    {
      d: 'M16 17H20C21.1046 17 22 16.1046 22 15V9C22 7.89543 21.1046 7 20 7H16',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M8 17H4C2.89543 17 2 16.1046 2 15V9C2 7.89543 2.89543 7 4 7H8',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const CheckCircle = createIcon('check-circle', [
  [
    'path',
    {
      d: 'M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M15 9.5L10.5 15L8.5 13', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const Checkmark1 = createIcon('checkmark-1', [
  ['path', { d: 'M5 12.75L10 19L19 5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const ChevronDownMedium = createIcon('chevron-down-medium', [
  ['path', { d: 'M6 9.5L12 15.5L18 9.5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const ChevronLeftMedium = createIcon('chevron-left-medium', [
  ['path', { d: 'M14.5 18L8.5 12L14.5 6', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const ChevronRightMedium = createIcon('chevron-right-medium', [
  ['path', { d: 'M9.5 18L15.5 12L9.5 6', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const ChevronTopMedium = createIcon('chevron-top-medium', [
  ['path', { d: 'M6 14.5L12 8.5L18 14.5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const CircleDotsCenter1 = createIcon('circle-dots-center-1', [
  [
    'path',
    {
      d: 'M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z',
    },
  ],
  [
    'path',
    {
      d: 'M8 12H8.01M8.25 12C8.25 12.1381 8.13807 12.25 8 12.25C7.86193 12.25 7.75 12.1381 7.75 12C7.75 11.8619 7.86193 11.75 8 11.75C8.13807 11.75 8.25 11.8619 8.25 12Z',
      strokeLinecap: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M12 12H12.01M12.25 12C12.25 12.1381 12.1381 12.25 12 12.25C11.8619 12.25 11.75 12.1381 11.75 12C11.75 11.8619 11.8619 11.75 12 11.75C12.1381 11.75 12.25 11.8619 12.25 12Z',
      strokeLinecap: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M16 12H16.01M16.25 12C16.25 12.1381 16.1381 12.25 16 12.25C15.8619 12.25 15.75 12.1381 15.75 12C15.75 11.8619 15.8619 11.75 16 11.75C16.1381 11.75 16.25 11.8619 16.25 12Z',
      strokeLinecap: 'round',
    },
  ],
])
export const CircleInfo = createIcon('circle-info', [
  [
    'path',
    {
      d: 'M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M11 11H12V16', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  [
    'path',
    {
      d: 'M12 7.25C12.4142 7.25 12.75 7.58579 12.75 8C12.75 8.41421 12.4142 8.75 12 8.75C11.5858 8.75 11.25 8.41421 11.25 8C11.25 7.58579 11.5858 7.25 12 7.25Z',
      fill: 'currentColor',
      strokeWidth: '0.5',
    },
  ],
])
export const CircleQuestionmark = createIcon('circle-questionmark', [
  [
    'path',
    {
      d: 'M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M12 16V16.01', strokeLinecap: 'round' }],
  [
    'path',
    {
      d: 'M12 13C12 11.3608 14 11.9319 14 10C14 8.89543 13.1046 8 12 8C11.2597 8 10.6134 8.4022 10.2676 9',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const CircleX = createIcon('circle-x', [
  [
    'path',
    {
      d: 'M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M15 9L9 15', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M15 15L9 9', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const Clapboard = createIcon('clapboard', [
  [
    'path',
    {
      d: 'M18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4Z',
    },
  ],
  ['path', { d: 'M4 9H20' }],
  ['path', { d: 'M8.25 9L10.25 4' }],
  ['path', { d: 'M13.75 9L15.75 4' }],
])
export const Clipboard = createIcon('clipboard', [
  [
    'path',
    {
      d: 'M15 5H17C18.1046 5 19 5.89543 19 7V19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V7C5 5.89543 5.89543 5 7 5H9M15 5V7H9V5M15 5C15 3.89543 14.1046 3 13 3H11C9.89543 3 9 3.89543 9 5',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const CloudOff = createIcon('cloud-off', [
  [
    'path',
    {
      d: 'M10.7807 5.12397C11.1744 5.0427 11.5822 5 12 5C15.3137 5 18 7.68629 18 11C20.2091 11 22 12.7909 22 15C22 15.4069 21.9392 15.7996 21.8263 16.1696M18.8987 18.8987L7.28675 7.28675C6.8743 7.80955 6.54697 8.40264 6.32568 9.04508C3.88316 9.37436 2 11.4673 2 14C2 16.7614 4.23858 19 7 19H18C18.309 19 18.6098 18.965 18.8987 18.8987ZM18.8987 18.8987L21 21L3 3',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const ColorPalette2 = createIcon('color-palette-2', [
  [
    'path',
    {
      d: 'M12 3C16.9706 3 21 7.02944 21 12C21 12.5585 20.9487 13.1049 20.851 13.6351C20.6974 14.4686 19.9197 15 19.0721 15H14C12.8954 15 12 15.8954 12 17V19C12 20.1046 11.0932 21.023 10.0156 20.7805C5.99979 19.8768 3 16.2887 3 12C3 7.02944 7.02944 3 12 3Z',
    },
  ],
  ['circle', { cx: '17.2504', cy: '10.6498', r: '1.35', fill: 'currentColor' }],
  ['circle', { cx: '13.35', cy: '6.9501', r: '1.35', fill: 'currentColor' }],
  ['circle', { cx: '8.25039', cy: '8.14981', r: '1.35', fill: 'currentColor' }],
  ['circle', { cx: '7.04922', cy: '13.2499', r: '1.35', fill: 'currentColor' }],
])
export const Columns3 = createIcon('columns-3', [
  [
    'path',
    {
      d: 'M18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4Z',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M9.33984 4V20' }],
  ['path', { d: 'M14.6602 4V20' }],
])
export const CrossMedium = createIcon('cross-medium', [
  ['path', { d: 'M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5', strokeLinecap: 'round' }],
])
export const DotGrid1x3Horizontal = createIcon('dot-grid-1x3-horizontal', [
  [
    'path',
    {
      d: 'M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M20 13C20.5523 13 21 12.5523 21 12C21 11.4477 20.5523 11 20 11C19.4477 11 19 11.4477 19 12C19 12.5523 19.4477 13 20 13Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M4 13C4.55228 13 5 12.5523 5 12C5 11.4477 4.55228 11 4 11C3.44772 11 3 11.4477 3 12C3 12.5523 3.44772 13 4 13Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const ExclamationCircle = createIcon('exclamation-circle', [
  ['circle', { cx: '12', cy: '12', r: '9' }],
  ['path', { d: 'M12 8V12.5', strokeLinecap: 'round' }],
  ['circle', { cx: '12', cy: '15.7996', r: '1.2', fill: 'currentColor' }],
])
export const ExclamationTriangle = createIcon('exclamation-triangle', [
  [
    'path',
    {
      d: 'M3.27481 15.998L10.2765 3.99036C11.0464 2.66988 12.9536 2.66988 13.7235 3.99035L20.7252 15.998C21.5011 17.3288 20.5416 19 19.0016 19H4.99836C3.45836 19 2.49885 17.3288 3.27481 15.998Z',
      strokeLinecap: 'square',
    },
  ],
  ['path', { d: 'M12 9.01953V12.0138', strokeLinecap: 'round' }],
  [
    'path',
    {
      d: 'M12 15.25C12.1381 15.25 12.25 15.1381 12.25 15C12.25 14.8619 12.1381 14.75 12 14.75C11.8619 14.75 11.75 14.8619 11.75 15C11.75 15.1381 11.8619 15.25 12 15.25Z',
      strokeLinecap: 'square',
    },
  ],
  ['path', { d: 'M12 15H12.01', strokeLinecap: 'round' }],
])
export const FastForward = createIcon('fast-forward', [
  [
    'path',
    {
      d: 'M12.1399 11.2478L6.6585 6.45152C6.01192 5.88576 5 6.34494 5 7.20409V16.7966C5 17.6557 6.01192 18.1149 6.6585 17.5491L12.1399 12.7529C12.5952 12.3545 12.5952 11.6462 12.1399 11.2478Z',
      strokeLinecap: 'square',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M20.1399 11.2478L14.6585 6.45152C14.0119 5.88576 13 6.34494 13 7.20409V16.7966C13 17.6557 14.0119 18.1149 14.6585 17.5491L20.1399 12.7529C20.5952 12.3545 20.5952 11.6462 20.1399 11.2478Z',
      strokeLinecap: 'square',
      strokeLinejoin: 'round',
    },
  ],
])
export const FileArrowLeftIn = createIcon('file-arrow-left-in', [
  ['path', { d: 'M13 3.5V8C13 8.55228 13.4477 9 14 9H18.5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  [
    'path',
    {
      d: 'M15 21H17C18.1046 21 19 20.1046 19 19V9.82843C19 9.29799 18.7893 8.78929 18.4142 8.41421L13.5858 3.58579C13.2107 3.21071 12.702 3 12.1716 3H7C5.89543 3 5 3.89543 5 5V13',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M4 19H10', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M8 16L11 19L8 22', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const FileBend = createIcon('file-bend', [
  [
    'path',
    {
      d: 'M12.1716 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V9.82843C19 9.29799 18.7893 8.78929 18.4142 8.41421L13.5858 3.58579C13.2107 3.21071 12.702 3 12.1716 3Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M13 3.5V7C13 8.10457 13.8954 9 15 9H18.5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const Filter2 = createIcon('filter-2', [
  ['path', { d: 'M3 5H21', strokeLinecap: 'round' }],
  ['path', { d: 'M9 19H15', strokeLinecap: 'round' }],
  ['path', { d: 'M6 12H18', strokeLinecap: 'round' }],
])
export const FilterAsc = createIcon('filter-asc', [
  ['path', { d: 'M4 6H9', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M4 12H11', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M4 18H18', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M18 5V11', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M15 10L18 13L21 10', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const FilterDesc = createIcon('filter-desc', [
  ['path', { d: 'M4 6H18', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M4 12H11', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M4 18H9', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M18 11V17', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M15 16L18 19L21 16', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const Folder1 = createIcon('folder-1', [
  [
    'path',
    {
      d: 'M3 6V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H12.5352C12.2008 7 11.8886 6.8329 11.7031 6.5547L10.5937 4.8906C10.2228 4.3342 9.59834 4 8.92963 4H5C3.89543 4 3 4.89543 3 6Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const Globe = createIcon('globe', [
  [
    'path',
    {
      d: 'M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z',
      strokeLinecap: 'square',
    },
  ],
  ['path', { d: 'M21 12H3', strokeLinecap: 'square' }],
  [
    'path',
    {
      d: 'M12 21C10.067 21 8.5 16.9706 8.5 12C8.5 7.02944 10.067 3 12 3C13.933 3 15.5 7.02944 15.5 12C15.5 16.9706 13.933 21 12 21Z',
      strokeLinecap: 'square',
    },
  ],
])
export const InboxEmpty = createIcon('inbox-empty', [
  [
    'path',
    {
      d: 'M18.5758 6.00772L21.7365 11.5389C21.9092 11.841 22 12.1831 22 12.5311V17C22 18.1046 21.1046 19 20 19H4C2.89543 19 2 18.1046 2 17V12.5311C2 12.1831 2.09083 11.841 2.26351 11.5389L5.42416 6.00772C5.78024 5.38457 6.44293 5 7.16065 5H16.8394C17.5571 5 18.2198 5.38457 18.5758 6.00772Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M3 12H7.5C8.12951 12 8.72229 12.2964 9.1 12.8L9.4 13.2C9.77771 13.7036 10.3705 14 11 14H13C13.6295 14 14.2223 13.7036 14.6 13.2L14.9 12.8C15.2777 12.2964 15.8705 12 16.5 12H21',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const Key2 = createIcon('key-2', [
  [
    'path',
    {
      d: 'M15.4 8.5H15.5H15.6M16 8.5C16 8.77614 15.7761 9 15.5 9C15.2239 9 15 8.77614 15 8.5C15 8.22386 15.2239 8 15.5 8C15.7761 8 16 8.22386 16 8.5Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M15.5 14C18.5376 14 21 11.5376 21 8.5C21 5.46243 18.5376 3 15.5 3C12.4624 3 10 5.46243 10 8.5C10 8.96094 10.0567 9.40863 10.1635 9.83649L4.58579 15.4142C4.21071 15.7893 4 16.298 4 16.8284V19C4 19.5523 4.44772 20 5 20H7.17157C7.70201 20 8.21071 19.7893 8.58579 19.4142L10 18V15.5H12.5L14.1635 13.8365C14.5914 13.9433 15.0391 14 15.5 14Z',
      strokeLinecap: 'square',
      strokeLinejoin: 'round',
    },
  ],
])
export const Limit = createIcon('limit', [
  ['path', { d: 'M12 13L9 10', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  [
    'path',
    {
      d: 'M5.29147 19C2.12534 15.4663 2.2402 10.0319 5.63604 6.63604C9.15076 3.12132 14.8492 3.12132 18.364 6.63604C21.7598 10.0319 21.8747 15.4663 18.7085 19',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const LineChart1 = createIcon('line-chart-1', [
  [
    'path',
    {
      d: 'M9 11V16M14 5V16M19 13V16M4 4V18C4 19.1046 4.89543 20 6 20H21',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const LoadingCircle = createIcon('loading-circle', [
  [
    'path',
    {
      d: 'M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z',
      strokeOpacity: '0.3',
    },
  ],
  ['path', { d: 'M20.9451 13C20.4839 17.1716 17.1716 20.4839 13 20.9451', strokeLinecap: 'round' }],
])
export const Lock = createIcon('lock', [
  [
    'path',
    {
      d: 'M5 12C5 10.8954 5.89543 10 7 10H17C18.1046 10 19 10.8954 19 12V19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V12Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M16 9.5V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V9.5',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M12 14V17', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const MagnifyingGlass = createIcon('magnifying-glass', [
  [
    'path',
    {
      d: 'M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z',
      strokeLinecap: 'round',
    },
  ],
  ['path', { d: 'M20 20L16.05 16.05', strokeLinecap: 'round' }],
])
export const MinusMedium = createIcon('minus-medium', [['path', { d: 'M5.5 12H18.5', strokeLinecap: 'round' }]])
export const Moon = createIcon('moon', [
  [
    'path',
    {
      d: 'M20.9638 12.7674C19.8361 13.5447 18.4693 13.9998 16.9961 13.9998C13.1301 13.9998 9.99609 10.8657 9.99609 6.99975C9.99609 5.52667 10.4511 4.15987 11.2283 3.03223C6.61911 3.42277 3 7.28768 3 11.9979C3 16.9674 7.0286 20.996 11.9981 20.996C16.7084 20.996 20.5734 17.3767 20.9638 12.7674Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const NumberedList = createIcon('numbered-list', [
  ['path', { d: 'M12 17H20', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M12 7H20', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M6 9.5V4.5L4 5.5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  [
    'path',
    {
      d: 'M4.25 15C4.25 15 4.9 14.5 5.61102 14.5C6.37813 14.5 7 15.1219 7 15.889C7 17.6885 4 18 4 19.5H7.25',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const PageCross = createIcon('page-cross', [
  [
    'path',
    {
      d: 'M13 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V13',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M21.1213 16.8789L19 19.0002M19 19.0002L16.8787 21.1216M19 19.0002L16.8787 16.8789M19 19.0002L21.1213 21.1216',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const Pause = createIcon('pause', [
  [
    'path',
    {
      d: 'M5 6C5 4.89543 5.89543 4 7 4C8.10457 4 9 4.89543 9 6V18C9 19.1046 8.10457 20 7 20C5.89543 20 5 19.1046 5 18V6Z',
    },
  ],
  [
    'path',
    {
      d: 'M15 6C15 4.89543 15.8954 4 17 4C18.1046 4 19 4.89543 19 6V18C19 19.1046 18.1046 20 17 20C15.8954 20 15 19.1046 15 18V6Z',
    },
  ],
])
export const Pencil = createIcon('pencil', [
  [
    'path',
    {
      d: 'M18.4142 3.91415L20.0858 5.58573C20.8668 6.36678 20.8668 7.63311 20.0858 8.41416L18 10.4999L7.79289 20.7071C7.60536 20.8946 7.351 20.9999 7.08579 20.9999H3V16.9142C3 16.6489 3.10536 16.3946 3.29289 16.2071L13.5 5.99994L15.5858 3.91416C16.3668 3.13311 17.6332 3.13311 18.4142 3.91415Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M13.5 6L18 10.5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const Play = createIcon('play', [
  [
    'path',
    {
      d: 'M20.245 10.2984L9.05099 3.38443C7.71854 2.56145 6 3.51992 6 5.08603V18.914C6 20.4801 7.71854 21.4385 9.05098 20.6156L20.245 13.7016C21.5104 12.9201 21.5104 11.0799 20.245 10.2984Z',
      strokeLinejoin: 'round',
    },
  ],
])
export const Plugin1 = createIcon('plugin-1', [
  [
    'path',
    {
      d: 'M19 14V9C19 7.89543 18.1046 7 17 7H7C5.89543 7 5 7.89543 5 9V14C5 16.2091 6.79086 18 9 18H15C17.2091 18 19 16.2091 19 14Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M12 18V21', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M15 7V3', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M9 7V3', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const PlusMedium = createIcon('plus-medium', [
  ['path', { d: 'M12 5.5V12M12 12V18.5M12 12H5.5M12 12H18.5', strokeLinecap: 'round' }],
])
export const Server = createIcon('server', [
  [
    'path',
    {
      d: 'M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V12H3V7Z',
      strokeLinecap: 'square',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M3 12H21V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V12Z',
      strokeLinecap: 'square',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M6.5 14.625C6.98325 14.625 7.375 15.0168 7.375 15.5C7.375 15.9832 6.98325 16.375 6.5 16.375C6.01675 16.375 5.625 15.9832 5.625 15.5C5.625 15.0168 6.01675 14.625 6.5 14.625ZM6.5 7.625C6.98325 7.625 7.375 8.01675 7.375 8.5C7.375 8.98325 6.98325 9.375 6.5 9.375C6.01675 9.375 5.625 8.98325 5.625 8.5C5.625 8.01675 6.01675 7.625 6.5 7.625Z',
      fill: 'currentColor',
      strokeWidth: '0.75',
    },
  ],
])
export const SettingsGear2 = createIcon('settings-gear-2', [
  [
    'path',
    {
      d: 'M7.98941 5.39755L7.30515 5.23965C6.72652 5.10612 6.11991 5.28009 5.7 5.7C5.28009 6.11991 5.10612 6.72651 5.23965 7.30515L5.39755 7.9894C5.57956 8.7781 5.25434 9.59711 4.58086 10.0461L3.74885 10.6008C3.28101 10.9127 3 11.4377 3 12C3 12.5623 3.28101 13.0873 3.74885 13.3992L4.58086 13.9539C5.25434 14.4029 5.57956 15.2219 5.39756 16.0106L5.23965 16.6949C5.10612 17.2735 5.28009 17.8801 5.7 18.3C6.11991 18.7199 6.72651 18.8939 7.30515 18.7604L7.9894 18.6024C8.7781 18.4204 9.59711 18.7457 10.0461 19.4191L10.6008 20.2512C10.9127 20.719 11.4377 21 12 21C12.5623 21 13.0873 20.719 13.3992 20.2512L13.9539 19.4191C14.4029 18.7457 15.2219 18.4204 16.0106 18.6024L16.6949 18.7604C17.2735 18.8939 17.8801 18.7199 18.3 18.3C18.7199 17.8801 18.8939 17.2735 18.7604 16.6949L18.6024 16.0106C18.4204 15.2219 18.7457 14.4029 19.4191 13.9539L20.2512 13.3992C20.719 13.0873 21 12.5623 21 12C21 11.4377 20.719 10.9127 20.2512 10.6008L19.4191 10.0461C18.7457 9.59711 18.4204 8.7781 18.6024 7.98941L18.7604 7.30515C18.8939 6.72652 18.7199 6.11991 18.3 5.7C17.8801 5.28009 17.2735 5.10612 16.6949 5.23965L16.0106 5.39755C15.2219 5.57956 14.4029 5.25434 13.9539 4.58086L13.3992 3.74884C13.0873 3.28101 12.5623 3 12 3C11.4377 3 10.9127 3.28101 10.6008 3.74885L10.0461 4.58086C9.59711 5.25434 8.7781 5.57956 7.98941 5.39755Z',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z',
      strokeLinejoin: 'round',
    },
  ],
])
export const ShieldCheck = createIcon('shield-check', [
  [
    'path',
    {
      d: 'M20 7.17737C20 6.32338 19.4578 5.56361 18.6502 5.286L12.6502 3.2235C12.2288 3.07866 11.7712 3.07866 11.3498 3.22349L5.34984 5.286C4.54224 5.56361 4 6.32338 4 7.17737V11.9123C4 16.8848 8 19 12 21.1579C16 19 20 16.8848 20 11.9123V7.17737Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M9.5 11.75L11 13.25L14.5 9.75', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const SidebarHiddenLeftWide = createIcon('sidebar-hidden-left-wide', [
  [
    'path',
    {
      d: 'M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M7 9V15', strokeLinecap: 'round' }],
])
export const SidebarSimpleLeftWide = createIcon('sidebar-simple-left-wide', [
  [
    'path',
    {
      d: 'M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M9 5V12V19', strokeLinejoin: 'round' }],
])
export const SidebarWideLeftArrow = createIcon('sidebar-wide-left-arrow', [
  ['path', { d: 'M15 10L13 12L15 14', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  [
    'path',
    {
      d: 'M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M8 5V12V19' }],
])
export const SignalTower = createIcon('signal-tower', [
  ['circle', { cx: '12', cy: '9.5', r: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  [
    'path',
    {
      d: 'M7.75693 13.0001C6.08102 10.9734 6.08103 8.02679 7.75693 6M16.2431 6C17.919 8.02679 17.919 10.9734 16.2431 13.0001',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M5.06494 3.0074C1.64285 6.65823 1.64502 12.3518 5.07145 16M18.9281 3C22.3572 6.65053 22.3573 12.3493 18.9285 16',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M8 21L11.75 10H12.25L16 21', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M9.5 18H14.5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const SquareBehindSquare1 = createIcon('square-behind-square-1', [
  [
    'path',
    {
      d: 'M15 9V4.25C15 3.55964 14.4404 3 13.75 3H4.25C3.55964 3 3 3.55964 3 4.25V13.75C3 14.4404 3.55964 15 4.25 15H9',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M19.75 9H10.25C9.55964 9 9 9.55964 9 10.25V19.75C9 20.4404 9.55964 21 10.25 21H19.75C20.4404 21 21 20.4404 21 19.75V10.25C21 9.55964 20.4404 9 19.75 9Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const SquareCheck = createIcon('square-check', [
  [
    'path',
    {
      d: 'M20 16.8V7.2C20 6.07989 20 5.51984 19.782 5.09202C19.5903 4.71569 19.2843 4.40973 18.908 4.21799C18.4802 4 17.9201 4 16.8 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.07989 4 7.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.0799 20 7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M15.4968 9.75L10.9968 14.25L8.99677 12.25', strokeLinecap: 'round', strokeLinejoin: 'round' }],
])
export const Sun = createIcon('sun', [
  [
    'path',
    {
      d: 'M12 3V2M12 22V21M18.3598 5.64005L19.0698 4.93005M4.93016 19.07L5.64016 18.36M21 12H22M2 12H3M18.3598 18.36L19.0698 19.07M4.93016 4.93005L5.64016 5.64005M15.5355 8.46447C17.4882 10.4171 17.4882 13.5829 15.5355 15.5355C13.5829 17.4882 10.4171 17.4882 8.46447 15.5355C6.51185 13.5829 6.51185 10.4171 8.46447 8.46447C10.4171 6.51185 13.5829 6.51185 15.5355 8.46447Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const Television = createIcon('television', [
  [
    'path',
    {
      d: 'M3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V14C21 15.1046 20.1046 16 19 16H5C3.89543 16 3 15.1046 3 14V6Z',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  [
    'path',
    {
      d: 'M18 20C16.114 19.3513 14.0967 19 12 19C9.90334 19 7.88601 19.3513 6 20',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const TrashCan = createIcon('trash-can', [
  [
    'path',
    {
      d: 'M5 6.5L5.87156 19.1376C5.94388 20.1863 6.81565 21 7.86682 21H16.1332C17.1843 21 18.0561 20.1863 18.1284 19.1376L19 6.5',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  ['path', { d: 'M10 11V16', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M14 11V16', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M3.5 6H20.5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  [
    'path',
    {
      d: 'M8.07092 5.74621C8.42348 3.89745 10.0485 2.5 12 2.5C13.9515 2.5 15.5765 3.89745 15.9291 5.74621',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
])
export const Zap = createIcon('zap', [
  [
    'path',
    {
      d: 'M19.5657 9H13.5C13.2239 9 13 8.77614 13 8.5V2.40139C13 1.90668 12.3584 1.71242 12.084 2.12404L4.01823 14.2226C3.79672 14.5549 4.03491 15 4.43426 15H10.5C10.7761 15 11 15.2239 11 15.5V21.5986C11 22.0933 11.6416 22.2876 11.916 21.876L19.9818 9.77735C20.2033 9.44507 19.9651 9 19.5657 9Z',
      strokeLinejoin: 'round',
    },
  ],
])
