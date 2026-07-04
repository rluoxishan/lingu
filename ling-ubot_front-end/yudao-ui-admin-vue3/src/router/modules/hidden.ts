import { Layout } from '@/utils/routerHelper'

/** 本地隐藏详情页路由（动态菜单不包含，登录后追加注册） */
export const hiddenDetailRoutes: AppRouteRecordRaw[] = [
  {
    path: '/car/list',
    component: Layout,
    name: 'CarListParent',
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'CarList',
        component: () => import('@/views/car/list/index.vue'),
        meta: {
          title: '车辆管理',
          hidden: true,
          noCache: false,
          canTo: true
        }
      }
    ]
  },
  {
    path: '/car/monitor',
    component: Layout,
    name: 'CarMonitorParent',
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'CarCarMonitor',
        component: () => import('@/views/car/monitor/index.vue'),
        meta: {
          title: '远程监控和控制',
          hidden: true,
          noCache: true,
          canTo: true,
          activeMenu: '/car/list'
        }
      }
    ]
  },
  {
    path: '/car/car/monitor',
    component: Layout,
    name: 'CarCarMonitorParent',
    meta: { hidden: true },
    children: [
      {
        path: ':vehicleId',
        name: 'CarCarMonitorLegacy',
        component: () => import('@/views/car/monitor/index.vue'),
        meta: {
          title: '远程监控和控制',
          hidden: true,
          noCache: true,
          canTo: true,
          activeMenu: '/car/list'
        }
      }
    ]
  }
]
