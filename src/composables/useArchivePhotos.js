import { ref, watch, onBeforeUnmount } from 'vue'
import request from '@/utils/request'

export function archivePhotoReferences(value, archiveId) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  if (!Number.isSafeInteger(Number(archiveId)) || Number(archiveId) <= 0) return []
  const pattern = new RegExp(`^/dating/archives/${Number(archiveId)}/photos/[a-f0-9]{32}\\.(png|jpg)$`)
  return values.filter(value => typeof value === 'string' && pattern.test(value))
}

// Keep credentials in request headers; only short-lived browser object URLs reach <img>.
export function useArchivePhotos(source) {
  const photos = ref([])
  const failed = ref(false)
  const loading = ref(false)
  let generation = 0
  let controller
  const release = () => {
    photos.value.forEach(photo => URL.revokeObjectURL(photo.url))
    photos.value = []
  }
  const stop = watch(source, async ({ value, archiveId }) => {
    const current = ++generation
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    release()
    failed.value = false
    loading.value = true
    const loaded = await Promise.all(archivePhotoReferences(value, archiveId).map(async reference => {
      try {
        const blob = await request({ url: reference, method: 'get', responseType: 'blob', signal })
        if (!['image/png', 'image/jpeg'].includes(blob.type)) throw new Error('Invalid photo response')
        return { reference, name: reference, url: URL.createObjectURL(blob) }
      } catch {
        if (current === generation) failed.value = true
        return null
      }
    }))
    const successful = loaded.filter(Boolean)
    if (current !== generation) successful.forEach(photo => URL.revokeObjectURL(photo.url))
    else {
      photos.value = successful
      loading.value = false
    }
  }, { deep: true, immediate: true })
  onBeforeUnmount(() => {
    stop()
    generation++
    controller?.abort()
    release()
  })
  return { photos, failed, loading }
}
