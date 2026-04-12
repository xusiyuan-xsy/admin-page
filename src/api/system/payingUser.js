import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 查询用户列表
export function listPayingUser(query) {
  return request({
    url: '/system/payingUsers/list',
    method: 'get',
    params: query
  })
}

// 查询付费用户详细
export function getPayingUser(id) {
  return request({
    url: '/system/payingUsers/' + parseStrEmpty(id),
    method: 'get'
  })
}

// 新增用户
export function addPayingUser(data) {
    return request({
      url: '/system/payingUsers',
      method: 'post',
      data: data
    })
  }
  
// 修改用户
export function updatePayingUser(data) {
  return request({
    url: '/system/payingUsers',
    method: 'put',
    data: data
  })
}

// 删除付费用户
export function delPayingUser(id) {
  return request({
    url: '/system/payingUsers/' + id,
    method: 'delete'
  })
}