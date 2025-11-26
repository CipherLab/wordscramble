import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { db } from './firebase'

export interface LeaderboardEntry {
  username: string
  score: number
  date: string
  timestamp: number
}

export interface LeaderboardStats {
  entries: LeaderboardEntry[]
  userRank: number | null
  totalPlayers: number
}

/**
 * Submit a score to the daily leaderboard
 */
export async function submitScore(username: string, score: number, date: string): Promise<void> {
  try {
    await addDoc(collection(db, 'dailyScores'), {
      username: username.trim(),
      score,
      date, // YYYY-MM-DD format
      timestamp: Timestamp.now()
    })
    console.log('Score submitted successfully')
  } catch (error) {
    console.error('Error submitting score:', error)
    throw error
  }
}

/**
 * Get top scores for a specific date
 */
export async function getTopScores(date: string, limitCount = 100): Promise<LeaderboardEntry[]> {
  try {
    const scoresRef = collection(db, 'dailyScores')
    const q = query(
      scoresRef,
      where('date', '==', date),
      orderBy('score', 'desc'),
      orderBy('timestamp', 'asc'), // Earlier submission wins ties
      limit(limitCount)
    )

    const querySnapshot = await getDocs(q)
    const entries: LeaderboardEntry[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      entries.push({
        username: data.username,
        score: data.score,
        date: data.date,
        timestamp: data.timestamp.toMillis()
      })
    })

    return entries
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    throw error
  }
}

/**
 * Get user's rank and nearby scores
 */
export async function getUserStats(username: string, score: number, date: string): Promise<LeaderboardStats> {
  try {
    const allScores = await getTopScores(date, 1000) // Get more for accurate ranking

    // Find user's rank
    let userRank: number | null = null
    for (let i = 0; i < allScores.length; i++) {
      const entry = allScores[i]
      if (entry && entry.username === username && entry.score === score) {
        userRank = i + 1
        break
      }
    }

    return {
      entries: allScores.slice(0, 100), // Return top 100
      userRank,
      totalPlayers: allScores.length
    }
  } catch (error) {
    console.error('Error getting user stats:', error)
    throw error
  }
}
