<template>
  <el-container id="root-container" class="root-container">
    <el-header class="header">
      <h2>堤丰 VS 蓝枪管</h2>
    </el-header>

    <el-main class="main">
      <!-- controls card: inputs on left, vertical stats on right, run button at bottom -->
      <el-card class="controls-card" shadow="never">
        <el-row :gutter="16" class="controls-main-row">
          <!-- 左侧：三组输入 -->
          <el-col :xs="24" :sm="24" :md="18" class="controls-left">
            <!-- 第一行：部位概率 -->
            <el-row :gutter="16" class="input-row">
              <el-col :xs="12" :sm="6" :md="6">
                <el-form-item label="头部概率">
                  <input type="number" v-model.number="probHead" step="0.01" class="plain-input" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="6" :md="6">
                <el-form-item label="胸/腹概率">
                  <input type="number" v-model.number="probChest" step="0.01" class="plain-input" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="6" :md="6">
                <el-form-item label="上臂概率">
                  <input type="number" v-model.number="probArm" step="0.01" class="plain-input" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="6" :md="6">
                <el-form-item label="下臂/腿概率">
                  <input type="number" v-model.number="probLeg" step="0.01" class="plain-input" />
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 第二行：血量、头盔耐久、护甲耐久 -->
            <el-row :gutter="16" class="input-row">
              <el-col :xs="12" :sm="6" :md="6">
                <el-form-item label="初始血量">
                  <input type="number" v-model.number="hp" step="1" class="plain-input" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="6" :md="6">
                <el-form-item label="头盔耐久">
                  <input type="number" v-model.number="helmet" step="1" class="plain-input" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="6" :md="6">
                <el-form-item label="护甲耐久">
                  <input type="number" v-model.number="vest" step="1" class="plain-input" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="6" :md="6">
                <!-- 空白占位 -->
              </el-col>
            </el-row>

            <!-- 第三行：随机因子、堤丰击败次数 -->
            <el-row :gutter="16" class="input-row">
              <el-col :xs="12" :sm="6" :md="6">
                <el-form-item label="随机因子">
                  <input type="number" v-model.number="seed" step="1" class="plain-input" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="6" :md="6">
                <el-form-item label="模拟次数">
                  <input type="number" v-model.number="count" step="100" min="1" class="plain-input" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="12">
                <div class="description-text">模拟堤丰M7击杀场景，结果括号内的数字表示去重场景</div>
              </el-col>
            </el-row>
          </el-col>

          <!-- 右侧：统计信息 -->
          <el-col :xs="24" :sm="24" :md="6" class="controls-right">
            <div class="vertical-stats">
              <div class="stat-item"><div class="stat-label">堤丰致死总数</div><div class="stat-value">{{ safeResult.totalSimulated }}({{ safeResult.uniqueSequences }})</div></div>
              <div class="stat-item"><div class="stat-label">蓝管仍能致死</div><div class="stat-value">{{ safeResult.occStillKill }}({{ safeResult.uniqueStillKill }})</div></div>
              <div class="stat-item"><div class="stat-label">蓝管无法致死</div><div class="stat-value">{{ safeResult.occNotKill }}({{ safeResult.uniqueNotKill }})</div></div>
            </div>
          </el-col>
        </el-row>

        <!-- 运行按钮放在 card 最下方 -->
        <div class="controls-footer">
          <el-button type="primary" :loading="running" @click="run" style="width:100%;">运行模拟</el-button>
        </div>
      </el-card>

      <!-- 结果展示区 -->
      <el-row :gutter="16" class="result-row">
        <!-- 无法致死场景列表（左侧） -->
        <el-col :xs="24" :md="8" class="left-panel">
          <el-card class="list-card">
            <div class="list-header">
              <span class="title">蓝枪管无法致死的场景</span>
              <el-select v-model="viewWeapon" size="small" style="width: 140px;">
                <el-option label="堤丰 (40肉/42甲)" value="typhoon" />
                <el-option label="蓝枪管 (38肉/40甲)" value="blue" />
              </el-select>
            </div>

            <el-scrollbar class="list-scrollbar">
              <el-empty
                v-if="!result || !result.notKillSeqs || result.notKillSeqs.length === 0"
                description="暂无数据，请先运行模拟"
              />
              <el-list v-else>
                <el-list-item
                  v-for="(s, i) in result.notKillSeqs"
                  :key="i"
                  :class="{ 'is-active': selectedIndex === i + 1 }"
                  @click="showSequenceLog(s, i + 1)"
                  class="seq-list-item"
                >
                  <div class="seq-item">
                    <span class="seq-number">场景 #{{ i + 1 }}</span>
                    <span class="seq-text">{{ s.replace(/\|/g, '-').replace(/-$/, '') }}</span>
                  </div>
                </el-list-item>
              </el-list>
            </el-scrollbar>
          </el-card>
        </el-col>

        <!-- 场景日志（合并血量变化） -->
        <el-col :xs="24" :md="16" class="middle-panel">
          <el-card class="detail-card">
            <div class="detail-header">
              场景日志
              <span v-if="selectedIndex" class="seq-id">#{{ selectedIndex }}</span>
              <span v-if="selectedSeq" class="initial-hp-info">初始血量: {{ seqDetail.initialHP }}</span>
            </div>
            <div class="detail-content">
              <div v-if="selectedSeq && displayShots.length > 0" class="timeline-wrapper">
                <el-timeline>
                  <el-timeline-item
                    v-for="(shot, idx) in displayShots"
                    :key="idx"
                    :timestamp="'第 ' + shot.shotIndex + ' 枪'"
                    placement="top"
                  >
                    <div class="shot-text">
                      {{ shot.text }}
                      <span class="hp-inline">剩余 HP: <strong>{{ shot.remainingHP }}</strong></span>
                    </div>
                  </el-timeline-item>
                </el-timeline>
              </div>
              <el-empty v-else description="点击左侧场景查看逐枪日志" />
            </div>
            <div class="reference-text">*胸与腹,下臂与腿均视为同一部位(默认击中部位概率与日志格式参考自dfttk.com)</div>
          </el-card>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script>
import { runSimulation, generateShotLog } from './simulator.js';

export default {
  name: 'App',
  data() {
    return {
      probHead: 0.17,
      probChest: 0.48,
      probArm: 0.11,
      probLeg: 0.24,
      hp: 100,
      helmet: 50,
      vest: 125,
      seed: 33,
      count: 5000,
      running: false,
      result: null,
      error: null,
      viewWeapon: 'typhoon',
      selectedSeq: null,
      selectedIndex: null,
      seqDetail: { shots: [], initialHP: 0 }
    };
  },
  computed: {
    safeNotKillSeqs() { return (this.result && Array.isArray(this.result.notKillSeqs)) ? this.result.notKillSeqs : []; },
    safeResult() {
      return {
        totalSimulated: this.result?.totalSimulated || 0,
        uniqueSequences: this.result?.uniqueSequences || 0,
        uniqueStillKill: this.result?.uniqueStillKill || 0,
        uniqueNotKill: this.result?.uniqueNotKill || 0,
        occStillKill: this.result?.occStillKill || 0,
        occNotKill: this.result?.occNotKill || 0
      };
    },
    displayShots() {
      if (!this.seqDetail || !Array.isArray(this.seqDetail.shots)) return [];
      return this.seqDetail.shots.slice(); // chronological: shot1..shotN
    },
    formModel() { return {}; }
  },
  watch: {
    viewWeapon() {
      // 如果已选中场景，重新生成详情
      if (this.selectedSeq !== null && this.selectedIndex !== null) {
        this.refreshSequenceLog();
      }
    }
  },
  methods: {
    async run() {
      this.error = null;
      this.result = null;
      this.selectedSeq = null;
      this.selectedIndex = null;
      this.seqDetail = { shots: [], initialHP: 0 };

      const probs = [this.probHead, this.probChest, this.probArm, this.probLeg].map(Number);
      if (probs.some(p => isNaN(p) || p < 0)) {
        this.$message.error('概率必须为非负数');
        return;
      }
      const sum = probs.reduce((a, b) => a + b, 0);
      if (sum <= 0) {
        this.$message.error('概率总和必须大于 0');
        return;
      }
      if (sum !== 1) {
        this.$message.warning('概率总和不为 1，已自动归一化');
      }

      this.running = true;

      try {
        const res = await new Promise((resolve, reject) => {
          setTimeout(() => {
            try {
              const out = runSimulation({
                probabilities: probs,
                hp: Number(this.hp),
                helmet: Number(this.helmet),
                vest: Number(this.vest),
                seed: Number(this.seed),
                count: Number(this.count) || 5000
              });
              resolve(out);
            } catch (err) {
              reject(err);
            }
          }, 10);
        });
        this.result = res;
        this.$message.success('模拟完成！');
      } catch (e) {
        this.error = e.message || String(e);
        this.$message.error('模拟失败: ' + this.error);
      } finally {
        this.running = false;
      }
    },
    showSequenceLog(seq, index) {
      if (this.selectedSeq === seq) {
        this.selectedSeq = null;
        this.selectedIndex = null;
        this.seqDetail = { shots: [], initialHP: 0 };
        return;
      }

      this.selectedSeq = seq;
      this.selectedIndex = index;
      this.refreshSequenceLog();
    },
    refreshSequenceLog() {
      if (!this.selectedSeq) return;
      
      try {
        const detail = generateShotLog(this.selectedSeq, {
          weapon: this.viewWeapon,
          hp: Number(this.hp),
          helmet: Number(this.helmet),
          vest: Number(this.vest)
        });
        this.seqDetail = { shots: detail.shots || [], initialHP: detail.initialHP || this.hp };
      } catch (e) {
        this.$message.error(`生成日志出错：${e.message || e}`);
        this.seqDetail = { shots: [], initialHP: this.hp };
      }
    }
  }
};
</script>
<style scoped>
/* ==================== 全局容器 & 头部 ==================== */
.root-container {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.main {
  overflow-x: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.main :deep(.el-main) {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px;
  text-align: center;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header h2 {
  margin: 0;
  font-size: 1.9rem;
  font-weight: 600;
}

/* ==================== 控制面板 ==================== */
.controls-card {
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  background: white;
}

.controls-main-row {
  margin-bottom: 0;
}

.controls-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-row {
  margin-bottom: 0;
}

.controls-right {
  display: flex;
  align-items: flex-start;
}

.vertical-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  width: 100%;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 6px 8px;
  background: #f7fbff;
  border: 1px solid #e6f4ff;
  border-radius: 6px;
}

.stat-label {
  color: #666;
  font-size: 0.875rem;
}

.stat-value {
  font-weight: 700;
  color: #303133;
}

.controls-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eef3f8;
}

/* ==================== 结果统计标签 ==================== */
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

/* ==================== 场景列表 & 详情区域 ==================== */
.list-card,
.detail-card {
  height: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.detail-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px;
  overflow: hidden;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.timeline-wrapper {
  padding-bottom: 8px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 0.9375rem;
  color: #303133;
}

.list-header .title {
  font-weight: 600;
  font-size: 0.9375rem;
  color: #303133;
}

.list-scrollbar {
  height: 460px; /* 可考虑改为 min-height + flex 布局 */
}

.seq-list-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.seq-list-item.is-active {
  background: #e6f7ff;
}

.seq-list-item.is-active .seq-number {
  border-left: 4px solid #409eff;
  padding-left: 8px;
}

.seq-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.seq-number {
  font-weight: 600;
  color: #409eff;
  flex-shrink: 0;
}

.seq-text {
  color: #666;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-header {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  font-weight: 600;
  font-size: 0.9375rem;
  margin-bottom: 12px;
  color: #303133;
}

.seq-id {
  color: #409eff;
  margin-left: 8px;
}

.initial-hp-info {
  color: #f56c6c;
  margin-left: 12px;
  font-weight: 600;
}

.shot-text {
  color: #666;
  font-size: 0.875rem;
  line-height: 1.6;
}

.hp-inline {
  color: #f56c6c;
  margin-left: 8px;
  font-weight: 600;
}

.hp-inline strong {
  color: #f56c6c;
}

.reference-text {
  font-size: 0.8125rem;
  color: #909399;
  text-align: right;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid #ebeef5;
  flex-shrink: 0;
}

/* basic style for plain inputs to match layout */
.plain-input {
  width: 100%;
  max-width: 120px;
  padding: 6px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 14px;
  text-align: left;
}

/* 表单标签对齐 - 每列标签末尾对齐 */
/* 第一列：头部概率、HP、随机因子 - 统一宽度使最后一个字对齐 */
.input-row .el-col:nth-child(1) :deep(.el-form-item__label) {
  width: 70px !important;
  text-align: right;
  display: flex;
  justify-content: flex-end;
}

/* 第二列：胸/腹概率、头盔耐久、堤丰击败次数 - 统一宽度使最后一个字对齐 */
.input-row .el-col:nth-child(2) :deep(.el-form-item__label) {
  width: 100px !important;
  text-align: right;
  display: flex;
  justify-content: flex-end;
}

/* 第三列：上臂概率、护甲耐久 */
.input-row .el-col:nth-child(3) :deep(.el-form-item__label) {
  width: 70px !important;
  text-align: right;
  display: flex;
  justify-content: flex-end;
}

/* 第四列：下臂/腿概率 */
.input-row .el-col:nth-child(4) :deep(.el-form-item__label) {
  width: 90px !important;
  text-align: right;
  display: flex;
  justify-content: flex-end;
}

/* 表单项内容左对齐 */
.controls-left :deep(.el-form-item__content) {
  display: flex;
  justify-content: flex-start;
}

/* 标签字体大小和间距 */
.controls-left :deep(.el-form-item__label) {
  font-size: 0.875rem;
  padding-right: 6px !important;
}

/* 描述文字样式 */
.description-text {
  font-size: 0.8125rem;
  color: #909399;
  line-height: 1.5;
  padding: 8px 0;
}

/* 时间线左边距 */
:deep(.el-timeline) {
  padding-left: 20px !important;
}

/* ==================== 响应式调整 ==================== */
@media (max-width: 992px) {
  .result-row > .el-col {
    margin-bottom: 16px;
  }
}

@media (max-width: 768px) {
  .header h2 {
    font-size: 1.6rem;
  }

  .controls-card {
    padding: 18px;
  }

  .controls-left {
    margin-bottom: 16px;
  }

  .controls-right {
    margin-top: 0;
  }

  .vertical-stats {
    align-items: stretch;
    padding: 10px;
  }

  .stat-item {
    justify-content: space-between;
    padding: 8px 10px;
  }

  .list-scrollbar {
    max-height: 380px; /* 避免过高占用空间 */
  }

  .list-card :deep(.el-card__body),
  .detail-card :deep(.el-card__body) {
    padding: 18px;
  }

  .list-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .list-header .el-select {
    width: 100% !important;
    max-width: 200px;
  }
}

@media (max-width: 576px) {
  .header {
    padding: 12px;
  }

  .header h2 {
    font-size: 1.3rem;
  }

  .controls-card {
    padding: 16px;
    margin-bottom: 16px;
  }

  .controls-footer {
    margin-top: 16px;
  }

  /* 输入框在手机端全宽，字体更小 */
  .plain-input {
    max-width: 100%;
    padding: 5px 6px;
    font-size: 13px; /* 减小字体 */
  }

  /* 覆盖PC端的固定标签宽度，让标签自适应 */
  .input-row .el-col:nth-child(1) :deep(.el-form-item__label),
  .input-row .el-col:nth-child(2) :deep(.el-form-item__label),
  .input-row .el-col:nth-child(3) :deep(.el-form-item__label),
  .input-row .el-col:nth-child(4) :deep(.el-form-item__label) {
    width: auto !important;
    min-width: 0;
    flex-shrink: 0;
  }

  /* 标签字体在手机端更小 */
  .controls-left :deep(.el-form-item__label) {
    font-size: 0.75rem;
    padding-right: 4px;
    white-space: nowrap;
  }

  /* 标签和输入框之间的间距减小 */
  .controls-left :deep(.el-form-item__content) {
    margin-left: 0 !important;
    flex: 1;
    min-width: 0;
  }

  /* 表单项布局优化，确保输入框有足够空间 */
  .controls-left :deep(.el-form-item) {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 8px;
    gap: 4px;
  }

  /* 输入行间距在手机端减小，并减小gutter */
  .input-row {
    margin-bottom: 8px;
    margin-left: -6px !important;
    margin-right: -6px !important;
  }

  .input-row :deep(.el-col) {
    padding-left: 6px !important;
    padding-right: 6px !important;
  }

  /* 统计信息在手机端优化 */
  .vertical-stats {
    padding: 12px;
    gap: 10px;
  }

  .stat-item {
    padding: 10px 12px;
  }

  .stat-label {
    font-size: 0.8125rem;
  }

  .stat-value {
    font-size: 0.9375rem;
  }

  /* 列表卡片优化 */
  .list-card :deep(.el-card__body),
  .detail-card :deep(.el-card__body) {
    padding: 16px;
  }

  .list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
  }

  .list-header .title {
    font-size: 0.875rem;
  }

  .list-header .el-select {
    width: 100% !important;
  }

  .list-scrollbar {
    height: 300px;
    max-height: 300px;
  }

  /* 详情卡片优化 */
  .detail-header {
    font-size: 0.8125rem;
    margin-bottom: 10px;
    flex-wrap: nowrap;
    gap: 4px;
  }

  .seq-id {
    margin-left: 4px;
    font-size: 0.8125rem;
  }

  .initial-hp-info {
    margin-left: 6px;
    font-size: 0.8125rem;
  }

  .shot-text {
    font-size: 0.8125rem;
    line-height: 1.5;
  }

  .reference-text {
    font-size: 0.75rem;
    text-align: left;
    padding-top: 10px;
    margin-top: 10px;
    line-height: 1.4;
  }

  /* 时间线在手机端优化 */
  :deep(.el-timeline) {
    padding-left: 12px !important;
  }

  :deep(.el-timeline-item__timestamp) {
    font-size: 0.75rem;
  }

  /* 序列项在手机端优化 */
  .seq-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .seq-number {
    font-size: 0.8125rem;
  }

  .seq-text {
    font-size: 0.8125rem;
    width: 100%;
  }

  /* 描述文字在手机端优化 */
  .description-text {
    font-size: 0.75rem;
    padding: 6px 0;
    line-height: 1.4;
  }
}
</style>