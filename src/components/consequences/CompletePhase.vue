<script setup lang="ts">
import { computed } from 'vue'
import { useConsequencesStore } from '../../stores/consequencesStore'

const store = useConsequencesStore()

// Combine all stories into one
const fullStory = computed(() =>
  store.allStories
    .sort((a, b) => a.round - b.round)
    .map((s) => s.storyText)
    .join('\n\n')
)

// Get stats per player
const playerStats = computed(() => {
  const stats = new Map<string, { name: string; words: string[]; wordCount: number }>()

  store.game?.players.forEach((p) => {
    stats.set(p.id, { name: p.name, words: [], wordCount: 0 })
  })

  store.allSubmissions.forEach((s) => {
    const stat = stats.get(s.playerId)
    if (stat) {
      stat.words.push(s.word)
      stat.wordCount++
    }
  })

  return Array.from(stats.values())
})

function playAgain() {
  store.leaveGame()
}

function copyStory() {
  navigator.clipboard.writeText(fullStory.value)
}
</script>

<template>
  <div class="complete-phase">
    <div class="text-center q-mb-xl">
      <h2 class="text-h3">The End</h2>
      <p class="text-subtitle1 text-grey">A tale of inevitable consequences</p>
    </div>

    <q-card class="story-card q-pa-lg q-mb-lg">
      <div class="full-story">
        <div v-for="(story, index) in store.allStories" :key="story.round" class="story-chapter">
          <div class="chapter-header">Chapter {{ index + 1 }}</div>
          <p>{{ story.storyText }}</p>
        </div>
      </div>
      <q-btn
        flat
        icon="content_copy"
        label="Copy Story"
        color="white"
        class="q-mt-md"
        @click="copyStory"
      />
    </q-card>

    <q-card class="q-pa-md q-mb-lg">
      <div class="text-h6 q-mb-md">Contributors to Chaos</div>
      <q-list>
        <q-item v-for="player in playerStats" :key="player.name">
          <q-item-section avatar>
            <q-avatar color="primary" text-color="white">
              {{ player.name.charAt(0).toUpperCase() }}
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ player.name }}</q-item-label>
            <q-item-label caption>
              {{ player.wordCount }} words: {{ player.words.join(', ') }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-btn
      color="primary"
      size="lg"
      class="full-width"
      label="Play Again"
      @click="playAgain"
    />
  </div>
</template>

<style scoped>
.complete-phase {
  padding-top: 1rem;
}

.story-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #eee;
  font-family: 'Georgia', serif;
}

.full-story {
  max-height: 60vh;
  overflow-y: auto;
}

.story-chapter {
  margin-bottom: 2rem;
}

.story-chapter:last-child {
  margin-bottom: 0;
}

.chapter-header {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #888;
  margin-bottom: 0.5rem;
}

.story-chapter p {
  font-size: 1.1rem;
  line-height: 1.8;
  margin: 0;
}
</style>
