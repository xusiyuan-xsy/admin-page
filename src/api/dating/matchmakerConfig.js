import request from '@/utils/request'

export const listMatchmakerConfigs = params => request({ url: '/dating/matchmaker-configs', params })
export const getActiveMatchmakerConfig = () => request({ url: '/dating/matchmaker-configs/active' })
export const saveMatchmakerConfig = data => request({
  url: data.configId ? `/dating/matchmaker-configs/${data.configId}` : '/dating/matchmaker-configs',
  method: data.configId ? 'put' : 'post', data
})
export const setDefaultMatchmakerConfig = (id, data) => request({
  url: `/dating/matchmaker-configs/${id}/default`, method: 'put', data
})
export const deleteMatchmakerConfig = (id, version) => request({
  url: `/dating/matchmaker-configs/${id}`, method: 'delete', params: { version }
})
