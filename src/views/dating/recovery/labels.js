export const errorLabels = {
  DATA_CONFLICT: '数据一致性冲突', DATABASE_TRANSIENT: '数据库暂时不可用',
  DATABASE_ERROR: '数据库处理失败', BUSINESS_INVARIANT: '业务约束校验失败',
  PROCESSING_ERROR: '任务处理失败', MANUAL_RETRY: '人工重新核算'
}
export const healthLabels = {
  DISABLED: '恢复调度已停用', NOT_STARTED: '等待首次调度', STALE: '调度心跳超时',
  RUNNING: '处理中', SUCCEEDED: '正常', PARTIAL: '部分失败', FAILED: '扫描失败'
}
export const kindLabels = { ERROR: '技术异常', BLOCKED: '业务受阻', READY: '等待自动恢复' }
export const issueKind = row => row.status === 'ERROR' ? 'ERROR' : row.status === 'DONE' ? 'BLOCKED' : 'READY'
