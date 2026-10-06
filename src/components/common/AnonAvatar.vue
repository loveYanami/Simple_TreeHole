<script setup lang="ts">
import { computed } from 'vue'
import { AVATAR_PALETTE_SIZE, anonInitial } from '@/utils/anon'

const props = withDefaults(
  defineProps<{
    name: string
    index: number
    size?: number
    /** 自己的内容用主色头像，和别人的假名头像区分开 */
    mine?: boolean
  }>(),
  { size: 36, mine: false },
)

const paletteIndex = computed(() => {
  const n = Number.isFinite(props.index) ? Math.abs(Math.trunc(props.index)) : 0
  return n % AVATAR_PALETTE_SIZE
})

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.round(props.size * 0.42)}px`,
  background: props.mine ? 'var(--th-primary)' : `var(--th-avatar-${paletteIndex.value})`,
}))
</script>

<template>
  <span class="anon-avatar" :style="style">{{ anonInitial(name) }}</span>
</template>

<style scoped>
.anon-avatar {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 50%;
  color: #fff;
  font-weight: 600;
  user-select: none;
}
</style>
