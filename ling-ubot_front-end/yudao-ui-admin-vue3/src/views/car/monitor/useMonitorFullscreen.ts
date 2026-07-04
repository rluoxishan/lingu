import { onMounted, onUnmounted, ref, type Ref } from 'vue'

function getFullscreenElement(): Element | null {
  return (
    document.fullscreenElement ??
    (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ??
    null
  )
}

async function requestFullscreen(el: HTMLElement): Promise<void> {
  if (el.requestFullscreen) {
    await el.requestFullscreen()
    return
  }
  const legacy = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
  if (legacy.webkitRequestFullscreen) {
    await legacy.webkitRequestFullscreen()
  }
}

async function exitFullscreen(): Promise<void> {
  if (document.exitFullscreen) {
    await document.exitFullscreen()
    return
  }
  const legacy = document as Document & { webkitExitFullscreen?: () => Promise<void> }
  if (legacy.webkitExitFullscreen) {
    await legacy.webkitExitFullscreen()
  }
}

/** 监控页根节点全屏（不含管理后台顶栏/侧栏） */
export function useMonitorFullscreen(rootRef: Ref<HTMLElement | null | undefined>) {
  const isFullscreen = ref(false)
  const supported = ref(true)

  function syncState() {
    const el = rootRef.value
    isFullscreen.value = !!el && getFullscreenElement() === el
  }

  async function enter() {
    const el = rootRef.value
    if (!el) return
    try {
      await requestFullscreen(el)
    } catch {
      supported.value = false
    }
  }

  async function exit() {
    if (!getFullscreenElement()) return
    try {
      await exitFullscreen()
    } catch {
      /* ignore */
    }
  }

  async function toggle() {
    if (isFullscreen.value) await exit()
    else await enter()
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', syncState)
    document.addEventListener('webkitfullscreenchange', syncState)
    syncState()
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', syncState)
    document.removeEventListener('webkitfullscreenchange', syncState)
    if (rootRef.value && getFullscreenElement() === rootRef.value) {
      void exitFullscreen()
    }
  })

  return { isFullscreen, supported, enter, exit, toggle }
}
