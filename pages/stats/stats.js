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
      
      // Create header container for toggle and title
      const header = document.createElement('div')
      header.className = 'deck-header'
      
      // Toggle button
      const toggle = document.createElement('div')
      toggle.className = 'accordion-toggle'
      toggle.innerHTML = '▶' // Right arrow for collapsed
      
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
      
      // Stats container (initially hidden)
      const statsContent = document.createElement('div')
      statsContent.className = 'deck-stats-content hidden'
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
      
      // Calculate deck-level average based only on answers to cards from this deck
      let averageScore = 0
      if (deckAnswers.length > 0) {
         const correctAnswers = deckAnswers.filter(a => a.answeredCorrectly).length
         averageScore = Math.round((correctAnswers / deckAnswers.length) * 100)
      }
      
      // Calculate card-level statistics
      const cardStats = []
      const masteredCardIds = deckListItem.masteredCardIds || []
      
      for (const card of deckCards) {
         const cardAnswers = deckAnswers.filter(answer => answer.cardId === card.id)
         
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
      
      // Check if all cards with attempts are mastered
      const cardsWithAttempts = cardStats.filter(stat => stat.attemptCount > 0)
      const allMastered = cardsWithAttempts.length > 0 && cardsWithAttempts.every(stat => stat.isMastered)
      
      // Build the stats content
      let content = `
         <div class="deck-summary">
            <div class="stat-item">Cards answered in ${quizCount} quizzes over the last ${daysBack} days</div>
            <div class="stat-item">Deck average: ${averageScore}% correct</div>
            ${allMastered ? '<div class="stat-item mastery-message">🎉 You\'re a master of this topic!</div>' : ''}
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
      
      // Add separator and mastered section if there are mastered cards
      if (mastered.length > 0) {
         content += `
            </div>
            <div class="mastery-separator">
               <hr>
               <div class="mastery-section-header">Mastered Cards (${mastered.length})</div>
               <hr>
            </div>
            <div class="card-list">
         `
         
         // Display mastered cards
         for (const cardStat of mastered) {
            let displayRate
            if (cardStat.successRate === null) {
               displayRate = 'No data'
            } else {
               const correctCount = Math.round((cardStat.successRate / 100) * cardStat.attemptCount)
               displayRate = `${correctCount}/${cardStat.attemptCount} (${cardStat.successRate}%)`
            }
            content += `
               <div class="card-stat-item mastered">
                  <span class="card-phrase">${cardStat.card.shortPhrase}</span>
                  <span class="card-success-rate">${displayRate}</span>
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