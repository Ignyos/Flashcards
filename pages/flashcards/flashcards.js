page = {
   get element() {
      let ele = document.createElement('div')
      ele.id = 'page'
      ele.appendChild(navigation.element)
      let panes = document.createElement('div')
      panes.id = 'panes'
      panes.appendChild(this.subjectPane)
      panes.appendChild(this.topicPane)
      panes.appendChild(this.questionPane)
      ele.appendChild(panes)
      return ele
   },

   async load() {
      this.populateSubjectList()
      this.populateTopicList()
      this.populateQuestionList()
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
      const canCreateQuiz = stateMgr.focusTopicIds.length > 0
      return !isQuizPage && canCreateQuiz
   }
}