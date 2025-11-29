page = {
   get element() {
      let ele = document.createElement('div')
      ele.id = 'page'
      
      // Page title
      let title = document.createElement('h1')
      title.innerText = 'Your Statistics'
      ele.appendChild(title)
      
      // Date info
      let dateInfo = document.createElement('p')
      dateInfo.id = 'date-info'
      dateInfo.className = 'date-info'
      ele.appendChild(dateInfo)
      
      // Stats container
      let statsContainer = document.createElement('div')
      statsContainer.id = 'stats-list'
      ele.appendChild(statsContainer)
      
      return ele
   },
   async load() {
      this.updateDateInfo()
      await this.loadDeckList()
   },
   
   updateDateInfo() {
      const account = stateMgr.account
      const daysBack = account.settings.statsHistoryAgeInDays
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysBack)
      
      const dateStr = cutoffDate.toLocaleDateString('en-US', { 
         year: 'numeric', 
         month: 'short', 
         day: 'numeric' 
      })
      
      const dateInfo = document.getElementById('date-info')
      dateInfo.innerText = `Viewing data since ${dateStr} (${daysBack} days)`
   },
   
   async loadDeckList() {
      const statsContainer = document.getElementById('stats-list')
      
      // Show loading state
      statsContainer.innerHTML = '<div class="loading">Loading statistics...</div>'
      
      try {
         // Ensure decks are loaded
         if (!stateMgr.decks || stateMgr.decks.length === 0) {
            await stateMgr.loadDecks()
         }
         
         const deckListItems = stateMgr.decks || []
         
         if (deckListItems.length === 0) {
            statsContainer.innerHTML = '<div class="empty-state">No decks available</div>'
            return
         }
         
         // Sort decks alphabetically by title
         deckListItems.sort((a, b) => a.title.localeCompare(b.title))
         
         // Clear loading state
         statsContainer.innerHTML = ''
         
         // Create deck items
         for (const deckItem of deckListItems) {
            const deckElement = this.createDeckElement(deckItem)
            statsContainer.appendChild(deckElement)
            
            // If the deck is expanded by default, load its stats
            const isExpanded = stateMgr.getDeckExpansionState(deckItem.deckId, 'stats')
            if (isExpanded) {
               const statsContent = deckElement.querySelector('.deck-stats-content')
               if (statsContent && statsContent.children.length === 0) {
                  statsContent.innerHTML = '<div class="loading">Loading deck statistics...</div>'
                  try {
                     await this.loadDeckStats(deckItem, statsContent)
                  } catch (error) {
                     console.error('Error loading deck stats:', error)
                     statsContent.innerHTML = '<div class="error">Error loading statistics</div>'
                  }
               }
            }
         }
         
      } catch (error) {
         console.error('Error loading deck list:', error)
         statsContainer.innerHTML = '<div class="error-state">Error loading statistics</div>'
      }
   },
   
   createDeckElement(deckListItem) {
      const item = document.createElement('div')
      item.className = 'item deck-item'
      item.dataset.deckId = deckListItem.deckId
      
      // Check if this deck should be expanded based on stored state
      const isExpanded = stateMgr.getDeckExpansionState(deckListItem.deckId, 'stats')
      
      // Create header container for toggle and title
      const header = document.createElement('div')
      header.className = 'deck-header'
      
      // Toggle button
      const toggle = document.createElement('div')
      toggle.className = 'accordion-toggle'
      toggle.innerHTML = isExpanded ? '▼' : '▶' // Set based on stored state
      
      // Add click handler directly to toggle button
      toggle.addEventListener('click', async (e) => {
         e.stopPropagation()
         await this.toggleDeckExpansion(item, deckListItem)
      })
      
      header.appendChild(toggle)
      
      // Deck title
      const title = document.createElement('span')
      title.className = 'deck-title'
      title.innerText = deckListItem.title
      header.appendChild(title)
      
      item.appendChild(header)
      
      // Stats container (initially hidden unless expanded state says otherwise)
      const statsContent = document.createElement('div')
      statsContent.className = isExpanded ? 'deck-stats-content expanded' : 'deck-stats-content hidden'
      
      // If expanded, add the selected class for styling
      if (isExpanded) {
         item.classList.add('item-selected')
      }
      
      item.appendChild(statsContent)
      
      return item
   },
   
   async toggleDeckExpansion(deckElement, deckListItem) {
      const isExpanded = deckElement.classList.contains('item-selected')
      const toggle = deckElement.querySelector('.accordion-toggle')
      const statsContent = deckElement.querySelector('.deck-stats-content')
      
      if (isExpanded) {
         // Collapse
         deckElement.classList.remove('item-selected')
         toggle.innerHTML = '▶' // Right arrow for collapsed
         statsContent.classList.remove('expanded')
         statsContent.classList.add('hidden')
         await stateMgr.setDeckExpansionState(deckListItem.deckId, 'stats', false)
      } else {
         // Expand - load stats if not already loaded
         deckElement.classList.add('item-selected')
         toggle.innerHTML = '▼' // Down arrow for expanded
         
         if (statsContent.children.length === 0) {
            statsContent.innerHTML = '<div class="loading">Loading deck statistics...</div>'
            
            try {
               await this.loadDeckStats(deckListItem, statsContent)
            } catch (error) {
               console.error('Error loading deck stats:', error)
               statsContent.innerHTML = '<div class="error">Error loading statistics</div>'
            }
         }
         
         statsContent.classList.remove('hidden')
         statsContent.classList.add('expanded')
         await stateMgr.setDeckExpansionState(deckListItem.deckId, 'stats', true)
      }
   },
   
   async loadDeckStats(deckListItem, statsContainer) {
      const account = stateMgr.account
      const accountId = account.id
      const daysBack = account.settings.statsHistoryAgeInDays
      
      // Calculate date cutoff
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysBack)
      const cutoffDateISO = cutoffDate.toISOString()
      
      // Get all cards for this deck first
      const deckCards = await dbCtx.card.byDeckId(deckListItem.deckId)
      
      if (deckCards.length === 0) {
         statsContainer.innerHTML = `
            <div class="deck-summary">
               <div class="stat-item">No cards in this deck</div>
            </div>
         `
         return
      }
      
      // Get all question answers for cards in this deck within date range
      const deckCardIds = deckCards.map(card => card.id)
      const allAnswers = await dbCtx.questionAnswer.byAccountId(accountId, cutoffDateISO)
      const deckAnswers = allAnswers.filter(answer => deckCardIds.includes(answer.cardId))
      
      if (deckAnswers.length === 0) {
         statsContainer.innerHTML = `
            <div class="deck-summary">
               <div class="stat-item">No quiz data</div>
            </div>
         `
         return
      }
      
      // Calculate how many unique quizzes contained cards from this deck
      const uniqueQuizIds = [...new Set(deckAnswers.map(answer => answer.quizId))]
      const quizCount = uniqueQuizIds.length
      
      // Get the mastery threshold setting for limiting calculation to recent answers
      const masteryThreshold = account.settings.masteryStreakCount
      
      // Calculate deck-level average based only on the most recent n answers per card
      const recentDeckAnswers = []
      for (const card of deckCards) {
         const cardAnswers = deckAnswers
            .filter(answer => answer.cardId === card.id)
            .sort((a, b) => new Date(b.id) - new Date(a.id)) // Most recent first
            .slice(0, masteryThreshold) // Take only the most recent n
         
         recentDeckAnswers.push(...cardAnswers)
      }
      
      let averageScore = 0
      if (recentDeckAnswers.length > 0) {
         const correctAnswers = recentDeckAnswers.filter(a => a.answeredCorrectly).length
         averageScore = Math.round((correctAnswers / recentDeckAnswers.length) * 100)
      }
      
      // Calculate card-level statistics using the same recent-only logic
      const cardStats = []
      const masteredCardIds = deckListItem.masteredCardIds || []
      
      for (const card of deckCards) {
         const cardAnswers = deckAnswers
            .filter(answer => answer.cardId === card.id)
            .sort((a, b) => new Date(b.id) - new Date(a.id)) // Most recent first
            .slice(0, masteryThreshold) // Take only the most recent n
         
         let successRate = null
         if (cardAnswers.length > 0) {
            const correctCount = cardAnswers.filter(a => a.answeredCorrectly).length
            successRate = Math.round((correctCount / cardAnswers.length) * 100)
         }
         
         cardStats.push({
            card: card,
            successRate: successRate,
            attemptCount: cardAnswers.length,
            isMastered: masteredCardIds.includes(card.id)
         })
      }
      
      // Separate mastered and unmastered cards
      const unmastered = cardStats.filter(stat => !stat.isMastered)
      const mastered = cardStats.filter(stat => stat.isMastered)
      
      // Sort unmastered cards worst to best (null rates at end)
      unmastered.sort((a, b) => {
         if (a.successRate === null && b.successRate === null) return 0
         if (a.successRate === null) return 1
         if (b.successRate === null) return -1
         return a.successRate - b.successRate
      })
      
      // Sort mastered cards by performance (best to worst)
      mastered.sort((a, b) => {
         if (a.successRate === null && b.successRate === null) return 0
         if (a.successRate === null) return 1
         if (b.successRate === null) return -1
         return b.successRate - a.successRate
      })
      
      // Check if all cards in the deck are mastered
      const allDeckCardIds = deckCards.map(card => card.id)
      const masteredCardIdsSet = new Set(masteredCardIds)
      const allDeckCardsMastered = allDeckCardIds.length > 0 && allDeckCardIds.every(cardId => masteredCardIdsSet.has(cardId))

      // Build the stats content
      let content = `
         <div class="deck-summary">
            <div class="stat-item">Cards answered in ${quizCount} quizzes over the last ${daysBack} days</div>
            ${allDeckCardsMastered ? '' : `<div class="stat-item">Deck average: ${averageScore}% correct</div>`}
            ${allDeckCardsMastered ? '<div class="stat-item mastery-message">🎉 You\'re a master of this topic!</div>' : ''}
         </div>
         <div class="card-stats">
            <div class="card-stats-header">Card Performance:</div>
            <div class="card-list">
      `
      
      // Display unmastered cards
      for (const cardStat of unmastered) {
         let displayRate
         if (cardStat.successRate === null) {
            displayRate = 'No data'
         } else {
            const correctCount = Math.round((cardStat.successRate / 100) * cardStat.attemptCount)
            displayRate = `${correctCount}/${cardStat.attemptCount} (${cardStat.successRate}%)`
         }
         content += `
            <div class="card-stat-item">
               <span class="card-phrase">${cardStat.card.shortPhrase}</span>
               <span class="card-success-rate">${displayRate}</span>
            </div>
         `
      }
      
      // Add separator and mastered cards if there are any
      if (mastered.length > 0) {
         content += ''
         
         // Display mastered cards
         for (const cardStat of mastered) {
            content += `
               <div class="card-stat-item mastered">
                  <span class="card-phrase">${cardStat.card.shortPhrase}</span>
                  <span class="card-success-rate mastered-indicator">✓ Mastered</span>
               </div>
            `
         }
      }
      
      content += `
            </div>
         </div>
      `
      
      statsContainer.innerHTML = content
   }
}

navigation = {}