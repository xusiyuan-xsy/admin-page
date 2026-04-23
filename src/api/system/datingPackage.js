import request from '@/utils/request'

// 查询套餐列表
export function listDatingPackage(query) {
  return request({
    url: '/system/datingPackage/list',
    method: 'get',
    params: query
  })
}

// 查询套餐详情
export function getDatingPackage(packageId) {
  return request({
    url: '/system/datingPackage/' + packageId,
    method: 'get'
  })
}

// 新增套餐
export function addDatingPackage(data) {
  return request({
    url: '/system/datingPackage',
    method: 'post',
    data: data
  })
}

// 修改套餐
export function updateDatingPackage(data) {
  return request({
    url: '/system/datingPackage',
    method: 'put',
    data: data
  })
}

// 删除/批量删除套餐
export function delDatingPackage(packageIds) {
  return request({
    url: '/system/datingPackage/' + packageIds,
    method: 'delete'
  })
}
