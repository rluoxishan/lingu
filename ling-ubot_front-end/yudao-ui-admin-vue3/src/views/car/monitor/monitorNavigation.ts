import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

/** 车辆列表页路径（与 hidden 路由、菜单 activeMenu 对齐） */
export const CAR_LIST_PATH = '/car/list'

const LIST_ROUTE_NAMES = new Set(['CarList', 'CarListPage'])

function is404Route(route: ReturnType<Router['resolve']>): boolean {
  return route.matched.some((m) => m.name === '404Page' || m.name === 'NoFound')
}

function tryResolvePath(router: Router, path: string): string | null {
  if (!path.startsWith('/')) return null
  const resolved = router.resolve(path)
  return is404Route(resolved) ? null : path.split('?')[0]
}

/** 解析可跳转的车辆列表 path */
export function resolveCarListPath(router: Router): string {
  for (const r of router.getRoutes()) {
    if (r.name && LIST_ROUTE_NAMES.has(String(r.name))) {
      const resolved = router.resolve({ name: r.name })
      if (!is404Route(resolved)) {
        return resolved.fullPath.split('?')[0] || CAR_LIST_PATH
      }
    }
  }
  return tryResolvePath(router, CAR_LIST_PATH) ?? '/index'
}

/** 监控页返回车辆列表 */
export function goBackToCarList(router: Router, route: RouteLocationNormalizedLoaded): void {
  const fromQuery = route.query.from
  if (typeof fromQuery === 'string') {
    const hit = tryResolvePath(router, fromQuery)
    if (hit) {
      void router.push(hit)
      return
    }
  }

  const activeMenu = route.meta?.activeMenu
  if (typeof activeMenu === 'string') {
    const hit = tryResolvePath(router, activeMenu)
    if (hit) {
      void router.push(hit)
      return
    }
  }

  void router.push(resolveCarListPath(router))
}

/** 列表页跳转监控页时带上来源 */
export function buildMonitorRouteQuery(
  base: Record<string, string | undefined>,
  fromFullPath: string
): Record<string, string | undefined> {
  return { ...base, from: fromFullPath }
}
