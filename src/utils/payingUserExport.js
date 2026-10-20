export function formatExportBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function payingUserExportExtension(blob) {
  const type = blob.type.split(';')[0].toLowerCase()
  if (type === 'application/json') {
    let result
    try {
      result = JSON.parse(await blob.text())
    } catch {
      throw new Error('导出响应异常，请刷新后重试')
    }
    throw new Error(result.msg || '导出失败，请刷新后重试')
  }
  const extension = {
    'application/zip': 'zip',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
  }[type]
  const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
  if (!extension || signature.length !== 4 || signature[0] !== 0x50 || signature[1] !== 0x4b
    || signature[2] !== 0x03 || signature[3] !== 0x04) {
    throw new Error('导出文件格式异常，请刷新后重试')
  }
  return extension
}
