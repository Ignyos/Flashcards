page = {
   get element() {
      let ele = document.createElement('div')
      ele.id = 'page'
      ele.appendChild(navigation.element)
      ele.appendChild(this.quizPane)
      return ele
   },

   async load() {
      await this.loadNextQuestion()
   },

   get quizPane() {
      let ele = document.createElement('div')
      ele.id = 'quiz-pane'
      ele.classList.add('in-progress')
      ele.appendChild(this.questionEle)
      ele.appendChild(this.answerEle)
      ele.appendChild(this.questionControls)
      return ele
   },

   //#region Quiz Results

   loadQuizResults(questions) {
      let pane = document.getElementById('quiz-pane')
      pane.classList.remove('in-progress')
      pane.classList.add('results')
      pane.innerHTML = null
      pane.appendChild(this.getQuestionList(questions))
   },

   getQuestionList(questions) {
      let ele = document.createElement('div')
      ele.id = 'question-list'
      questions.forEach(question => {
         ele.appendChild(this.getQuestionListItem(question))
      })
      return ele
   },

   getQuestionListItem(question) {
      let ele = document.createElement('div')
      ele.classList.add('item')
      if (question.correct) {
         ele.classList.add('correct')
      } else {
         ele.classList.add('incorrect')
      }
      ele.innerText = question.shortPhrase
      return ele
   },

   //#endregion

   //#region Taking Quiz

   async loadNextQuestion() {
      let q = document.getElementById('question')
      let a = document.getElementById('answer')
      let controls = document.getElementById('controls')
      
      let id = stateMgr.getNextCardId()
      
      if (!id) {
         q.innerText = 'Quiz complete! No more questions.'
         return
      }
      
      stateMgr.card = await dbCtx.card.get(id)
      q.innerText = stateMgr.card.phrase
      
      // Reset the UI for the new question
      a.innerText = ''
      controls.classList.add('invisible')
      
      // Update the question counter
      let counter = document.querySelector('.navigation .pill')
      if (counter && counter.innerText.startsWith('Q:')) {
         let n = stateMgr.quiz.answeredCardIds.length + 1
         let total = stateMgr.quiz.allCardIds.length
         counter.innerText = `Q: ${n} of ${total}`
      }
   },

   get questionEle() {
      let ele = document.createElement('div')
      ele.id = 'question'
      ele.classList.add('info')
      ele.innerText = stateMgr.card.phrase
      return ele
   },

   get answerEle() {
      let ele = document.createElement('div')
      ele.id = 'answer'
      ele.classList.add('info')
      return ele
   },

   get questionControls() {
      let ele = document.createElement('div')
      ele.id = 'controls'
      ele.classList.add('invisible')
      ele.appendChild(this.correctBtn)
      ele.appendChild(this.incorrectBtn)
      return ele
   },

   showAnswer() {
      let qp = document.getElementById('controls')
      qp.classList.remove('invisible')
      document.getElementById('answer').innerText = stateMgr.card.answer
   },
   
   get correctBtn() {
      let ele = document.createElement('div')
      ele.classList.add('correct')
      ele.classList.add('btn')
      ele.innerText = 'Correct'
      ele.addEventListener('click', async () => {
         await this.submitAnswer(true)
      })
      return ele
   },
   
   get incorrectBtn() {
      let ele = document.createElement('div')
      ele.classList.add('incorrect')
      ele.classList.add('btn')
      ele.innerText = 'Incorrect'
      ele.addEventListener('click', async () => {
         await this.submitAnswer(false)
      })
      return ele
   },

   async submitAnswer(correct) {
      let questionAnswer = new QuestionAnswer({
         accountId: stateMgr.account.id,
         quizId: stateMgr.quiz.id,
         cardId: stateMgr.card.id,
         answeredCorrectly: correct
      })
      await dbCtx.questionAnswer.add(questionAnswer)
      await stateMgr.updateAnsweredCardIds(stateMgr.card.id)
      if (stateMgr.quiz.allCardIds.length === stateMgr.quiz.answeredCardIds.length) {
         // Mark quiz as complete
         stateMgr.quiz.completeDate = new Date().toISOString()
         await dbCtx.quiz.update(stateMgr.quiz)
         
         // Update mastered cards based on quiz performance
         await dbCtx.quiz.updateMasteredCardsAfterCompletion(stateMgr.account.id, stateMgr.quiz)
         
         let questions = await dbCtx.quiz.results(stateMgr.account.id, stateMgr.quiz.id)
         await stateMgr.setPage(pages.FLASH_CARDS)
         navigation.loadQuizResults(questions)
         await this.loadQuizResults(questions)
      } else {
         // Load next question directly - no need to route since we're staying on the quiz page
         await this.loadNextQuestion()
      }
   },

   //#endregion

   async quitQuiz() {
      app.confirm(async () => {
         await dbCtx.quiz.quit(stateMgr.account.id, stateMgr.quiz.id)
         stateMgr.quiz = {id: 0, startDateUTC: null, allCardIds: [], answeredCardIds: []}
         await stateMgr.setPage(pages.FLASH_CARDS)
         // Clear the page content to ensure clean loading
         let pgEle = document.getElementById('page')
         if (pgEle) pgEle.innerHTML = null
         await app.route()
      },'Really?\n\nYou want to quit?')
   }
}

navigation = {
   get element() {
      let n = this.nav
      n.appendChild(this.questionCounter)
      n.appendChild(this.showAnswerBtn)
      n.appendChild(this.quitQuizBtn)
      return n
   },

   get nav() {
      let nav = document.getElementById('nav')
      if (nav) {
         nav.innerHTML = null
      } else {
         nav = document.createElement('div')
         nav.id = 'nav'
      }
      return nav
   },

   loadQuizResults(questions) {
      let nav = document.getElementById('nav')
      nav.innerHTML = null
      let summary = document.createElement('div')
      let count = questions.length
      let correct = questions.filter(q => q.correct).length
      summary.innerText = `${correct} out of ${count} correct`
      summary.id = 'question-counter'

      nav.appendChild(summary)
      nav.appendChild(this.closeSummaryButtton)
   },

   get closeSummaryButtton() {
      let ele = document.createElement('div')
      ele.classList.add('pill')
      ele.innerText = 'Close'
      ele.addEventListener('click',async () => {
         await stateMgr.setPage(pages.FLASH_CARDS)
         // Clear the page content to ensure clean loading
         let pgEle = document.getElementById('page')
         if (pgEle) pgEle.innerHTML = null
         await app.route()
      })
      return ele
   },

   get questionCounter() {
      let ele = document.createElement('div')
      let n = stateMgr.quiz.answeredCardIds.length + 1
      let total = stateMgr.quiz.allCardIds.length
      ele.innerText= `Q: ${n} of ${total}`
      ele.id = 'question-counter'
      return ele
   },

   get showAnswerBtn() {
      let ele = this.getNavItemPill("Show Answer")
      ele.id = 'show-answer'
      ele.addEventListener('click', () => {
         page.showAnswer()
      })
      return ele
   },

   get quitQuizBtn() {
      let ele = this.getNavItemPill("End Quiz")
      ele.id = 'quit-quiz'
      ele.addEventListener('click', async () => {
         await page.quitQuiz()
      })
      return ele
   },

   getNavItemPill(text) {
      let ele = document.createElement('div')
      ele.innerText = text
      ele.classList.add('pill')
      return ele
   },
}