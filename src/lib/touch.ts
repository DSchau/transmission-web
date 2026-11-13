/**
 * After a touch outside an open menu, eats the tap it turns into, so closing the menu doesn't
 * also tap whatever was underneath. A scroll never becomes a tap, so scrolling still works.
 */
export function swallowNextClick() {
  const swallow = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    done()
  }
  const done = () => {
    document.removeEventListener('click', swallow, true)
    clearTimeout(timer)
  }
  const timer = setTimeout(done, 800)
  document.addEventListener('click', swallow, true)
}

export const isMouse = (event: { pointerType: string }) => event.pointerType === 'mouse'
