<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string
    hint?: string
  }>(),
  { text: '这里还什么都没有', hint: '' },
)
</script>

<template>
  <div class="empty-state">
    <div class="empty-mark">◌</div>
    <p class="empty-text">{{ text }}</p>
    <p v-if="hint" class="empty-hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.empty-state {
  padding: 56px 16px;
  text-align: center;
}

.empty-mark {
  font-size: 32px;
  color: var(--th-text-faint);
  line-height: 1;
}

.empty-text {
  margin: 12px 0 0;
  color: var(--th-text-soft);
}

.empty-hint {
  margin: 6px 0 0;
  color: var(--th-text-faint);
  font-size: 13px;
}
</style>
