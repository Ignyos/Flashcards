page = {
   selectedCardIds: new Set(),
   allDecks: [],
   cardStats: new Map(), // cardId -> stats object

   get element() {
      let ele = document.createElement('div')
      ele.id = 'page'
      
      // Page title
      let title = document.createElement('h1')
      title.innerText = 'Custom Quiz Builder'
      ele.appendChild(title)
      
      // Quiz header section (selected count and create button)
      const quizHeader = document.createElement('div')
      quizHeader.className = 'custom-quiz-header'
      quizHeader.innerHTML = '<div class="loading">Loading Custom Quiz...</div>'
      ele.appendChild(quizHeader)
      
      // Main scrollable container (similar to stats-list)
      const mainContainer = document.createElement('div')
      mainContainer.id = 'custom-quiz-list'
      ele.appendChild(mainContainer)
      
      return ele
   },

   async load() {
      try {
         await this.loadData()
         await this.renderContent()
      } catch (error) {
         console.error('Error loading custom quiz page:', error)
         const mainContainer = document.getElementById('custom-quiz-list')
         if (mainContainer) {
            mainContainer.innerHTML = '<div class="error-state">Error loading Custom Quiz. Please refresh the page.</div>'
         }
      }
   },

   async renderContent() {
      // Update the header section
      const headerContainer = document.querySelector('.custom-quiz-header')
      headerContainer.innerHTML = ''
      headerContainer.appendChild(this.createQuizActions())
      
      // Update the main container
      const mainContainer = document.getElementById('custom-quiz-list')
      mainContainer.innerHTML = ''
      
      // Main content
      if (this.allDecks.length === 0) {
         mainContainer.appendChild(this.createNoDecksMessage())
      } else {
         mainContainer.appendChild(this.createDecksSection())
      }
   },

   async loadData() {
      try {
         // Load all account decks (not just selected ones)
         this.allDecks = await dbCtx.accountDeck.list(stateMgr.account.id)
         
         // Sort decks alphabetically by title
         this.allDecks.sort((a, b) => a.title.localeCompare(b.title))
         
         // Load card statistics for all decks
         await this.loadCardStatistics()
      } catch (error) {
         console.error('Error loading custom quiz data:', error)
      }
   },

   async loadCardStatistics() {
      // Similar to stats page, load performance data for all cards
      for (const deck of this.allDecks) {
         try {
            const cards = await dbCtx.card.byDeckId(deck.deckId)
            const deckAnswers = await dbCtx.questionAnswer.allForAccount(stateMgr.account.id)
            
            for (const card of cards) {
               const cardAnswers = deckAnswers.filter(answer => answer.cardId === card.id)
               
               let successRate = null
               if (cardAnswers.length > 0) {
                  const correctCount = cardAnswers.filter(a => a.answeredCorrectly).length
                  successRate = Math.round((correctCount / cardAnswers.length) * 100)
               }
               
               // Check if card is mastered
               const masteredCardIds = deck.masteredCardIds || []
               const isMastered = masteredCardIds.includes(card.id)
               
               this.cardStats.set(card.id, {
                  card,
                  successRate,
                  attemptCount: cardAnswers.length,
                  isMastered
               })
            }
         } catch (error) {
            console.error(`Error loading stats for deck ${deck.title}:`, error)
         }
      }
   },

   createQuizActions() {
      const actions = document.createElement('div')
      actions.className = 'quiz-actions'
      
      // Selected count
      const selectedCount = document.createElement('div')
      selectedCount.className = 'selected-count'
      selectedCount.textContent = `${this.selectedCardIds.size} cards selected`
      selectedCount.id = 'selected-count'
      
      // Create quiz button
      const createBtn = document.createElement('button')
      createBtn.className = 'create-quiz-btn'
      createBtn.textContent = 'Take This Quiz'
      createBtn.disabled = this.selectedCardIds.size === 0
      createBtn.id = 'create-quiz-btn'
      createBtn.addEventListener('click', () => this.createQuiz())
      
      actions.appendChild(selectedCount)
      actions.appendChild(createBtn)
      
      return actions
   },

   createNoDecksMessage() {
      const message = document.createElement('div')
      message.className = 'no-decks-message'
      message.textContent = 'No decks available. Please add some flashcard decks first.'
      return message
   },

   createDecksSection() {
      const container = document.createElement('div')
      container.className = 'deck-list'
      
      for (const deck of this.allDecks) {
         container.appendChild(this.createDeckSection(deck))
      }
      
      return container
   },

   createDeckSection(deck) {
      const section = document.createElement('div')
      section.className = 'deck-item'
      section.dataset.deckId = deck.deckId
      
      // Header (deck title and toggle)
      const header = document.createElement('div')
      header.className = 'deck-header'
      header.addEventListener('click', () => this.toggleDeck(section))
      
      // Toggle arrow (left side)
      const toggle = document.createElement('div')
      toggle.className = 'accordion-toggle'
      toggle.textContent = '▶'
      
      const title = document.createElement('div')
      title.className = 'deck-title'
      title.textContent = deck.title
      
      header.appendChild(toggle)
      header.appendChild(title)
      
      // Cards content (hidden by default)
      const cardsList = document.createElement('div')
      cardsList.className = 'card-content hidden'
      
      // Card stats container (matches stats page structure)
      const cardStats = document.createElement('div')
      cardStats.className = 'card-stats'
      
      // Card stats header with action buttons on the left (matches stats page)
      const cardStatsHeader = document.createElement('div')
      cardStatsHeader.className = 'card-stats-header'
      
      const actions = document.createElement('div')
      actions.className = 'deck-controls'
      actions.addEventListener('click', (e) => e.stopPropagation())
      
      const selectAllBtn = document.createElement('button')
      selectAllBtn.className = 'select-all-btn'
      selectAllBtn.textContent = 'Select All'
      selectAllBtn.addEventListener('click', () => this.selectAllCards(deck.deckId))
      
      const selectNoneBtn = document.createElement('button')
      selectNoneBtn.className = 'select-none-btn'
      selectNoneBtn.textContent = 'Select None'
      selectNoneBtn.addEventListener('click', () => this.selectNoneCards(deck.deckId))
      
      actions.appendChild(selectAllBtn)
      actions.appendChild(selectNoneBtn)
      cardStatsHeader.appendChild(actions)
      
      // Card list container (matches stats page structure)
      const cardListContainer = document.createElement('div')
      cardListContainer.className = 'card-list'
      
      // Get cards for this deck and sort by performance (worst first)
      const deckCards = Array.from(this.cardStats.values())
         .filter(stat => stat.card.deckId === deck.deckId)
         .sort((a, b) => {
            // Mastered cards go to the bottom
            if (a.isMastered && !b.isMastered) return 1
            if (!a.isMastered && b.isMastered) return -1
            
            // Within each group, sort by performance (worst first for unmastered)
            if (!a.isMastered && !b.isMastered) {
               if (a.successRate === null && b.successRate === null) return 0
               if (a.successRate === null) return 1
               if (b.successRate === null) return -1
               return a.successRate - b.successRate
            }
            
            // For mastered cards, sort alphabetically
            return a.card.shortPhrase.localeCompare(b.card.shortPhrase)
         })
      
      for (const cardStat of deckCards) {
         cardListContainer.appendChild(this.createCardItem(cardStat))
      }
      
      cardStats.appendChild(cardStatsHeader)
      cardStats.appendChild(cardListContainer)
      cardsList.appendChild(cardStats)
      
      section.appendChild(header)
      section.appendChild(cardsList)
      
      return section
   },

   createCardItem(cardStat) {
      const item = document.createElement('div')
      item.className = 'card-item'
      
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.className = 'card-checkbox'
      checkbox.dataset.cardId = cardStat.card.id
      checkbox.checked = this.selectedCardIds.has(cardStat.card.id)
      checkbox.addEventListener('change', () => this.toggleCard(cardStat.card.id))
      
      const phrase = document.createElement('div')
      phrase.className = 'card-phrase'
      phrase.textContent = cardStat.card.shortPhrase
      
      const rate = document.createElement('div')
      rate.className = 'card-success-rate'
      
      if (cardStat.isMastered) {
         item.classList.add('mastered')
         rate.textContent = '✓ Mastered'
      } else if (cardStat.successRate === null) {
         rate.textContent = 'No data'
      } else {
         const correctCount = Math.round((cardStat.successRate / 100) * cardStat.attemptCount)
         rate.textContent = `${correctCount}/${cardStat.attemptCount} (${cardStat.successRate}%)`
      }
      
      item.appendChild(checkbox)
      item.appendChild(phrase)
      item.appendChild(rate)
      
      return item
   },

   toggleDeck(section) {
      const cardsList = section.querySelector('.card-content')
      const toggle = section.querySelector('.accordion-toggle')
      
      const isExpanded = cardsList.classList.contains('expanded')
      
      if (isExpanded) {
         // Collapse
         cardsList.classList.remove('expanded')
         cardsList.classList.add('hidden')
         toggle.textContent = '▶'
      } else {
         // Expand
         cardsList.classList.remove('hidden')
         cardsList.classList.add('expanded')
         toggle.textContent = '▼'
      }
   },

   toggleCard(cardId) {
      if (this.selectedCardIds.has(cardId)) {
         this.selectedCardIds.delete(cardId)
      } else {
         this.selectedCardIds.add(cardId)
      }
      this.updateUI()
   },

   selectAllCards(deckId) {
      const deckCards = Array.from(this.cardStats.values())
         .filter(stat => stat.card.deckId === deckId)
         .map(stat => stat.card.id)
      
      deckCards.forEach(cardId => this.selectedCardIds.add(cardId))
      this.updateUI()
      this.updateDeckCheckboxes(deckId)
   },

   selectNoneCards(deckId) {
      const deckCards = Array.from(this.cardStats.values())
         .filter(stat => stat.card.deckId === deckId)
         .map(stat => stat.card.id)
      
      deckCards.forEach(cardId => this.selectedCardIds.delete(cardId))
      this.updateUI()
      this.updateDeckCheckboxes(deckId)
   },

   updateDeckCheckboxes(deckId) {
      const checkboxes = document.querySelectorAll(`[data-deck-id="${deckId}"] .card-checkbox`)
      checkboxes.forEach(checkbox => {
         checkbox.checked = this.selectedCardIds.has(checkbox.dataset.cardId)
      })
   },

   updateUI() {
      const selectedCount = document.getElementById('selected-count')
      const createBtn = document.getElementById('create-quiz-btn')
      
      selectedCount.textContent = `${this.selectedCardIds.size} cards selected`
      createBtn.disabled = this.selectedCardIds.size === 0
   },

   async createQuiz() {
      if (this.selectedCardIds.size === 0) return
      
      try {
         const cardIds = Array.from(this.selectedCardIds)
         
         // Get unique deck IDs from selected cards
         const deckIds = [...new Set(cardIds.map(cardId => {
            const cardStat = this.cardStats.get(cardId)
            return cardStat.card.deckId
         }))]
         
         // Create quiz object
         const quiz = new Quiz({
            accountId: stateMgr.account.id,
            allCardIds: cardIds,
            allDeckIds: deckIds
         })
         
         // Save quiz to database
         await dbCtx.quiz.add(quiz)
         
         // Set as current quiz and navigate
         stateMgr.quiz = quiz
         await stateMgr.setPage(pages.QUIZ)
         app.route()
         
      } catch (error) {
         console.error('Error creating custom quiz:', error)
         messageCenter.addError('Error creating quiz. Please try again.')
      }
   },

   async refresh() {
      // Reload the page data and re-render
      await this.loadData()
      await this.renderContent()
   }
}