page = {
   currentTab: 'decks', // Track active tab: 'decks' or 'cards'

   get element() {
      let ele = document.createElement('div')
      ele.id = 'page'
      ele.appendChild(navigation.element)
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
      document.getElementById('nav').classList.add('blur')
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
      document.getElementById('nav').classList.add('blur')
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
            
            // Use update instead of add to handle potential duplicates
            await dbCtx.accountDeck.update(newAccountDeck)
            
            // Create a DeckListItem for the state manager
            let deckListItem = new DeckListItem(newAccountDeck, existingDeck)
            await stateMgr.addNewAccountDeck(deckListItem)
            
            // Close the modal and refresh
            this.refreshTabs()
            document.getElementById('site-header').classList.remove('blur')
            document.getElementById('nav').classList.remove('blur')
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
         document.getElementById('nav').classList.remove('blur')
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
      document.getElementById('nav').classList.remove('blur')
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
         document.getElementById('nav').classList.remove('blur')
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

      if (stateMgr.card.isNew) {
         let newCard = new Card({
            shortPhrase: shortPhrase,
            phrase: phrase,
            answer: answer,
            deckId: stateMgr.deckId
         })
         await dbCtx.card.add(newCard)
         await stateMgr.addCard(newCard)
      } else {
         stateMgr.card.shortPhrase = shortPhrase
         stateMgr.card.phrase = phrase
         stateMgr.card.answer = answer
         await dbCtx.card.update(stateMgr.card)
         await stateMgr.loadCards()
      }

      this.refreshTabs()
      document.getElementById('site-header').classList.remove('blur')
      document.getElementById('nav').classList.remove('blur')
      app.hideModal()
   },

   showDeleteDeckConfirm(deck) {
      app.confirm(async () => {
         await this.deleteDeck(deck)
      }, `Delete deck "${deck.title}"?`)
   },

   async deleteDeck(deck) {
      await dbCtx.deck.delete(deck.id)
      await dbCtx.accountDeck.deleteByDeckId(deck.id)
      await stateMgr.loadDecks()
      if (stateMgr.deckId === deck.id) {
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
      await dbCtx.card.delete(card.id)
      await stateMgr.loadCards()
      if (stateMgr.account.state.selectedCardId === card.id) {
         stateMgr.setCard(null)
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

      let txt = document.createElement('div')
      txt.innerText = deck.title
      ele.appendChild(txt)

      if (stateMgr.account.state.selectedDeckId == deck.deckId) {
         ele.classList.add('item-selected')
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
         this.showDeckModal(deck)
      })
      return ele
   },

   deleteDeckBtn(deck) {
      let ele = document.createElement('div')
      ele.classList.add('delete')
      ele.addEventListener('click', () => {
         this.showDeleteDeckConfirm(deck)
      })
      return ele
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
      if (stateMgr.account.state.selectedCardId == card.id) {
         ele.classList.add('item-selected')
         ele.appendChild(this.editCardBtn(card))
         ele.appendChild(this.deleteCardBtn(card))
      } else {
         ele.classList.add('item')
         ele.addEventListener('click', async () => {
            await stateMgr.setCard(card)
            this.refreshTabs()
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
      ele.classList.add('delete')
      ele.addEventListener('click', () => {
         this.showDeleteCardConfirm(card)
      })
      return ele
   },

   async initNav() {
      // if (!stateMgr.account) return
      // if (stateMgr.account.state.currentPage == pages.HOME) return 
      // if (stateMgr.account.state.currentPage == pages.STATS) return 
      let nav = document.getElementById('nav')
      if (nav) nav.remove()
      let page = document.getElementById('page')
      page.appendChild(navigation.element)
      // document.body.appendChild(navigation.element)
   },

   //#region Subject Pane

   async refreshSubjectPane() {
      document.getElementById('subject-pane').remove()
      let panes = document.getElementById('panes')
      panes.appendChild(this.subjectPane)
      this.populateSubjectList()
   },

   get subjectPane() {
      let ele = document.createElement('div')
      ele.id = 'subject-pane'
      ele.classList.add('pane')
      ele.appendChild(this.getPaneHeader('S U B J E C T'))
      ele.appendChild(this.subjectPaneControls)
      ele.appendChild(this.subjectList)
      return ele
   },

   get subjectPaneControls() {
      let ele = document.createElement('div')
      ele.classList.add('controls')
      ele.appendChild(this.newSubjectControl)
      return ele
   },

   get newSubjectControl() {
      let ele = document.createElement('div')
      ele.id = 'new-subject-control'
      ele.appendChild(this.newSubjectInput)
      ele.appendChild(this.newSubjectButton)
      return ele
   },

   get newSubjectInput() {
      let input = document.createElement('input')
      input.type = 'text'
      input.placeholder = 'New Subject'
      input.spellcheck = false
      input.id = 'new-subject'
      input.classList.add('new-subject')
      input.addEventListener('keyup',async (event) => {
         if (event.key == 'Enter') {
            await this.createNewSubject()
         } else if (event.key == 'Escape') {
            document.getElementById('new-subject').value = ''
         }
      })
      return input
   },

   get newSubjectButton() {
      let btn = document.createElement('div')
      btn.classList.add('btn')
      btn.classList.add('plus')
      btn.addEventListener('click', async () => {
         await this.createNewSubject()
      })
      return btn
   },

   async createNewSubject() {
      let val = document.getElementById('new-subject').value.trim()
      if (val == '') return
      let newSubject = new Subject({title: val})
      let newAcctSub = new AccountSubject({accountId: stateMgr.account.id, subjectId: newSubject.id})
      let subListItem = new SubjectListItem(newAcctSub,newSubject)
      await dbCtx.subject.add(newSubject)
      await dbCtx.accountSubject.add(newAcctSub)
      await stateMgr.addNewAccountSubject(subListItem)
      await this.refreshSubjectPane()
      await this.refreshTopicPane()
      await this.refreshQuestionPane()
   },

   get subjectList() {
      let ele = document.createElement('div')
      ele.id = 'subject-list'
      return ele
   },

   populateSubjectList() {
      let subList = document.getElementById('subject-list')
      subList.innerHTML = null
      stateMgr.subjects.forEach(aSub => {
         subList.appendChild(this.subjectListItem(aSub))
      })
      if (stateMgr.subjects.length == 0) {
         let ele = document.createElement('div')
         ele.classList.add('no-items')
         ele.innerText = 'Add a subject to get started.'
         subList.appendChild(ele)
      }
   },

   subjectListItem(subject) {
      let ele = document.createElement('div')
      ele.id = `sub-${subject.subjectId}`

      let txt = document.createElement('div')
      txt.innerText = subject.title
      ele.appendChild(txt)

      let focus = document.createElement('span')
      if (subject.focusTopicIds.length > 0) focus.innerText = '*'
      ele.appendChild(focus)

      if (stateMgr.account.state.selectedSubjectId == subject.subjectId) {
         ele.classList.add('item-selected')
         ele.appendChild(this.editSubjectBtn(subject))
         ele.appendChild(this.deleteSubjectBtn(subject))
      } else {
         ele.classList.add('item')
         ele.addEventListener('click', async () => {
            await stateMgr.setSubjectId(subject.subjectId)
            await stateMgr.loadTopics()
            await stateMgr.loadQuestions()
            await this.refreshSubjectPane()
            await this.refreshTopicPane(true)
            await this.refreshQuestionPane()
         })
      }
      return ele
   },

   editSubjectBtn(subject) {
      let ele = document.createElement('div')
      ele.classList.add('edit')
      ele.addEventListener('click', () => {
         let item = document.getElementById(`sub-${subject.subjectId}`)
         let edit = this.subjectListItemEditing(subject)
         item.replaceWith(edit)
         document.getElementById('edit-subject').focus()
      })
      return ele
   },

   deleteSubjectBtn(subject) {
      let ele = document.createElement('div')
      ele.classList.add('trash')
      ele.addEventListener('click', () => {
         app.confirm(async () => {
            await this.deleteSubject(subject)
         },`Delete "${subject.title}"?`)
      })
      return ele
   },

   async deleteSubject(subject) {
      await stateMgr.deleteAccountSubject(subject)
      app.hideModal()
      await this.refreshSubjectPane()
      await this.refreshTopicPane()
      await this.refreshQuestionPane()
   },

   subjectListItemEditing(subject) {
      let ele = document.createElement('div')
      ele.id = `sub-${subject.subjectId}`
      ele.classList.add('item-editing')
      ele.appendChild(this.getEditSubjectInput(subject))
      ele.appendChild(this.getEditSubjectButton(subject))
      return ele
   },

   getEditSubjectInput(subject) {
      let input = document.createElement('input')
      input.type = 'text'
      input.spellcheck = false
      input.placeholder = 'A title is required!'
      input.value = subject.title
      input.id = 'edit-subject'
      input.classList.add('edit-subject')
      input.addEventListener('keyup',async (event) => {
         if (event.key == 'Enter') {
            await this.editSubject(subject)
         } else if (event.key == 'Escape') {
            await app.route()
         }
      })
      return input
   },

   getEditSubjectButton(subject) {
      let btn = document.createElement('div')
      btn.classList.add('btn')
      btn.classList.add('check')
      btn.addEventListener('click', async () => {
         await this.editSubject(subject)
      })
      return btn
   },

   async editSubject(subject) {
      let val = document.getElementById('edit-subject').value.trim()
      if (val == '') return
      subject.title = val
      await stateMgr.updateAccountSubject(subject)
      await this.refreshSubjectPane()
      await this.refreshTopicPane()
      await this.refreshQuestionPane()
   },

   //#endregion

   //#region Topic Pane

   async refreshTopicPane() {
      document.getElementById('topic-pane').remove()
      let page = document.getElementById('panes')
      page.appendChild(this.topicPane)
      this.populateTopicList()
   },

   get topicPane() {
      let ele = document.createElement('div')
      ele.id = 'topic-pane'
      ele.classList.add('pane')
      ele.appendChild(this.getPaneHeader('T O P I C'))
      if (stateMgr.account.state.selectedSubjectId) {
         ele.appendChild(this.topicPaneControls)
         ele.appendChild(this.topicList)
      }
      return ele
   },

   get topicPaneControls() {
      let ele = document.createElement('div')
      ele.classList.add('controls')
      ele.appendChild(this.newTopicControl)
      return ele
   },

   get newTopicControl() {
      let ele = document.createElement('div')
      ele.id = 'new-topic-control'
      ele.appendChild(this.newTopicInput)
      ele.appendChild(this.newTopicButton)
      return ele
   },

   get newTopicInput() {
      let input = document.createElement('input')
      input.type = 'text'
      input.placeholder = 'New Topic'
      input.spellcheck = false
      input.id = 'new-topic'
      input.classList.add('new-topic')
      input.addEventListener('keyup',async (event) => {
         if (event.key == 'Enter') {
            await this.createTopic()
         } else if (event.key == 'Escape') {
            document.getElementById('new-topic').value = ''
         }
      })
      return input
   },

   get newTopicButton() {
      let btn = document.createElement('div')
      btn.classList.add('btn')
      btn.classList.add('plus')
      btn.addEventListener('click', async () => {
         await this.createTopic()
      })
      return btn
   },

   async createTopic() {
      let val = document.getElementById('new-topic').value.trim()
      if (val == '') return
      let newTopic = new Topic({subjectId: stateMgr.account.state.selectedSubjectId, title: val})
      await dbCtx.topic.add(newTopic)
      await stateMgr.addNewTopic(newTopic)
      await this.refreshTopicPane()
      await this.refreshQuestionPane()
   },

   get topicList() {
      let ele = document.createElement('div')
      ele.id = 'topic-list'
      return ele
   },

   populateTopicList() {
      let topicList = document.getElementById('topic-list')
      if (!topicList) return
      topicList.innerHTML = null
      stateMgr.topics.forEach(topic => {
         topicList.appendChild(this.topicListItem(topic))
      })
   },

   topicListItem(topic) {
      let ele = document.createElement('div')
      ele.id = `top-${topic.id}`

      ele.appendChild(this.getFocusTopicBtn(topic))

      let txt = document.createElement('div')
      txt.innerText = topic.title
      ele.appendChild(txt)

      if (stateMgr.topicId == topic.id) {
         ele.classList.add('item-selected')
         ele.appendChild(this.editTopicBtn(topic))
         ele.appendChild(this.deleteTopicBtn(topic))
      } else {
         ele.classList.add('item')
         ele.addEventListener('click', async () => {
            await stateMgr.setTopicId(topic.id)
            await this.refreshTopicPane()
            await this.refreshQuestionPane()
         })
      }
      return ele
   },

   getFocusTopicBtn(topic) {
      let ele = document.createElement('div')
      ele.classList.add('focus-btn')

      if (stateMgr.accountSubject?.focusTopicIds.includes(topic.id)) {
         ele.innerText = '*'
         ele.title = 'This topic is currently in focus.'
      } else {
         ele.title = 'Click to focus on this topic.'
      }
      if (topic.questionCount > 0) {
         ele.addEventListener('click', async (event) => {
            event.stopImmediatePropagation()
            await stateMgr.toggleFocusTopic(topic.id)
            await this.initNav()
            await this.refreshSubjectPane()
            await this.refreshTopicPane()
         })
      } else {
         ele.classList.add('disabled')
         ele.title = 'Add questions to focus on this topic.'
      }
      return ele
   },

   editTopicBtn(topic) {
      let ele = document.createElement('div')
      ele.classList.add('edit')
      ele.addEventListener('click', () => {
         let item = document.getElementById(`top-${topic.id}`)
         let edit = this.topictListItemEditing(topic)
         item.replaceWith(edit)
         document.getElementById('edit-topic').focus()
      })
      return ele
   },

   deleteTopicBtn(topic) {
      let ele = document.createElement('div')
      ele.classList.add('trash')
      ele.addEventListener('click', () => {
         app.confirm(async () => {
            await this.deleteTopic(topic)
         },`Delete "${topic.title}"?`)
      })
      return ele
   },

   async deleteTopic(topic) {
      await stateMgr.deleteTopic(topic)
      app.hideModal()
      await this.refreshTopicPane()
      await this.refreshQuestionPane()
   },

   topictListItemEditing(topic) {
      let ele = document.createElement('div')
      ele.id = `top-${topic.id}`
      ele.classList.add('item-editing')
      ele.appendChild(this.getEditTopicInput(topic))
      ele.appendChild(this.getEditTopicButton(topic))
      return ele
   },

   getEditTopicInput(topic) {
      let input = document.createElement('input')
      input.type = 'text'
      input.spellcheck = false
      input.placeholder = 'A title is required!'
      input.value = topic.title
      input.id = 'edit-topic'
      input.classList.add('edit-topic')
      input.addEventListener('keyup',async (event) => {
         if (event.key == 'Enter') {
            await this.editTopic(topic)
         } else if (event.key == 'Escape') {
            this.refreshTopicPane()
         }
      })
      return input
   },

   getEditTopicButton(topic) {
      let btn = document.createElement('div')
      btn.classList.add('btn')
      btn.classList.add('check')
      btn.addEventListener('click', async () => {
         await this.editTopic(topic)
      })
      return btn
   },

   async editTopic(topic) {
      let val = document.getElementById('edit-topic').value.trim()
      if (val == '') return
      topic.title = val
      await stateMgr.updateTopic(topic)
      this.refreshTopicPane(true)
   },

   async refreshQuestionPane() {
      document.getElementById('question-pane').remove()
      let panes = document.getElementById('panes')
      panes.appendChild(this.questionPane)
      this.populateQuestionList()
   },

   //#endregion

   //#region Question Pane

   get questionPane() {
      let ele = document.createElement('div')
      ele.id = 'question-pane'
      ele.classList.add('pane')
      ele.appendChild(this.getPaneHeader('Q U E S T I O N'))
      if (stateMgr.topicId) {
         ele.appendChild(this.questionPaneControls)
         ele.appendChild(this.questionList)
      }
      return ele
   },

   get questionPaneControls() {
      let ele = document.createElement('div')
      ele.classList.add('controls')
      ele.appendChild(this.newQuestionControl)
      return ele
   },

   get newQuestionControl() {
      let ele = document.createElement('div')
      ele.id = 'new-question-control'
      ele.appendChild(this.newQuestionInput)
      ele.appendChild(this.newQuestionButton)
      return ele
   },

   get newQuestionInput() {
      let input = document.createElement('input')
      input.type = 'text'
      input.placeholder = 'New Question'
      input.spellcheck = false
      input.id = 'new-question'
      input.classList.add('new-question')
      input.addEventListener('keyup',async (event) => {
         if (event.key == 'Enter') {
            await this.initNewQuestion()
         } else if (event.key == 'Escape') {
            document.getElementById('new-question').value = ''
         }
      })
      return input
   },

   get newQuestionButton() {
      let btn = document.createElement('div')
      btn.classList.add('btn')
      btn.classList.add('plus')
      btn.addEventListener('click', async () => {
         await this.initNewQuestion()
      })
      return btn
   },

   async initNewQuestion() {
      let val = document.getElementById('new-question')?.value.trim()
      if (!val || val == '') return
      let newQuestion = new Question({topicId: stateMgr.topicId, shortPhrase: val})
      newQuestion['isNew'] = true
      stateMgr.question = newQuestion
      document.getElementById('new-question').value = ''
      await this.showQuestionModal(stateMgr.question)
   },

   get questionList() {
      let ele = document.createElement('div')
      ele.id = 'question-list'
      return ele
   },

   populateQuestionList() {
      let questionList = document.getElementById('question-list')
      if (questionList) {
         questionList.innerHTML = null
         stateMgr.questions.forEach(question => {
            questionList.appendChild(this.questionListItem(question))
         })
      }
   },

   questionListItem(question) {
      let ele = document.createElement('div')
      ele.id = `que-${question.id}`
      ele.innerText = question.shortPhrase
      if (stateMgr.accountSubject.selectedQuestion[stateMgr.topicId] == question.id) {
         ele.classList.add('item-selected')
         ele.appendChild(this.editQuestionBtn(question))
         ele.appendChild(this.deleteQuestionBtn(question))
      } else {
         ele.classList.add('item')
         ele.addEventListener('click', async () => {
            await stateMgr.setQuestion(question)
            await dbCtx.accountSubject.update(stateMgr.accountSubject)
            await this.refreshQuestionPane()
         })
      }
      return ele
   },

   editQuestionBtn(question) {
      let ele = document.createElement('div')
      ele.classList.add('edit')
      ele.addEventListener('click', async () => {
         stateMgr.question = question
         await this.showQuestionModal()
      })
      return ele
   },

   deleteQuestionBtn(question) {
      let ele = document.createElement('div')
      ele.classList.add('trash')
      ele.addEventListener('click', () => {
         app.confirm(async () => {
            await this.deleteQuestion(question)
         },`Delete "${question.shortPhrase}"?`)
      })
      return ele
   },

   async deleteQuestion(question) {
      await stateMgr.deleteQuestion(question)
      app.hideModal()
      if (stateMgr.topic?.questionCount == 0) {
         await this.refreshSubjectPane()
         await this.refreshTopicPane()
      }
      await this.refreshQuestionPane(true)
   },

   //#endregion

   //#region Question Modal

   async showQuestionModal()
   {
      document.getElementById('site-header').classList.add('blur')
      document.getElementById('nav').classList.add('blur')
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
         document.getElementById('nav').classList.remove('blur')
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
         document.getElementById('nav').classList.remove('blur')
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

navigation = {
   get element() {
      let n = document.getElementById('nav')
      if (n) n.remove()
      n = document.createElement('div')
      n.id = 'nav'
      n.appendChild(this.quizBtn)
      return n
   },

   get quizBtn() {
      const enabled = this.quizBtnEnabled
      let ele = getNavItemPill("Quiz Me!", enabled)
      ele.id = 'create-quiz'
      if (enabled) {
         ele.addEventListener('click', async () => {
            await stateMgr.createNewQuiz()
            await stateMgr.setPage(pages.QUIZ)
            await app.route()
         })
      }
      return ele
   },

   get quizBtnEnabled() {
      const isQuizPage = stateMgr.account?.currentPage == pages.QUIZ
      const hasCards = stateMgr.cards && stateMgr.cards.length > 0
      return !isQuizPage && hasCards
   }
}