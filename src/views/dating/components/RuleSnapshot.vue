<template>
  <section class="rule-snapshot">
    <template v-if="rule">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="规则版本">{{ rule.ruleVersion ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="选项模式">{{ rule.selectionMode === 'SINGLE' ? '单选' : '多选' }}</el-descriptions-item>
        <el-descriptions-item label="扣次条件">所选服务选项全部满足</el-descriptions-item>
      </el-descriptions>
      <el-table :data="rule.options || []" border class="options-table">
        <el-table-column prop="name" label="服务选项" min-width="110" />
        <el-table-column prop="completionStandard" label="完成标准" min-width="170" />
      </el-table>
    </template>
    <el-empty v-else description="暂无规则快照" :image-size="60" />
  </section>
</template>

<script setup>
const props = defineProps({ snapshot: { type: [String, Object], default: null } })
const rule = computed(() => {
  try {
    const value = typeof props.snapshot === 'string' ? JSON.parse(props.snapshot) : props.snapshot
    return value && value.matchMode === 'ALL' && Array.isArray(value.options) ? value : null
  } catch { return null }
})
</script>

<style scoped>
.rule-snapshot { min-width: 0; overflow-wrap: anywhere; }
.options-table { margin-top: 12px; }
</style>
