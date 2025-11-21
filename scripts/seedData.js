class SeedData {
   constructor(accountName = "", deckCount = 3, cardsPerDeck = 5) {
      this.deckCount = deckCount
      this.cardsPerDeck = cardsPerDeck
      if (!accountName) { accountName = `Student_${newId(4)}` }
      
      this.account = new Account({ name: accountName })
      this.decks = []
      this.accountDecks = []
      this.cards = []

      // Create decks and cards
      const deckPad = this.deckCount.toString().length
      const cardPad = this.cardsPerDeck.toString().length
      for (let d = 1; d <= this.deckCount; d++) {
         let deck = new Deck({
            title: `${accountName} Deck ${d.toString().padStart(deckPad, '0')}.`
         })
         this.decks.push(deck)

         let accountDeck = new AccountDeck({
            accountId: this.account.id,
            deckId: deck.id,
            isSelected: d === 1 // Select first deck by default
         })
         this.accountDecks.push(accountDeck)

         // Create cards for this deck
         for (let c = 1; c <= this.cardsPerDeck; c++) {
            let cardTitle = `${accountName} D${d.toString().padStart(deckPad, '0')}C${c.toString().padStart(cardPad, '0')}`
            let card = new Card({
               deckId: deck.id,
               shortPhrase: cardTitle,
               phrase: `Question: What is ${cardTitle}?`,
               answer: `Answer: ${cardTitle} is a sample card for testing.`
            })
            this.cards.push(card)
         }
      }
   }

   async save() {
      try {
         // Add account
         await dbCtx.account.add(this.account)
         console.log(`Added account: ${this.account.name}`)

         // Add decks
         for (const deck of this.decks) {
            await dbCtx.deck.add(deck)
         }
         console.log(`Added ${this.decks.length} decks`)

         // Add account-deck relationships
         for (const accountDeck of this.accountDecks) {
            await dbCtx.accountDeck.add(accountDeck)
         }
         console.log(`Added ${this.accountDecks.length} account-deck relationships`)

         // Add cards
         for (const card of this.cards) {
            card.id = await newCardId()
            await dbCtx.card.add(card)
         }
         console.log(`Added ${this.cards.length} cards`)

         console.log(`✅ Seed data for "${this.account.name}" created successfully!`)
         return this.account
      } catch (error) {
         console.error('Error saving seed data:', error)
         throw error
      }
   }
}

/**
 * Adds sample seed data to the database
 * @param {string[]} accountNames - Array of account names to create
 * @param {number} deckCount - Number of decks per account (default: 3)
 * @param {number} cardsPerDeck - Number of cards per deck (default: 5)
 */
async function addSeedData(accountNames = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'], deckCount = 2, cardsPerDeck = 40) {
   try {
      console.log('🌱 Starting seed data creation...')
      
      const createdAccounts = []
      
      for (const name of accountNames) {
         // Check if account already exists
         try {
            const existingAccount = await dbCtx.account.byName(name)
            if (existingAccount) {
               console.log(`⚠️ Account "${name}" already exists, skipping...`)
               continue
            }
         } catch (error) {
            // Account doesn't exist, which is what we want for creating new seed data
            console.log(`✅ Account "${name}" doesn't exist, proceeding to create...`)
         }

         const seed = new SeedData(name, deckCount, cardsPerDeck)
         const account = await seed.save()
         createdAccounts.push(account)
      }

      console.log(`🎉 Seed data creation complete! Created ${createdAccounts.length} new accounts.`)
      
      // Set the first created account as selected if any were created
      if (createdAccounts.length > 0) {
         const metadata = await dbCtx.metadata.get()
         if (!metadata.selectedAccountId) {
            await dbCtx.metadata.setSelectedAccountId(createdAccounts[0].id)
            console.log(`📌 Set "${createdAccounts[0].name}" as selected account`)
         }
      }

      return createdAccounts
   } catch (error) {
      console.error('❌ Error in addSeedData:', error)
      throw error
   }
}

/**
 * Quick seed function for console use - creates one account with sample data
 * @param {string} name - Account name (default: random)
 */
async function quickSeed(name = null) {
   if (!name) {
      name = `TestUser_${newId(4)}`
   }
   
   console.log(`🚀 Quick seeding account: ${name}`)
   const accounts = await addSeedData([name], 2, 4)
   
   if (accounts.length > 0) {
      console.log(`✨ Quick seed complete! Account "${name}" created with 2 decks and 8 total cards.`)
      console.log(`💡 Tip: Use "app.route()" to refresh the page and see the new data.`)
      return accounts[0]
   }
   return null
}

/**
 * Creates quiz data for testing stats - takes existing quizzes and adds answers
 * @param {string} accountId - Account to create quiz data for
 * @param {number} quizCount - Number of quizzes to simulate (default: 3)
 */
async function addQuizData(accountId = null, quizCount = 3) {
   try {
      if (!accountId) {
         const metadata = await dbCtx.metadata.get()
         accountId = metadata.selectedAccountId
         if (!accountId) {
            console.log('❌ No account selected. Please select an account first.')
            return null
         }
      }

      console.log(`🎯 Creating quiz data for account: ${accountId}`)
      
      // Get account from state manager or find it in accounts list
      const account = stateMgr.account?.id === accountId ? stateMgr.account : stateMgr.accounts.find(acc => acc.id === accountId)
      
      if (!account) {
         console.log('❌ Account not found.')
         return null
      }
      
      const accountDecks = await dbCtx.accountDeck.list(accountId)
      
      if (!accountDecks.length) {
         console.log('❌ No decks found for this account')
         return null
      }

      let totalQuizzes = 0
      
      for (let i = 0; i < quizCount; i++) {
         // Create a quiz
         const quiz = await dbCtx.quiz.create(accountId, account.settings.defaultQuestionCount)
         if (!quiz) {
            console.log('⚠️ Could not create quiz - may not have enough cards')
            continue
         }
         
         if (!quiz.allCardIds || quiz.allCardIds.length === 0) {
            console.log('⚠️ Quiz has no cards - skipping')
            continue
         }
         
         console.log(`📝 Created quiz ${i + 1} with ${quiz.allCardIds.length} cards`)

         // Simulate answering all questions in the quiz
         for (let j = 0; j < quiz.allCardIds.length; j++) {
            const cardId = quiz.allCardIds[j]
            const isCorrect = Math.random() > 0.3 // 70% correct rate
            
            // Create unique timestamp for each answer to avoid ID collisions
            // Add quiz index and question index to ensure uniqueness
            const answerTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000 + (i * 1000) + j).toISOString()
            
            const questionAnswer = new QuestionAnswer({
               id: answerTime,
               accountId: accountId,
               quizId: quiz.id,
               cardId: cardId,
               answeredCorrectly: isCorrect
            })
            
            try {
               await dbCtx.questionAnswer.add(questionAnswer)
            } catch (error) {
               console.error('❌ Failed to add question answer:', error)
               console.log('QuestionAnswer data:', questionAnswer)
               console.log('Quiz data:', quiz)
               throw new Error(`Answer not added: ${error.message || error}`)
            }
         }

         // Mark quiz as complete
         quiz.answeredCardIds = [...quiz.allCardIds]
         quiz.completeDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() // Random date within last week
         await dbCtx.quiz.update(quiz)
         
         totalQuizzes++
      }

      console.log(`✅ Created ${totalQuizzes} completed quizzes with answers`)
      console.log(`💡 Tip: Check the Stats page to see the quiz performance data!`)
      return totalQuizzes
   } catch (error) {
      console.error('❌ Error creating quiz data:', error)
      throw error
   }
}

// Make functions available globally for console use
window.addSeedData = addSeedData
window.quickSeed = quickSeed
window.addQuizData = addQuizData

console.log(`
🌱 Seed Data Functions Available:
- quickSeed('name') - Quick create one test account
- addSeedData(['name1', 'name2']) - Create multiple accounts
- addQuizData() - Add quiz/stats data to current account

Example: quickSeed('TestUser')
`)