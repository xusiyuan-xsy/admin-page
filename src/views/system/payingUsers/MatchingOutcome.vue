<template>
  <div class="matching-outcome">
    <div class="status-row">
      <el-tag size="small" :type="user.serviceEligible ? 'success' : 'info'">{{ statuses[user.serviceStatus] || '状态待核实' }}</el-tag>
      <el-tag size="small" :type="user.reciprocalStatus === 'MATCH' ? 'success' : 'warning'">
        {{ reciprocal[user.reciprocalStatus] || '反向待核实' }}
      </el-tag>
    </div>
    <div>红娘：{{ user.matchmakerName || '未分配' }}</div>
    <div>符合本方：{{ user.matchedConditions?.join('、') || '未限定结构化条件' }}</div>
    <div v-for="text in user.reverseConflicts || []" :key="text" class="conflict">{{ text }}</div>
    <div v-for="text in user.pendingConditions || []" :key="text" class="pending">{{ text }}</div>
    <div v-if="user.pairId">已有配对 #{{ user.pairId }} · {{ progresses[user.pairProgress] || user.pairProgress }}</div>
    <div v-if="!user.serviceEligible" class="pending">候选服务资格未满足</div>
    <div v-else-if="!user.sourceEligible" class="pending">本方服务资格未满足</div>
    <div class="actions">
      <el-button v-if="checkPermi(['system:payingUsers:query'])" link type="primary" icon="View" @click="$emit('detail', user)">查看档案</el-button>
      <el-button v-if="user.pairId && checkPermi(['dating:match:query']) && checkPermi(['dating:match:list'])"
        link type="primary" icon="Connection" @click="$emit('pair', user.pairId)">查看配对</el-button>
      <el-button v-if="!user.pairId && checkPermi(['dating:match:add'])" link type="primary" icon="Plus"
        :disabled="!user.serviceEligible || !user.sourceEligible" @click="$emit('recommend', user)">创建推荐</el-button>
    </div>
  </div>
</template>
<script setup>
import { checkPermi } from '@/utils/permission'
defineProps({ user: { type: Object, required: true } })
defineEmits(['detail', 'pair', 'recommend'])
const statuses = { NOT_STARTED: '未开通', SERVING: '服务中', NOT_RENEWED: '未续单', SUCCESS_CLOSED: '成功结案' }
const reciprocal = { MATCH: '双向条件符合', MISMATCH: '反向条件冲突', UNKNOWN: '反向资料待补充' }
const progresses = { COMMUNICATING: '沟通意向中', IN_PROGRESS: '双方已同意', FOLLOWING: '服务跟进中', REJECTED: '暂不继续', SUCCESS_CLOSED: '成功结案', TERMINATED: '已终止' }
</script>
<style scoped>
.matching-outcome { text-align: left; font-size: 12px; line-height: 1.8; overflow-wrap: anywhere; padding-top: 8px; }
.status-row, .actions { display: flex; flex-wrap: wrap; gap: 6px; }
.actions .el-button { margin-left: 0; }
.conflict { color: #b42318; }
.pending { color: #92630b; }
</style>
