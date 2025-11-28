<template>
  <div
    class="letter-tile"
    :class="{
      'letter-tile--selected': letter.selected,
      'letter-tile--expiring': isExpiring
    }"
    :style="!letter.selected ? { background: `linear-gradient(145deg, ${tileColor.base}, ${tileColor.highlight})` } : {}"
    draggable="true"
    @click="$emit('toggle', letter.id)"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover.prevent
    @drop="handleDrop"
  >
    <div class="letter-tile__content">
      <span class="letter-tile__letter" :class="{ 'letter-tile__letter--small': letter.letter.length > 1 }">
        {{ letter.letter }}
      </span>
      <span class="letter-tile__points">{{ letter.points }}</span>
    </div>
    <div class="letter-tile__timer-container">
      <div
        class="letter-tile__timer-bar letter-tile__timer-bar--bg"
      ></div>
      <div
        class="letter-tile__timer-bar letter-tile__timer-bar--fill"
        :style="{ width: timerPercentage + '%' }"
        :class="{ 'letter-tile__timer-bar--warning': isExpiring }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import type { Letter } from '../types/game'
import { getLetterColor } from '../utils/letterColors'

interface Props {
  letter: Letter
  index: number
}

const props = defineProps<Props>()
const $q = useQuasar()

const emit = defineEmits<{
  toggle: [id: string]
  dragStart: [index: number]
  dragEnd: []
  drop: [index: number]
}>()

const timerPercentage = computed(() => {
  return (props.letter.timeLeft / props.letter.maxTime) * 100
})

const isExpiring = computed(() => {
  return props.letter.timeLeft <= 10
})

const tileColor = computed(() => {
  return getLetterColor(props.letter.points, $q.dark.isActive)
})

function handleDragStart(e: DragEvent) {
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/html', '')
  emit('dragStart', props.index)
}

function handleDragEnd() {
  emit('dragEnd')
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  emit('drop', props.index)
}
</script>

<style scoped lang="sass">
.letter-tile
  position: relative
  width: 80px
  height: 100px
  background: linear-gradient(145deg, #e6e6e6, #ffffff)
  border: 2px solid #ccc
  border-radius: 8px
  cursor: pointer
  transition: all 0.2s ease
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
  user-select: none
  overflow: hidden

  &:hover
    transform: translateY(-2px)
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15)

  &--selected
    background: linear-gradient(145deg, #4fc3f7, #29b6f6)
    border-color: #0288d1
    transform: translateY(-4px)
    box-shadow: 0 8px 16px rgba(0, 136, 209, 0.3)

  &--expiring
    animation: pulse 1s ease-in-out infinite

  &__content
    display: flex
    flex-direction: column
    align-items: center
    justify-content: center
    height: calc(100% - 8px)
    padding: 8px

  &__letter
    font-size: 36px
    font-weight: bold
    color: #333

    &--small
      font-size: 28px

    body.body--dark &
      color: #e0e0e0

  &__points
    position: absolute
    top: 4px
    right: 6px
    font-size: 14px
    font-weight: bold
    color: #666

    body.body--dark &
      color: #bbb

  &__timer-container
    position: absolute
    bottom: 0
    left: 0
    right: 0
    height: 8px

  &__timer-bar
    position: absolute
    bottom: 0
    left: 0
    height: 100%
    transition: width 1s linear

    &--bg
      width: 100%
      background-color: #ddd

    &--fill
      background: linear-gradient(90deg, #4caf50, #8bc34a)
      z-index: 1

    &--warning
      background: linear-gradient(90deg, #ff5722, #ff9800)

@keyframes pulse
  0%, 100%
    opacity: 1
  50%
    opacity: 0.7
</style>
