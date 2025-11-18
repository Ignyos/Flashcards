page = {
   get currentTab() {
      return stateMgr.account?.state?.selectedTab || 'decks'
   },

   set currentTab(value) {
      if (stateMgr.account?.state) {
         stateMgr.account.state.selectedTab = value
         // Save the account state to persist the tab selection
         dbCtx.account.update(stateMgr.account)
      }
   },

   get element() {
      let ele = document.createElement('div')
      ele.id = 'page'
      let panes = document.createElement('div')
      panes.id = 'panes'
      panes.appendChild(this.tabHeader)
      panes.appendChild(this.tabContent)
      ele.appendChild(panes)
      return ele
   },

   get tabHeader() {
      let header = document.createElement('div')
      header.id = 'tab-header'
      header.appendChild(this.getTabButton('decks', 'DECKS'))
      header.appendChild(this.getTabButton('cards', 'CARDS'))
      return header
   },

   get tabContent() {
      let content = document.createElement('div')
      content.id = 'tab-content'
      // Don't populate content immediately - wait for load() to be called
      return content
   },

   getTabButton(tabId, tabText) {
      let button = document.createElement('div')
      button.classList.add('tab-button')
      button.setAttribute('data-tab', tabId)
      
      // Add active/disabled classes
      if (this.currentTab === tabId) {
         button.classList.add('active')
      }
      if (tabId === 'cards' && !stateMgr?.deckId) {
         button.classList.add('disabled')
      }

      let textSpan = document.createElement('span')
      textSpan.classList.add('tab-button-text')
      textSpan.textContent = tabText
      button.appendChild(textSpan)

      let addBtn = document.createElement('div')
      addBtn.classList.add('tab-add-btn')
      addBtn.textContent = '+'
      
      // Add click handlers
      button.addEventListener('click', (e) => {
         if (!button.classList.contains('disabled') && e.target !== addBtn) {
            this.switchTab(tabId)
         }
      })

      addBtn.addEventListener('click', (e) => {
         e.stopPropagation()
         if (!button.classList.contains('disabled')) {
            this.handleAddClick(tabId)
         }
      })

      button.appendChild(addBtn)
      return button
   },

   handleAddClick(tabId) {
      if (tabId === 'decks') {
         this.showDeckModal()
      } else if (tabId === 'cards') {
         // Switch to cards tab when adding a card
         this.switchTab('cards')
         this.showCardModal()
      }
   },

   async showDeckModal(deck = null) {
      if (deck) {
         stateMgr.deck = deck
         stateMgr.isEditingDeck = true
      } else {
         stateMgr.deck = new Deck()
         stateMgr.isEditingDeck = false
      }
      document.getElementById('site-header').classList.add('blur')
      app.formModal('modal-bg', this.getDeckModal())
   },

   getDeckModal() {
      // Message text
      let message = document.createElement('div')
      message.classList.add('msg')
      // message.textContent = 'Create a new deck\n-or-\nselect from existing decks on this device.'
      let l1 = document.createElement('h2')
      l1.textContent = 'Create a new deck or select from'
      let l2 = document.createElement('h2')
      l2.textContent = ' existing decks on this device.'
      message.appendChild(l1)
      message.appendChild(l2)

      // Text input for new deck
      let titleInput = document.createElement('input')
      titleInput.id = 'deck-title'
      titleInput.type = 'text'
      titleInput.placeholder = 'New Deck Name'
      titleInput.value = stateMgr.deck.title || ''

      // Dropdown for existing decks
      let existingSelect = document.createElement('select')
      existingSelect.id = 'existing-decks'
      this.populateExistingDecks(existingSelect)

      let ele = document.createElement('div')
      ele.classList.add('modal')
      ele.classList.add('deck-modal') // Custom class for multi-input layout
      ele.appendChild(message)
      ele.appendChild(titleInput)
      ele.appendChild(existingSelect)
      ele.appendChild(this.deckControls)
      return ele
   },

   async showCardModal(card = null) {
      if (card) {
         stateMgr.card = card
      } else {
         stateMgr.card = new Card()
      }
      document.getElementById('site-header').classList.add('blur')
      app.formModal('question-modal-bg', this.getCardModal())
   },

   getCardModal() {
      let sp = document.createElement('input')
      sp.id = 'card-short-phrase'
      sp.type = 'text'
      sp.placeholder = 'Short Phrase'
      sp.value = stateMgr.card.shortPhrase || ''

      let ph = document.createElement('textarea')
      ph.id = 'card-phrase'
      ph.placeholder = 'Enter the full phrasing of the question here.'
      ph.rows = 5
      ph.innerText = stateMgr.card.phrase || ''

      let an = document.createElement('textarea')
      an.id = 'card-answer'
      an.placeholder = 'Enter the answer to the question here.'
      an.innerText = stateMgr.card.answer || ''

      let frm = document.createElement('div')
      frm.classList.add('question-form') // Reuse existing form styles
      frm.appendChild(sp)
      frm.appendChild(ph)
      frm.appendChild(an)
      frm.appendChild(this.cardControls)

      let ele = document.createElement('div')
      ele.classList.add('question-modal') // Reuse existing modal styles
      ele.appendChild(frm)
      return ele
   },

   async populateExistingDecks(selectElement) {
      // Add default option
      let defaultOption = document.createElement('option')
      defaultOption.value = ''
      defaultOption.textContent = '-- Select existing deck --'
      selectElement.appendChild(defaultOption)

      try {
         // Get all decks from the database
         const allDecks = await dbCtx.deck.getAll()
         
         // Get current user's deck IDs
         const userDeckIds = stateMgr.decks ? stateMgr.decks.map(d => d.deckId) : []
         
         // Filter out decks the user already has
         const availableDecks = allDecks.filter(deck => !userDeckIds.includes(deck.id))
         
         // Populate dropdown with available decks
         availableDecks.forEach(deck => {
            let option = document.createElement('option')
            option.value = deck.id
            option.textContent = deck.title
            selectElement.appendChild(option)
         })
         
         // Add event listener to handle selection
         selectElement.addEventListener('change', async (e) => {
            if (e.target.value) {
               // User selected an existing deck - automatically save and close modal
               document.getElementById('deck-title').value = ''
               document.getElementById('deck-title').placeholder = 'Or create new deck name'
               
               // Automatically save the selected deck
               await this.saveSelectedDeck(e.target.value)
            } else {
               // User cleared selection - restore input placeholder
               document.getElementById('deck-title').placeholder = 'New Deck Name'
            }
         })
         
      } catch (error) {
         console.error('Error loading existing decks:', error)
      }
   },

   async saveSelectedDeck(selectedDeckId) {
      try {
         // First check if user already has this deck (shouldn't happen due to filtering, but safety check)
         const userDeckIds = stateMgr.decks ? stateMgr.decks.map(d => d.deckId) : []
         if (userDeckIds.includes(selectedDeckId)) {
            console.log('User already has this deck')
            return
         }

         // Get the selected deck from the database
         let existingDeck = await dbCtx.deck.get(selectedDeckId)
         if (existingDeck) {
            // Create AccountDeck relationship
            let newAccountDeck = new AccountDeck({
               accountId: stateMgr.account.id, 
               deckId: existingDeck.id
            })
            
            // Add new AccountDeck record (creates a new relationship for this user)
            await dbCtx.accountDeck.add(newAccountDeck)
            
            // Create a DeckListItem for the state manager
            let deckListItem = new DeckListItem(newAccountDeck, existingDeck)
            await stateMgr.addNewAccountDeck(deckListItem)
            
            // Close the modal and refresh
            this.refreshTabs()
            document.getElementById('site-header').classList.remove('blur')
            app.hideModal()
         }
      } catch (error) {
         console.error('Error saving selected deck:', error)
      }
   },

   get deckControls() {
      let save = document.createElement('div')
      save.innerText = "SAVE"
      save.classList.add('modal-btn')
      save.classList.add('ok')
      save.addEventListener('click', async () => {
         await this.saveDeck()
      })

      let cancel = document.createElement('div')
      cancel.innerText = "CANCEL"
      cancel.classList.add('modal-btn')
      cancel.classList.add('cancel')
      cancel.addEventListener('click', () => {
         document.getElementById('site-header').classList.remove('blur')
         app.hideModal()
      })

      let ele = document.createElement('div')
      ele.classList.add('ctrls')
      ele.appendChild(save)
      ele.appendChild(cancel)
      return ele
   },

   async saveDeck() {
      let titleInput = document.getElementById('deck-title')
      let existingSelect = document.getElementById('existing-decks')
      
      let title = titleInput?.value.trim()
      let selectedDeckId = existingSelect?.value
      
      // Check if user selected an existing deck
      if (selectedDeckId) {
         // Add existing deck to user's account
         let existingDeck = await dbCtx.deck.get(selectedDeckId)
         if (existingDeck) {
            let newAccountDeck = new AccountDeck({
               accountId: stateMgr.account.id, 
               deckId: existingDeck.id
            })
            await dbCtx.accountDeck.add(newAccountDeck)
            let deckListItem = new DeckListItem(newAccountDeck, existingDeck)
            await stateMgr.addNewAccountDeck(deckListItem)
         }
      } else if (title) {
         // Check if we're editing an existing deck or creating a new one
         if (stateMgr.isEditingDeck) {
            // Edit existing deck
            stateMgr.deck.title = title
            await dbCtx.deck.update(stateMgr.deck)
            await stateMgr.loadDecks()
         } else {
            // Create brand new deck
            let newDeck = new Deck({title: title})
            let newAccountDeck = new AccountDeck({accountId: stateMgr.account.id, deckId: newDeck.id})
            await dbCtx.deck.add(newDeck)
            await dbCtx.accountDeck.add(newAccountDeck)
            let deckListItem = new DeckListItem(newAccountDeck, newDeck)
            await stateMgr.addNewAccountDeck(deckListItem)
         }
      } else {
         // No input provided
         if (!selectedDeckId && !title) {
            titleInput.focus()
            return
         }
      }

      this.refreshTabs()
      document.getElementById('site-header').classList.remove('blur')
      app.hideModal()
   },

   get cardControls() {
      let save = document.createElement('div')
      save.innerText = "SAVE"
      save.classList.add('btn')
      save.classList.add('save')
      save.addEventListener('click', async () => {
         await this.saveCard()
      })

      let cancel = document.createElement('div')
      cancel.innerText = "CANCEL"
      cancel.classList.add('btn')
      cancel.classList.add('cancel')
      cancel.addEventListener('click', () => {
         document.getElementById('site-header').classList.remove('blur')
         app.hideModal()
      })

      let ele = document.createElement('div')
      ele.classList.add('question-controls') // Reuse existing control styles
      ele.appendChild(save)
      ele.appendChild(cancel)
      return ele
   },

   async saveCard() {
      let shortPhraseInput = document.getElementById('card-short-phrase')
      let phraseInput = document.getElementById('card-phrase')
      let answerInput = document.getElementById('card-answer')
      
      let shortPhrase = shortPhraseInput?.value.trim()
      let phrase = phraseInput?.value.trim()
      let answer = answerInput?.value.trim()

      if (!shortPhrase) {
         shortPhraseInput.focus()
         return
      }

      if (!stateMgr.card.id || stateMgr.card.isNew) {
         // Create new card
         let newCard = new Card({
            id: newId(6), // Generate a new ID
            shortPhrase: shortPhrase,
            phrase: phrase,
            answer: answer,
            deckId: stateMgr.deckId
         })
         await dbCtx.card.add(newCard)
         await stateMgr.addCard(newCard)
      } else {
         // Update existing card
         stateMgr.card.shortPhrase = shortPhrase
         stateMgr.card.phrase = phrase
         stateMgr.card.answer = answer
         await dbCtx.card.update(stateMgr.card)
         await stateMgr.loadCards()
      }

      this.refreshTabs()
      document.getElementById('site-header').classList.remove('blur')
      app.hideModal()
   },

   showDeleteDeckConfirm(deck) {
      app.confirm(async () => {
         await this.deleteDeck(deck)
      }, `Delete deck "${deck.title}"?`)
   },

   async deleteDeck(deck) {
      // Delete only the AccountDeck record (association between user and deck)
      await dbCtx.accountDeck.delete(stateMgr.account.id, deck.deckId)
      await stateMgr.loadDecks()
      if (stateMgr.deckId === deck.deckId) {
         stateMgr.setDeckId(null)
         await stateMgr.loadCards()
      }
      this.refreshTabs()
   },

   showDeleteCardConfirm(card) {
      app.confirm(async () => {
         await this.deleteCard(card)
      }, `Delete card "${card.shortPhrase}"?`)
   },

   async deleteCard(card) {
      await stateMgr.deleteCard(card)
      
      // Clear selected card if it was the deleted one
      const selectedCardId = stateMgr.getSelectedCard(stateMgr.deckId)
      if (selectedCardId === card.id) {
         await stateMgr.setSelectedCard(stateMgr.deckId, null)
      }
      
      this.refreshTabs()
   },

   switchTab(tabId) {
      this.currentTab = tabId
      this.refreshTabs()
   },

   updateTabContent(contentElement) {
      contentElement.innerHTML = ''
      
      if (this.currentTab === 'decks') {
         contentElement.appendChild(this.deckList)
      } else if (this.currentTab === 'cards') {
         if (stateMgr?.deckId) {
            // Add deck header
            contentElement.appendChild(this.getDeckHeader())
            contentElement.appendChild(this.cardList)
         } else {
            contentElement.appendChild(this.getEmptyState('Select a deck to view cards'))
         }
      }
   },

   getEmptyState(message) {
      let emptyDiv = document.createElement('div')
      emptyDiv.style.padding = '2rem'
      emptyDiv.style.textAlign = 'center'
      emptyDiv.style.color = '#aab1b5'
      emptyDiv.style.fontSize = '18px'
      emptyDiv.textContent = message
      return emptyDiv
   },

   getDeckHeader() {
      let headerDiv = document.createElement('div')
      headerDiv.classList.add('deck-header')
      
      // Get the current deck name
      let currentDeck = stateMgr.decks?.find(d => d.deckId === stateMgr.deckId)
      let deckName = currentDeck?.title || 'Unknown Deck'
      
      headerDiv.innerHTML = `
         <h2>Cards in: <span class="deck-name">${deckName}</span></h2>
      `
      
      return headerDiv
   },

   refreshTabs() {
      // Update tab buttons
      let tabButtons = document.querySelectorAll('.tab-button')
      tabButtons.forEach(btn => {
         let tabId = btn.getAttribute('data-tab')
         
         // Update active state
         if (tabId === this.currentTab) {
            btn.classList.add('active')
         } else {
            btn.classList.remove('active')
         }
         
         // Update disabled state for cards tab
         if (tabId === 'cards') {
            if (stateMgr?.deckId) {
               btn.classList.remove('disabled')
            } else {
               btn.classList.add('disabled')
            }
         }
      })

      // Update content
      let tabContent = document.getElementById('tab-content')
      if (tabContent) {
         this.updateTabContent(tabContent)
      }
   },

   async load() {
      await stateMgr.loadDecks()
      await stateMgr.loadCards()
      this.refreshTabs()
   },

   get deckList() {
      let ele = document.createElement('div')
      ele.classList.add('deck-list')
      this.populateDeckList(ele)
      return ele
   },

   populateDeckList(container) {
      container.innerHTML = ''
      if (stateMgr.decks) {
         stateMgr.decks.forEach(deck => {
            container.appendChild(this.deckListItem(deck))
         })
      }
      if (!stateMgr.decks || stateMgr.decks.length == 0) {
         let ele = document.createElement('div')
         ele.classList.add('no-items')
         ele.innerText = 'Add a deck to get started.'
         container.appendChild(ele)
      }
   },

   deckListItem(deck) {
      let ele = document.createElement('div')
      ele.id = `deck-${deck.deckId}`

      // Create checkbox for quiz selection
      let checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = deck.isSelected
      checkbox.addEventListener('change', async (e) => {
         await this.toggleDeckSelection(deck.deckId, e.target.checked)
      })
      ele.appendChild(checkbox)

      let txt = document.createElement('div')
      txt.innerText = deck.title
      ele.appendChild(txt)

      if (stateMgr.account.state.selectedDeckId == deck.deckId) {
         ele.classList.add('item-selected')
         ele.appendChild(document.createElement('div')) // Placeholder for alignment
         ele.appendChild(this.editDeckBtn(deck))
         ele.appendChild(this.deleteDeckBtn(deck))
      } else {
         ele.classList.add('item')
         ele.addEventListener('click', async () => {
            await stateMgr.setDeckId(deck.deckId)
            await stateMgr.loadCards()
            this.refreshTabs()
         })
      }
      return ele
   },

   editDeckBtn(deck) {
      let ele = document.createElement('div')
      ele.classList.add('edit')
      ele.addEventListener('click', () => {
         let item = document.getElementById(`deck-${deck.deckId}`)
         let edit = this.deckListItemEditing(deck)
         item.replaceWith(edit)
         document.getElementById('edit-deck').focus()
      })
      return ele
   },

   deleteDeckBtn(deck) {
      let ele = document.createElement('div')
      ele.classList.add('trash')
      ele.addEventListener('click', () => {
         this.showDeleteDeckConfirm(deck)
      })
      return ele
   },

   deckListItemEditing(deck) {
      let ele = document.createElement('div')
      ele.id = `deck-${deck.deckId}`
      ele.classList.add('item-editing')
      
      // Add checkbox (maintaining same structure as normal item)
      let checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = deck.isSelected
      checkbox.addEventListener('change', async (e) => {
         await this.toggleDeckSelection(deck.deckId, e.target.checked)
      })
      ele.appendChild(checkbox)
      
      ele.appendChild(this.getEditDeckInput(deck))
      ele.appendChild(this.getEditDeckButton(deck))
      return ele
   },

   getEditDeckInput(deck) {
      let input = document.createElement('input')
      input.type = 'text'
      input.spellcheck = false
      input.placeholder = 'A title is required!'
      input.value = deck.title
      input.id = 'edit-deck'
      input.classList.add('edit-deck')
      input.addEventListener('keyup', async (event) => {
         if (event.key == 'Enter') {
            await this.editDeck(deck)
         } else if (event.key == 'Escape') {
            this.refreshTabs()
         }
      })
      return input
   },

   getEditDeckButton(deck) {
      let btn = document.createElement('div')
      btn.classList.add('btn')
      btn.classList.add('check')
      btn.addEventListener('click', async () => {
         await this.editDeck(deck)
      })
      return btn
   },

   async editDeck(deck) {
      let val = document.getElementById('edit-deck').value.trim()
      if (val == '') return
      
      // Update the local state
      deck.title = val
      
      // Update the database - need to update the actual Deck record
      const deckToUpdate = deck.toDeck()
      deckToUpdate.title = val
      await dbCtx.deck.update(deckToUpdate)
      
      // Refresh the deck list
      await stateMgr.loadDecks()
      this.refreshTabs()
   },

   async toggleDeckSelection(deckId, isSelected) {
      try {
         // Update the local state
         const deck = stateMgr.decks.find(d => d.deckId === deckId)
         if (deck) {
            deck.isSelected = isSelected
         }

         // Update the database
         const accountDeck = new AccountDeck({
            accountId: stateMgr.account.id,
            deckId: deckId,
            isSelected: isSelected
         })
         
         await dbCtx.accountDeck.update(accountDeck)
      } catch (error) {
         console.error('Error toggling deck selection:', error)
      }
   },

   get cardList() {
      let ele = document.createElement('div')
      ele.classList.add('card-list')
      this.populateCardList(ele)
      return ele
   },

   populateCardList(container) {
      container.innerHTML = ''
      if (stateMgr.cards) {
         stateMgr.cards.forEach(card => {
            container.appendChild(this.cardListItem(card))
         })
      }
      if (!stateMgr.cards || stateMgr.cards.length == 0) {
         let ele = document.createElement('div')
         ele.classList.add('no-items')
         ele.innerText = 'No cards in this deck.'
         container.appendChild(ele)
      }
   },

   cardListItem(card) {
      let ele = document.createElement('div')
      ele.id = `card-${card.id}`
      ele.innerText = card.shortPhrase
      
      // Use the new per-deck card selection tracking
      const deckId = stateMgr.deckId
      const selectedCardId = deckId ? stateMgr.getSelectedCard(deckId) : null
      
      if (selectedCardId == card.id) {
         ele.classList.add('card-item-selected')
         ele.appendChild(this.editCardBtn(card))
         ele.appendChild(this.deleteCardBtn(card))
      } else {
         ele.classList.add('card-item')
         ele.addEventListener('click', async () => {
            if (deckId) {
               await stateMgr.setSelectedCard(deckId, card.id)
               // Reload deck data to ensure UI reflects database state
               await stateMgr.loadDecks()
               this.refreshTabs()
            }
         })
      }
      return ele
   },

   editCardBtn(card) {
      let ele = document.createElement('div')
      ele.classList.add('edit')
      ele.addEventListener('click', async () => {
         this.showCardModal(card)
      })
      return ele
   },

   deleteCardBtn(card) {
      let ele = document.createElement('div')
      ele.classList.add('trash')
      ele.addEventListener('click', () => {
         this.showDeleteCardConfirm(card)
      })
      return ele
   },

   //#endregion

   //#region Question Modal

   async showQuestionModal()
   {
      document.getElementById('site-header').classList.add('blur')
      app.formModal('question-modal-bg', this.getQuestionModal())
   },

   getQuestionModal() {
      let sp = document.createElement('input')
      sp.id = 'short-phrase'
      sp.type = 'text'
      sp.value = stateMgr.question.shortPhrase

      let ph = document.createElement('textarea')
      ph.id = 'phrase'
      ph.placeholder = 'Enter the full phrasing of the question here.'
      ph.rows = 5
      ph.innerText = stateMgr.question.phrase ?? ''

      let an = document.createElement('textarea')
      an.id = 'answer'
      an.placeholder = 'Enter the answer to the question here.'
      an.innerText = stateMgr.question.answer ?? ''

      let frm = document.createElement('div')
      frm.classList.add('question-form')
      frm.appendChild(sp)
      frm.appendChild(ph)
      frm.appendChild(an)
      frm.appendChild(this.questionControls)

      let ele = document.createElement('div')
      ele.classList.add('question-modal')
      ele.appendChild(frm)
      return ele
   },

   get questionControls() {
      let save = document.createElement('div')
      save.innerText = "SAVE"
      save.classList.add('btn')
      save.classList.add('save')
      save.addEventListener('click', async () => {
         await this.saveQuestion()
         await this.refreshTopicPane()
      })

      let cancel = document.createElement('div')
      cancel.innerText = "CANCEL"
      cancel.classList.add('btn')
      cancel.classList.add('cancel')
      cancel.addEventListener('click', () => {
         document.getElementById('site-header').classList.remove('blur')
         app.hideModal()
      })

      let ele = document.createElement('div')
      ele.classList.add('question-controls')
      ele.appendChild(save)
      ele.appendChild(cancel)
      return ele
   },

   async saveQuestion() {
      let form = this.questionForm
      if (form.isValid())
      {
         if (stateMgr.question.isNew) {
            let newQuestion = new Question(form)
            newQuestion.id = await newQuestionId()
            await stateMgr.addQuestion(newQuestion)
         } else {
            let updatedQuestion = new Question(form)
            await stateMgr.updateQuestion(updatedQuestion)
         }
         await this.refreshQuestionPane()
         document.getElementById('site-header').classList.remove('blur')
         app.hideModal()
      }
   },

   get questionForm() {
      let shortPhrase = document.getElementById('short-phrase')?.value.trim()
      let phrase = document.getElementById('phrase')?.value.trim()
      let answer = document.getElementById('answer')?.value.trim()

      let isValid = () => {
         let result = true
         if (shortPhrase == '') {
            result = false
            messageCenter.addError('A short phrasing of the question is required.')
         }
         if (phrase == '') {
            result = false
            messageCenter.addError('The full phrasing of the question is required.')
         }
         if (answer == '') {
            result = false
            messageCenter.addError('The answer to the question is required.')
         }
         return result
      }

      return {
         'id': stateMgr.question.id,
         'topicId': stateMgr.topicId,
         'shortPhrase': shortPhrase,
         'phrase': phrase,
         'answer': answer,
         'isValid': isValid
      }
   },

   //#endregion

   getPaneHeader(name) {
      let ele = document.createElement('div')
      ele.classList.add('header')
      ele.innerText = name

      return ele
   },
}