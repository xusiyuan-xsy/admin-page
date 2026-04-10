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