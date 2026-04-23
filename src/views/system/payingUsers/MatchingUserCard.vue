<template>
  <div class="user-card">
    <!-- 头像区域 -->
    <div class="user-card__avatar-wrap">
      <div class="user-card__avatar">
        <!-- 无图片时显示占位图标 -->
        <el-icon v-if="!photoList.length" class="user-card__avatar-icon"><User /></el-icon>
        <!-- 单张图片直接显示 -->
        <el-image
          v-else-if="photoList.length === 1"
          :src="photoList[0]"
          :preview-src-list="photoList"
          :initial-index="0"   
          preview-teleported
          fit="contain"
          class="user-card__avatar-img"
        />
        <!-- 多张图片轮播 -->
        <el-carousel
          v-else
          height="260px"
          :autoplay="false"
          arrow="hover"
          indicator-position="outside"
          class="user-card__carousel"
        >
          <el-carousel-item v-for="(src, idx) in photoList" :key="idx">
            <el-image
              :src="src"
              :preview-src-list="photoList"
              :initial-index="idx"
              preview-teleported
              fit="contain"
              class="user-card__avatar-img"
            />
          </el-carousel-item>
        </el-carousel>
      </div>
    </div>

    <!-- 信息区域 -->
    <div class="user-card__info">
      <div class="user-card__info-grid">
        <div class="user-card__info-item">
          <span class="user-card__info-label">出生年份</span>
          <span class="user-card__info-value">{{ user.birthYear ? user.birthYear + '年' : '—' }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">现居城市</span>
          <span class="user-card__info-value" :title="user.currentCity">{{ user.currentCity || '—' }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">身高</span>
          <span class="user-card__info-value">{{ user.height ? user.height + 'cm' : '—' }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">家庭成员</span>
          <span class="user-card__info-value" :title="user.familyDesc">{{ user.familyDesc || '—' }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">家乡</span>
          <span class="user-card__info-value" :title="user.hometown">{{ user.hometown || '—' }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">是否有车</span>
          <span class="user-card__info-value">{{ formatYesNo(user.hasCar) }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">职业</span>
          <span class="user-card__info-value" :title="user.occupation">{{ user.occupation || '—' }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">是否有房</span>
          <span class="user-card__info-value">{{ formatYesNo(user.hasHouse) }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">学历</span>
          <span class="user-card__info-value">{{ getEducationLabel(user.education) }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">兴趣爱好</span>
          <span class="user-card__info-value" :title="user.hobby">{{ user.hobby || '—' }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">月收入</span>
          <span class="user-card__info-value">
            {{ user.monthlyIncome != null && user.monthlyIncome !== '' ? user.monthlyIncome + '元' : '—' }}
          </span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">个人优点</span>
          <span class="user-card__info-value" :title="user.personalAdvantage">{{ user.personalAdvantage || '—' }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">抽烟情况</span>
          <span class="user-card__info-value">{{ formatSmokeOrDrink(user.smokeHabit) }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">喝酒情况</span>
          <span class="user-card__info-value">{{ formatSmokeOrDrink(user.drinkHabit) }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">手机号码</span>
          <span class="user-card__info-value">{{ user.phone || '—' }}</span>
        </div>
        <div class="user-card__info-item">
          <span class="user-card__info-label">接受异地</span>
          <span class="user-card__info-value">{{ formatAcceptLongDist(user.acceptLongDist) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { User } from '@element-plus/icons-vue'

const props = defineProps({
  user: {
    type: Object,
    default: () => ({})
  },
  sysUserSex: {
    type: Array,
    default: () => []
  },
  sysUserEducation: {
    type: Array,
    default: () => []
  },
  sysNormalDisable: {
    type: Array,
    default: () => []
  }
})

// 兼容 photos 为数组或逗号分隔字符串两种格式
const photoList = computed(() => {
  const p = props.user.photos
  if (!p) return []
  if (Array.isArray(p)) return p.filter(Boolean)
  if (typeof p === 'string') return p.split(',').map(s => s.trim()).filter(Boolean)
  return []
})

function getSexLabel(val) {
  const item = props.sysUserSex.find(o => o.value === String(val))
  return item ? item.label : val
}

function getEducationLabel(val) {
  if (val === undefined || val === null || val === '') return '—'
  const item = props.sysUserEducation.find(o => o.value === String(val))
  return item ? item.label : val
}

function formatYesNo(val) {
  if (val === undefined || val === null || val === '') return '—'
  return val == '1' || val === true ? '有' : '无'
}

function formatSmokeOrDrink(val) {
  if (val === undefined || val === null || val === '') return '—'
  const map = { '0': '否', '1': '偶尔', '2': '经常' }
  return map[String(val)] || '—'
}

function formatAcceptLongDist(val) {
  if (val === undefined || val === null || val === '') return '—'
  return val == '1' || val === true ? '接受' : '不接受'
}
</script>

<style scoped>
.user-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}
.user-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.16);
}

/* 头像区域 */
.user-card__avatar-wrap {
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
}
.user-card__avatar {
  width: 100%;
  height: 220px;
  background: #dce3ed;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.user-card__carousel {
  width: 100%;
}
:deep(.user-card__carousel .el-carousel__container) {
  height: 220px;
}
:deep(.user-card__carousel .el-carousel__indicators--outside) {
  position: absolute;
  bottom: 4px;
  left: 0;
  right: 0;
  margin: 0;
}
:deep(.user-card__carousel .el-carousel__button) {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
}
:deep(.user-card__carousel .el-carousel__indicator.is-active .el-carousel__button) {
  background: #fff;
}
.user-card__avatar-icon {
  font-size: 72px;
  color: #a0aec0;
}
.user-card__avatar-img {
  width: 100%;
  height: 100%;
  cursor: zoom-in;
  background: #f0f2f5;
}
:deep(.user-card__avatar-img .el-image__inner) {
  object-fit: contain;
  width: 100%;
  height: 100%;
}

/* 信息区域 */
.user-card__info {
  padding: 12px 16px 14px;
  flex: 1;
  background: #fafafa;
}
.user-card__info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 8px;
}
.user-card__info-item {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 4px;
  line-height: 1.8;
}
.user-card__info-label {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  flex-shrink: 0;
}
.user-card__info-label::after {
  content: '：';
}
.user-card__info-value {
  font-size: 12px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
</style>
