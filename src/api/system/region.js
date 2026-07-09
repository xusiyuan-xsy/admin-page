import request from '@/utils/request'

// 按父编码查询下级行政区（parentCode 为空 → 省级），供级联懒加载
export function listRegion(parentCode) {
  return request({
    url: '/system/region/list',
    method: 'get',
    params: { parentCode }
  })
}

// 按编码解析省->市->区完整路径（供回填/展示）
export function getRegionPath(code) {
  return request({
    url: '/system/region/path/' + code,
    method: 'get'
  })
}
