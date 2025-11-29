<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConsequencesStore } from '../../stores/consequencesStore'

const store = useConsequencesStore()

// For typewriter effect
const displayedText = ref('')
const isTyping = ref(true)

const fullText = computed(() => store.currentStory?.storyText || '')

onMounted(() => {
  // Typewriter effect
  let index = 0
  const text = fullText.value
  displayedText.value = ''
  isTyping.value = true

  const typeInterval = setInterval(() => {
    if (index < text.length) {
      displayedText.value += text[index]
      index++
    } else {
      clearInterval(typeInterval)
      isTyping.value = false
    }
  }, 30) // Adjust speed here
})

// Words used this round (for highlighting)
const usedWords = computed(() =>
  store.currentRoundSubmissions.map((s) => s.word.toLowerCase())
)

// Highlight words in the story
const highlightedText = computed(() => {
  let text = displayedText.value
  usedWords.value.forEach((word) => {
    const regex = new RegExp(`\\b(${word})\\b`, 'gi')
    text = text.replace(regex, '<mark>$1</mark>')
  })
  return text
})

async function handleNextRound() {
  await store.nextRound()
}
</script>

<template>
  <div class="reveal-phase">
    <div class="text-center q-mb-lg">
      <p class="text-overline">ROUND {{ store.currentRound }} of {{ store.game?.totalRounds }}</p>
      <h2 class="text-h4">The Story Unfolds...</h2>
    </div>

    <q-card class="story-card q-pa-lg q-mb-lg">
      <div class="story-text" v-html="highlightedText"></div>
      <span v-if="isTyping" class="cursor">|</span>
    </q-card>

    <q-card v-if="!isTyping" class="q-pa-md q-mb-lg" flat bordered>
      <div class="text-subtitle2 q-mb-sm">Words woven into this chapter:</div>
      <div class="word-credits">
        <div
          v-for="submission in store.currentRoundSubmissions"
          :key="`${submission.playerId}-${submission.promptId}`"
          class="word-credit"
        >
          <q-chip size="sm" color="primary" text-color="white" outline>
            {{ submission.wordType }}
          </q-chip>
          <strong>"{{ submission.word }}"</strong>
          <span class="text-grey">— {{ submission.playerName }}</span>
        </div>
      </div>
    </q-card>

    <template v-if="!isTyping && store.isHost">
      <q-btn
        v-if="store.currentRound < (store.game?.totalRounds || 5)"
        color="primary"
        size="lg"
        class="full-width"
        label="Next Round"
        @click="handleNextRound"
      />
      <q-btn
        v-else
        color="positive"
        size="lg"
        class="full-width"
        label="See Full Story"
        @click="handleNextRound"
      />
    </template>

    <p v-else-if="!isTyping" class="text-center text-grey q-mt-md">
      Waiting for host to continue...
    </p>
  </div>
</template>

<style scoped>
.reveal-phase {
  padding-top: 1rem;
}

.story-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #eee;
  font-family: 'Georgia', serif;
  font-size: 1.2rem;
  line-height: 1.8;
}

.story-text :deep(mark) {
  background: rgba(255, 215, 0, 0.3);
  color: #ffd700;
  padding: 0 2px;
  border-radius: 2px;
}

.cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.word-credits {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.word-credit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
