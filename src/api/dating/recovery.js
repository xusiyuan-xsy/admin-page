import request from '@/utils/request'

export const listExceptions = params => request({ url: '/dating/deduction-exceptions', method: 'get', params })
export const taskHistory = (id, params) => request({ url: `/dating/deduction-tasks/${id}/history`, method: 'get', params })
export const recoveryOverview = () => request({ url: '/dating/recovery/overview', method: 'get' })
export const recoveryRuns = params => request({ url: '/dating/recovery/runs', method: 'get', params })
export const getFollowup = id => request({ url: `/dating/deduction-tasks/${id}/follow-up`, method: 'get' })
export const followupHistory = (id, params) => request({ url: `/dating/deduction-tasks/${id}/follow-up/history`, method: 'get', params })
export const saveFollowup = (id, data) => request({ url: `/dating/deduction-tasks/${id}/follow-up`, method: 'post', data })
