import request from '@/config/axios'

// Type Definitions
export interface GroupVO {
  id: number
  name: string
  tenantId: number
  createTime?: string
  updateTime?: string
}

// Group Management API
export const GroupApi = {
  // Create a new group
  createGroup: async (data: { id: number; name: string; tenantId: number; }) => {
    return await request.post({
      url: '/device/group/create',
      data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  },

  // Fetch paginated list of groups
  getGroupPage: async (params: {
    pageNo: number
    pageSize: number
    name?: string
    tenantId?: number
  }) => {
    return await request.get({
      url: '/device/group/page',
      params,
    })
  },

  // Fetch details of a specific group
  getGroup: async (id: number, tenantId?: number) => {
    return await request.get({
      url: '/device/group/get',
      params: { id },
      headers: tenantId ? { 'tenant-id': tenantId } : undefined,
    })
  },

  // Update an existing group
  updateGroup: async (data: GroupVO) => {
    return await request.put({ url: '/device/group/update', data })
  },

  // Delete a group
  deleteGroup: async (id: number, tenantId?: number) => {
    return await request.delete({
      url: '/device/group/delete',
      params: { id },
      headers: tenantId ? { 'tenant-id': tenantId } : undefined,
    })
  },
}
