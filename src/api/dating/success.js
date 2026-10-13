import request from '@/utils/request'

export const successPolicy = () => request({ url: '/dating/success-policy', method: 'get' })
export const closeSuccess = (id, data) => request({ url: `/dating/matches/${id}/close-success`, method: 'post', data })
export const listSuccessCases = params => request({ url: '/dating/success-cases', method: 'get', params })
export const successStats = params => request({ url: '/dating/success-cases/stats', method: 'get', params })
export const successMatchmakers = () => request({ url: '/dating/success-cases/matchmakers', method: 'get' })
export const getSuccessCase = id => request({ url: `/dating/success-cases/${id}`, method: 'get' })
