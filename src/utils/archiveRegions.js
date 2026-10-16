// Archive APIs persist names, while RegionCascader requires a code path.
export async function hydrateArchiveRegions(archive, loadChildren) {
  const cache = new Map()
  async function resolve(name) {
    if (!name?.trim()) return ''
    let parent = ''
    const codes = []
    for (const label of name.split('/').map(part => part.trim())) {
      if (!cache.has(parent)) {
        cache.set(parent, Promise.resolve(loadChildren(parent)))
      }
      const children = await cache.get(parent)
      const matches = children.filter(child => child.name === label)
      if (matches.length !== 1) return ''
      parent = String(matches[0].code)
      codes.push(parent)
    }
    return codes.join(',')
  }
  const [currentCityCode, hometownCode] = await Promise.all([
    archive.currentCityCode || resolve(archive.currentCity),
    archive.hometownCode || resolve(archive.hometown)
  ])
  return { ...archive, currentCityCode, hometownCode }
}
