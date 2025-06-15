const pages = {
   HOME: "home",
   FLASH_CARDS: "flashcards",
   QUIZ: "quiz",
   STATS: "stats"
}

class StateManager {
   constructor() {
      //#sitewide
      this.metaData;
      this.accounts;
      this.account;
      
      //#flashcards page
      this.subjects;
      this.topics;
      this.questions;

      //#flashcards & quiz page
      this.question;
      
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
         default:
            break
      }      
   }

   clearPageData() {
      this.subjects = []
      this.topics = []
      this.questions = []
      this.question = null
      this.quizes = []
      this.quiz = null
   }

   //#region Flashcards Page

   async loadFlashcardsPage() {
      if (!this.metaData?.selectedAccountId) { this.clearPageData(); return }
      if (!await this.loadSubjects()) return
      if (!await this.loadTopics()) return
      await this.loadQuestions()
   }

   async loadSubjects() {
      this.subjects = await dbCtx.accountSubject.list(this.metaData.selectedAccountId)
      if (!this.subjects || !this.subjects.length) {
         this.subjects = []
         this.topics = []
         this.questions = []
         return false
      } else {
         this.subjects.sort((a,b) => {
            return a.title.localeCompare(b.title)
         })
         return true
      }
   }

   async loadTopics() {
      this.topics = await dbCtx.topic.all(this.subjectId)
      if (!this.topics || !this.topics.length) {
         this.topics = []
         this.questions = []
         return false
      } else {
         this.topics.sort((a,b) => {
            return a.title.localeCompare(b.title)
         })
         return true
      }
   }

   async loadQuestions() {
      this.questions = await dbCtx.question.byTopicId(this.topicId)
      if (!this.questions || !this.questions.length) {
         this.questions = []
      } else {
         this.questions.sort((a,b) => {
            return a.shortPhrase.localeCompare(b.shortPhrase)
         })
      }
   }

   /**
    * @returns {string} The Id of the currently selected subject or null if no subject is selected
    */
   get subjectId() {
      let result = this.account?.state?.selectedSubjectId ?? null
      return result
   }

   async setSubjectId(id) {
      this.account.state.selectedSubjectId = id
      await dbCtx.account.update(this.account)
   }

   async addNewAccountSubject(data) {
      this.account.state.selectedSubjectId = data.subjectId
      await dbCtx.account.update(this.account)
      this.subjects.push(data)
      this.subjects.sort((a,b) => {
         return a.title.localeCompare(b.title)
      })
      this.topics = []
      this.questions = []
   }

   async updateAccountSubject(acctSub) {
      const sub = acctSub.toSubject()
      await dbCtx.subject.update(sub)
      this.account.state.selectedSubjectId = acctSub.subjectId
      let i = this.subjects.findIndex((e) => {
         e.subjectId == acctSub.subjectId
      })
      this.subjects[i] = acctSub
      this.subjects.sort((a,b) => {
         return a.title.localeCompare(b.title)
      })
   }

   async deleteAccountSubject(acctSub) {
      acctSub.deletedDate = new Date().toISOString()
      await dbCtx.accountSubject.delete(this.account.id, acctSub.subjectId)
      let i = this.subjects.findIndex((e) => e.subjectId == acctSub.subjectId)
      this.subjects.splice(i,1)
      if (this.account.state.selectedSubjectId == acctSub.subjectId) {
         this.account.state.selectedSubjectId = ''
         await dbCtx.account.update(this.account)
         this.topics = []
         this.questions = []
      }
   }

   /**
    * @returns {AccountSubject} The currently selected subject or null if no subject is selected
    */
   get accountSubject() {
      const result = this.subjects.find(s => s.subjectId == this.subjectId)
      return result ?? null
   }

   /**
    * @returns {string} The Id of the currently selected topic or null if no topic is selected
    */
   get topicId() {
      let result = null
      if (this.accountSubject) {
         result = this.accountSubject.selectedTopicId ?? null
      }
      return result
   }

   get topic() {
      if (!this.topics || !this.topicId) return null
      return this.topics.find(t => t.id == this.topicId) ?? null
   }

   get focusTopicIds() {
      let result = []
      if (!this.subjects) return result
      this.subjects.forEach(s => {
         s.focusTopicIds.forEach(t => {
            result.push(t)
         })
      })
      return result
   }
   
   async setTopicId(id) {
      this.accountSubject.selectedTopicId = id
      this.accountSubject.subjectId = this.subjectId
      const acctSub = new AccountSubject(this.accountSubject)
      acctSub.accountId = this.account.id
      acctSub.selectedTopicId = id
      await dbCtx.accountSubject.update(acctSub)
      await this.loadQuestions()
   }

   async toggleFocusTopic(id) {
      let i = this.accountSubject.focusTopicIds.indexOf(id)
      if (i > -1) {
         this.accountSubject.focusTopicIds.splice(i, 1)
      } else {
         this.accountSubject.focusTopicIds.push(id)
      }
      await dbCtx.accountSubject.update(this.accountSubject)
   }

   async addNewTopic(data) {
      this.accountSubject.selectedTopicId = data.id
      await dbCtx.accountSubject.update(this.accountSubject)
      await dbCtx.account.update(this.account)
      this.topics.push(data)
      this.topics.sort((a,b) => {
         return a.title.localeCompare(b.title)
      })
      this.questions = []
   }

   async updateTopic(topic) {
      this.accountSubject.selectedTopicId = topic.id
      await dbCtx.accountSubject.update(this.accountSubject)

      let i = this.topics.findIndex((e) => e.id == topic.id)
      this.topics[i] = topic
      this.topics.sort((a,b) => {
         return a.title.localeCompare(b.title)
      })
      await dbCtx.topic.update(topic)
   }

   async updateTopicQuestionCount(increment) {
      let topic = this.topics.find(t => t.id == this.topicId)
      topic.questionCount += increment
      await dbCtx.topic.update(topic)
      if (topic.questionCount == 0) {
         // make sure the topic is not selected as a focus topic
         let i = this.accountSubject.focusTopicIds.indexOf(topic.id)
         if (i > -1) {
            this.accountSubject.focusTopicIds.splice(i, 1)
            await dbCtx.accountSubject.update(this.accountSubject)
         }
      }
   }
   
   async deleteTopic(topic) {
      topic.deletedDate = new Date().toISOString()
      await dbCtx.topic.update(topic)
      let i = this.topics.findIndex((e) => e.id == topic.id)
      this.topics.splice(i,1)
      if (this.accountSubject.selectedTopicId == topic.id) {
         this.accountSubject.selectedTopicId = ''
         await dbCtx.accountSubject.update(this.accountSubject)
         this.questions = []
      }
      i = this.accountSubject.focusTopicIds.indexOf(topic.id)
      if (i > -1) {
         this.accountSubject.focusTopicIds.splice(i, 1)
      }
      await dbCtx.accountSubject.update(this.accountSubject)
   }

   async addQuestion(question) {
      await this.updateTopicQuestionCount(1)
      question.id = await newQuestionId()
      this.question = question
      await this.updateSelectedQuestion(question.id)
      await dbCtx.question.add(question)
      this.questions.push(question)
      this.questions.sort((a,b) => {
         return a.shortPhrase.localeCompare(b.shortPhrase)
      })
   }

   async updateQuestion(question) {
      await this.updateSelectedQuestion(question.id)
      await dbCtx.question.update(question)
      let i = this.questions.findIndex((e) => e.id == question.id)
      if (i > -1) {
         this.questions[i] = question
      } else {
         alert("Question not found in State")
      }
      this.questions.sort((a,b) => {
         return a.shortPhrase.localeCompare(b.shortPhrase)
      })      
   }

   async updateSelectedQuestion(id) {
      const tId = this.topicId
      if (tId) {
         this.accountSubject.selectedQuestion[tId] = id
         await dbCtx.accountSubject.update(this.accountSubject)
      }
   }

   async deleteQuestion(question) {
      await this.updateTopicQuestionCount(-1)
      question.deletedDate = new Date().toISOString()
      await dbCtx.question.update(question)
      if (this.accountSubject.selectedQuestion[this.topicId] === question.id) {
         delete this.accountSubject.selectedQuestion[this.topicId]
         await dbCtx.accountSubject.update(this.accountSubject)
      }
      let i = this.questions.findIndex((e) => {
         e.id == question.id
      })
      this.questions.splice(i,1)
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
         await this.loadSubjects()
         if (this.focusTopicIds.length === 0) {
            messageCenter.addError('No topics selected for quiz.')
            return true
         } else {
            this.quiz = await dbCtx.quiz.create(acct.id, acct.settings.defaultQuestionCount)
         }
      }

      if (this.quiz.allQuestionIds.length === this.quiz.answeredQuestionIds.length) {
         this.quiz.completeDate = new Date().toISOString()
         await dbCtx.quiz.update(this.quiz)
         return true;
      }
      this.question = await dbCtx.question.get(this.getNextQuestionId())
      return result
   }
   
   getNextQuestionId() {
      let unanswered = []
      this.quiz.allQuestionIds.forEach(q => {
         if (!this.quiz.answeredQuestionIds.includes(q)) unanswered.push(q)
      })
      let i = Math.floor(Math.random() * unanswered.length)
      return unanswered[i]
   }

   async updateAnsweredQuestionIds(id) {
      this.quiz.answeredQuestionIds.push(id)
      await dbCtx.quiz.update(this.quiz)
      this.question = { id: 0, shortPhrase: null , phrase: null, answer: null }
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
      }
      await dbCtx.quiz.create(this.account.id, this.account.settings.defaultQuestionCount)
   }

   //#endregion

   //#region Stats Page

   async loadStatsPage() {
      switch (this.statsView) {
         case statsViews.QUESTION:
            this.questionAnswers = await dbCtx.questionAnswer.byAccountId(this.account.id)
            break
         case statsViews.QUIZ:
            this.quizes = await dbCtx.quiz.byAccountId(this.account.id)
            break
         default:
            messageCenter.addError('Error loading Stats.')
            break
      }

      this.quizes = await dbCtx.quiz.byAccountId(this.account.id)
   }

   get statsView() {
      return this.account?.state.statsView ?? statsViews.QUESTION
   }

   //#endregion
}
