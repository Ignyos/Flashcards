const pages = {
   CUSTOM_QUIZ: "customQuiz",
   FLASH_CARDS: "flashcards",
   HOME: "home",
   QUIZ: "quiz",
   SETTINGS: "settings",
   STATS: "stats",
   STUDENTS: "students",
}

class StateManager {
   constructor() {
      //#sitewide
      this.metaData;
      this.accounts;
      this.account;
      
      //#flashcards page
      this.decks;
      this.cards;
      this.selectedDecksHaveCards = false; // Track whether any selected decks contain cards

      //#flashcards & quiz page
      this.card;
      
      //#stats page
      this.quizes;
      this.questionAnswers;
      
      //#quiz page
      this.quiz;
   }

   async loadSite() {
      this.metaData = await dbCtx.metadata.get()
      this.accounts = await dbCtx.account.all()
      if (this.metaData.selectedAccountId) {
         await this.updateAccountLastUsed()
         await this.loadCurrentPage()
      } else {
         this.clearPageData()
      }
   }

   /**
    * @returns {Account} The currently selected account or null if no account is selected
    */
   get account() {
      if (!this.accounts || !this.metaData.selectedAccountId) return null
      return this.accounts.find(a => a.id == this.metaData.selectedAccountId) ?? null
   }

   async updateAccountLastUsed() {
      let acct = this.account
      if (!acct) return
      acct.lastUsed = new Date().toISOString()
      await dbCtx.account.update(acct)
   }

   async loadAccount() {
      this.accounts = await dbCtx.account.all()
      if (this.metaData.selectedAccountId) {
         await this.updateAccountLastUsed()
      }
   }

   async setPage(page) {
      this.account.state.currentPage = page
      await dbCtx.account.update(this.account)
   }

   async loadCurrentPage() {
      this.clearPageData()
      if (!this.account.state.currentPage) return

      switch (this.account.state.currentPage) {
         case pages.HOME:
            break
         case pages.FLASH_CARDS:
            await this.loadFlashcardsPage()
            break
         case pages.QUIZ:
            if (!await this.loadQuizPage()) {
               await this.setPage(pages.FLASH_CARDS)
               await this.loadFlashcardsPage()
               messageCenter.addError('Error loading Quiz.')
            }
            break
         case pages.STATS:
            await this.loadStatsPage()
            break
         case pages.CUSTOM_QUIZ:
            await this.loadCustomQuizPage()
            break
         case pages.STUDENTS:
            // Students page handles its own loading
            break
         default:
            break
      }      
   }

   clearPageData() {
      this.decks = []
      this.cards = []
      this.card = null
      this.quizes = []
      this.quiz = null
      this.selectedDecksHaveCards = false
   }

   //#region Flashcards Page

   async loadFlashcardsPage() {
      if (!this.metaData?.selectedAccountId) { this.clearPageData(); return }
      if (!await this.loadDecks()) return
      await this.loadCards()
      await this.checkSelectedDecksHaveCards()
      // Update the site header to reflect the current Quiz Me button state
      await app.initSiteHeader()
   }

   async loadDecks() {
      this.decks = await dbCtx.accountDeck.list(this.metaData.selectedAccountId)
      if (!this.decks || !this.decks.length) {
         this.decks = []
         this.cards = []
         return false
      } else {
         this.decks.sort((a,b) => {
            return a.title.localeCompare(b.title)
         })
         return true
      }
   }

   async loadCards() {
      this.cards = await dbCtx.card.byDeckId(this.deckId)
      if (!this.cards || !this.cards.length) {
         this.cards = []
      } else {
         this.cards.sort((a,b) => {
            return a.shortPhrase.localeCompare(b.shortPhrase)
         })
      }
   }

   /**
    * Check if any of the selected decks contain cards and update the selectedDecksHaveCards property
    * @returns {Promise<boolean>} True if any selected deck has cards, false otherwise
    */
   async checkSelectedDecksHaveCards() {
      if (!this.decks || !this.decks.length) {
         this.selectedDecksHaveCards = false
         return false
      }

      const selectedDecks = this.decks.filter(deck => deck.isSelected)
      if (!selectedDecks.length) {
         this.selectedDecksHaveCards = false
         return false
      }

      // Check if any selected deck has cards
      for (const deck of selectedDecks) {
         const cards = await dbCtx.card.byDeckId(deck.deckId)
         if (cards && cards.length > 0) {
            this.selectedDecksHaveCards = true
            return true
         }
      }

      this.selectedDecksHaveCards = false
      return false
   }

   /**
    * @returns {string} The Id of the currently selected deck or null if no deck is selected
    */
   get deckId() {
      let result = this.account?.state?.selectedDeckId ?? null
      return result
   }

   async setDeckId(id) {
      this.account.state.selectedDeckId = id
      await dbCtx.account.update(this.account)
   }

   async addNewAccountDeck(data) {
      this.account.state.selectedDeckId = data.deckId
      await dbCtx.account.update(this.account)
      this.decks.push(data)
      this.decks.sort((a,b) => {
         return a.title.localeCompare(b.title)
      })
      this.cards = []
      
      // Update Quiz Me button state since deck availability may have changed
      await this.checkSelectedDecksHaveCards()
      await app.initSiteHeader()
   }

   async updateAccountDeck(acctDeck) {
      const deck = acctDeck.toDeck()
      await dbCtx.deck.update(deck)
      this.account.state.selectedDeckId = acctDeck.deckId
      let i = this.decks.findIndex((e) => {
         e.deckId == acctDeck.deckId
      })
      this.decks[i] = acctDeck
      this.decks.sort((a,b) => {
         return a.title.localeCompare(b.title)
      })
   }

   async deleteAccountDeck(acctDeck) {
      acctDeck.deletedDate = new Date().toISOString()
      await dbCtx.accountDeck.delete(this.account.id, acctDeck.deckId)
      let i = this.decks.findIndex((e) => e.deckId == acctDeck.deckId)
      this.decks.splice(i,1)
      if (this.account.state.selectedDeckId == acctDeck.deckId) {
         this.account.state.selectedDeckId = ''
         await dbCtx.account.update(this.account)
         this.cards = []
      }
   }

   /**
    * @returns {AccountDeck} The currently selected deck or null if no deck is selected
    */
   get accountDeck() {
      const result = this.decks.find(d => d.deckId == this.deckId)
      return result ?? null
   }
   
   
   async addCard(card) {
      // Card should already have an ID when passed to this method
      this.card = card
      // Don't add to database here - it's already been added in saveCard
      this.cards.push(card)
      this.cards.sort((a,b) => {
         return a.shortPhrase.localeCompare(b.shortPhrase)
      })
      
      // Update Quiz Me button state since card availability may have changed
      await this.checkSelectedDecksHaveCards()
      await app.initSiteHeader()
   }

   async updateCard(card) {
      await dbCtx.card.update(card)
      let i = this.cards.findIndex((e) => e.id == card.id)
      if (i > -1) {
         this.cards[i] = card
      } else {
         alert("Card not found in State")
      }
      this.cards.sort((a,b) => {
         return a.shortPhrase.localeCompare(b.shortPhrase)
      })      
   }

   async deleteCard(card) {
      // Hard delete the card from the database (removes data for all users)
      await dbCtx.card.delete(card.id)
      
      // Remove from the in-memory cards array
      let i = this.cards.findIndex((e) => e.id == card.id)
      if (i > -1) {
         this.cards.splice(i, 1)
      }
      
      // Update Quiz Me button state since card availability may have changed
      await this.checkSelectedDecksHaveCards()
      await app.initSiteHeader()
   }

   async setSelectedCard(deckId, cardId) {
      if (!deckId) return // No deck selected
      
      // Find the AccountDeck record for the current user and deck
      const accountDeck = this.decks.find(item => item.deckId === deckId)
      if (accountDeck) {
         accountDeck.selectedCardId = cardId
         await dbCtx.accountDeck.update(accountDeck)
      }
   }

   getSelectedCard(deckId) {
      if (!deckId) return null // No deck selected
      
      // Find the AccountDeck record for the current user and deck
      const accountDeck = this.decks.find(item => item.deckId === deckId)
      return accountDeck?.selectedCardId || null
   }

   async setQuestion(question) {
      this.question = question
      await this.updateSelectedQuestion(question.id)
   }

   //#endregion

   //#region Quiz Page

   async loadQuizPage() {
      let result = true
      
      const acct = this.account
      if (!acct) return false

      this.quiz = await dbCtx.quiz.latest(acct.id)

      if (!this.quiz) {
         await this.loadDecks()
         // Check if user has any selected decks for quiz
         const selectedDecks = this.decks.filter(deck => deck.isSelected)
         if (selectedDecks.length === 0) {
            messageCenter.addError('Please select at least one deck for quiz by checking the checkbox.')
            return true
         } else {
            this.quiz = await dbCtx.quiz.create(acct.id, acct.settings.defaultQuestionCount)
         }
      }

      if (!this.quiz) {
         messageCenter.addError('No cards available for quiz in selected decks.')
         return true
      }

      if (this.quiz.allCardIds.length === this.quiz.answeredCardIds.length) {
         this.quiz.completeDate = new Date().toISOString()
         await dbCtx.quiz.update(this.quiz)
         return true;
      }
      this.card = await dbCtx.card.get(this.getNextCardId())
      return result
   }
   
   getNextCardId() {
      let unanswered = []
      this.quiz.allCardIds.forEach(q => {
         if (!this.quiz.answeredCardIds.includes(q)) unanswered.push(q)
      })
      
      if (unanswered.length === 0) {
         return null // No more unanswered questions
      }
      
      let i = Math.floor(Math.random() * unanswered.length)
      return unanswered[i]
   }

   async updateAnsweredCardIds(id) {
      this.quiz.answeredCardIds.push(id)
      await dbCtx.quiz.update(this.quiz)
      this.card = { id: 0, shortPhrase: null , phrase: null, answer: null }
   }

   /**
    * Looks for the latest quiz. If it is not complete. It marks the
    * complete date and updates the quiz.
    * Then creates a new quiz.
    */
   async createNewQuiz() {
      let latest = await dbCtx.quiz.latest(this.account.id)
      if (latest && !latest.completeDate) {
         latest.completeDate = new Date().toISOString()
         await dbCtx.quiz.update(latest)
         
         // Update mastered cards for the completed quiz
         await dbCtx.quiz.updateMasteredCardsAfterCompletion(this.account.id, latest)
      }
      await dbCtx.quiz.create(this.account.id, this.account.settings.defaultQuestionCount)
   }

   //#endregion

   //#region Stats Page

   async loadStatsPage() {
      // Stats page handles its own data loading
   }

   async loadCustomQuizPage() {
      // Ensure decks are loaded for custom quiz page
      if (!this.metaData?.selectedAccountId) { 
         this.clearPageData()
         return
      }
      await this.loadDecks()
   }

   get statsView() {
      return this.account?.state.statsView ?? statsViews.QUESTION
   }

   /**
    * Get the expansion state for a deck on a specific page
    * @param {string} deckId - The deck ID
    * @param {string} pageName - The page name ('customQuiz' or 'stats')
    * @returns {boolean} - Whether the deck is expanded
    */
   getDeckExpansionState(deckId, pageName) {
      const accountDeck = this.decks.find(d => d.deckId === deckId)
      return accountDeck?.pageStates?.[pageName]?.expanded ?? false
   }

   /**
    * Set the expansion state for a deck on a specific page
    * @param {string} deckId - The deck ID
    * @param {string} pageName - The page name ('customQuiz' or 'stats')
    * @param {boolean} expanded - Whether the deck should be expanded
    */
   async setDeckExpansionState(deckId, pageName, expanded) {
      const accountDeck = this.decks.find(d => d.deckId === deckId)
      if (accountDeck) {
         // Ensure pageStates structure exists
         if (!accountDeck.pageStates) {
            accountDeck.pageStates = {
               customQuiz: { expanded: false },
               stats: { expanded: false }
            }
         }
         if (!accountDeck.pageStates[pageName]) {
            accountDeck.pageStates[pageName] = { expanded: false }
         }
         
         accountDeck.pageStates[pageName].expanded = expanded
         await dbCtx.accountDeck.update(accountDeck)
      }
   }

   //#endregion
}
