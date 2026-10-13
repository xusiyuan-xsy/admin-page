import request from '@/utils/request'

export const listServiceOptions = params => request({ url: '/dating/service-options', params })
export const saveServiceOption = data => request({
  url: data.optionId ? `/dating/service-options/${data.optionId}` : '/dating/service-options',
  method: data.optionId ? 'put' : 'post', data
})
export const listCustomers = params => request({ url: '/dating/customers', params })
export const listAvailablePackages = () => request({ url: '/dating/packages' })
export const listOrders = params => request({ url: '/dating/orders', params })
export const getOrder = id => request({ url: `/dating/orders/${id}` })
export const createOrder = data => request({ url: '/dating/orders', method: 'post', data })
export const confirmPayment = (id, data) => request({
  url: `/dating/orders/${id}/confirm-payment`, method: 'post', data
})
export const cancelOrder = (id, reason) => request({
  url: `/dating/orders/${id}/cancel`, method: 'post', data: { reason }
})
export const listEntitlements = params => request({ url: '/dating/entitlements', params })
