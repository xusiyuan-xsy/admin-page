export function requirementLimits(config, currentYear) {
  return {
    ageMin: config?.minAge ?? 1900,
    ageMax: config?.maxAge ?? currentYear,
    heightMin: config?.minHeight ?? 100,
    heightMax: config?.maxHeight ?? 250
  }
}

export function applyRequirementDefaults(form, config, currentYear) {
  if (!config) return form
  const limits = requirementLimits(config, currentYear)
  return {
    ...form,
    ageMin: form.ageMin ?? (config.minAge != null ? limits.ageMin : undefined),
    ageMax: form.ageMax ?? (config.maxAge != null ? limits.ageMax : undefined),
    heightMin: form.heightMin ?? config.minHeight ?? undefined,
    heightMax: form.heightMax ?? config.maxHeight ?? undefined
  }
}

export function requirementFieldError(field, value, form, config, currentYear, labels = {}) {
  if (config?.requiredFields?.includes(field) && (value == null || String(value).trim() === ''))
    return `请填写${labels[field] || '此必填项'}`
  const limits = requirementLimits(config, currentYear)
  const age = ['ageMin', 'ageMax'].includes(field)
  const height = ['heightMin', 'heightMax'].includes(field)
  if ((age || height) && value != null) {
    const min = age ? limits.ageMin : limits.heightMin
    const max = age ? limits.ageMax : limits.heightMax
    if (!Number.isInteger(value) || value < min || value > max)
      return `${age ? '出生年份' : '身高'}须在${min}-${max}内`
  }
  if (age && form.ageMin != null && form.ageMax != null && form.ageMin > form.ageMax)
    return '最早出生年份不能大于最晚出生年份'
  if (height && form.heightMin != null && form.heightMax != null && form.heightMin > form.heightMax)
    return '最低身高不能大于最高身高'
  if (field === 'cityRequire' && form.acceptLongDist === '0' && !String(value ?? '').trim())
    return '选择现居城市要求'
  return ''
}
