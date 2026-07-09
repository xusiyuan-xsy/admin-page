<template>
  <el-cascader
    ref="cascaderRef"
    v-model="selected"
    :props="cascaderProps"
    :placeholder="placeholder"
    :clearable="clearable"
    :style="{ width: width }"
    @change="handleChange"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import { listRegion } from '@/api/system/region'

/**
 * 省市区级联选择器（懒加载，后端 /system/region 提供数据）
 * 双向绑定：
 *   v-model            -> 行政编码路径字符串（逗号连，如 "440000,440300,440305"）
 *   v-model:name       -> 名称路径字符串（"/" 连，如 "广东省/深圳市/南山区"）
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  name: { type: String, default: '' },
  placeholder: { type: String, default: '请选择省/市/区' },
  clearable: { type: Boolean, default: true },
  width: { type: String, default: '100%' },
  // 允许选择任意层级（省/市），用于筛选与择偶要求；默认必须选到区（叶子）
  checkStrictly: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'update:name'])

const cascaderRef = ref(null)
const selected = ref(codeStrToArr(props.modelValue))

function codeStrToArr(str) {
  return str ? String(str).split(',').filter(Boolean) : []
}

const cascaderProps = {
  lazy: true,
  value: 'code',
  label: 'name',
  leaf: 'leaf',
  checkStrictly: props.checkStrictly,
  lazyLoad(node, resolve) {
    const parentCode = node.root ? '' : node.value
    listRegion(parentCode).then(res => {
      const list = (res.data || []).map(item => ({
        code: item.code,
        name: item.name,
        leaf: item.leaf === true || item.level === 3
      }))
      resolve(list)
    }).catch(() => resolve([]))
  }
}

// 外部值变化（如编辑回填）时同步内部
watch(() => props.modelValue, (val) => {
  const arr = codeStrToArr(val)
  if (arr.join(',') !== selected.value.join(',')) {
    selected.value = arr
  }
})

function handleChange(value) {
  const codeStr = Array.isArray(value) ? value.join(',') : ''
  emit('update:modelValue', codeStr)
  // 取选中路径的名称
  let nameStr = ''
  const nodes = cascaderRef.value && cascaderRef.value.getCheckedNodes()
  if (nodes && nodes.length && nodes[0].pathLabels) {
    nameStr = nodes[0].pathLabels.join('/')
  }
  emit('update:name', nameStr)
}
</script>
