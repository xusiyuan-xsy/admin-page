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