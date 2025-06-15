class Account {
   constructor(data = {}) {
      this.id = Object.hasOwn(data, 'id') ? data.id : newId(6)
      this.created = Object.hasOwn(data, 'created') ? data.created : new Date().toISOString()
      this.lastUsed = Object.hasOwn(data, 'lastUsed') ? data.lastUsed : new Date().toISOString()
      this.name = Object.hasOwn(data, 'name') ? data.name : ''

      this.settings = Object.hasOwn(data, 'settings') ? new AccountSettings(data.settings) : new AccountSettings()
      
      this.state = Object.hasOwn(data, 'state') ? new AccountState(data.state) : new AccountState()
   }
}

const statsViews = {
   BY_QUESTION: 'byQuestion',
   BY_QUIZ: 'byQuiz',
}

class AccountSettings {
   constructor(data = {}) {
      /**
       * @type {number} defaultQuestionCount The number of questions a quiz will have by default
       */
      this.defaultQuestionCount = Object.hasOwn(data, 'defaultQuestionCount') ? data.defaultQuestionCount : 10
   }
}

class AccountState {
   constructor(data = {}) {
      this.currentPage = Object.hasOwn(data, 'currentPage') ? data.currentPage : pages.FLASH_CARDS

      // this.currentQuizId = Object.hasOwn(data, 'currentQuizId') ? data.currentQuizId : ''
      this.selectedSubjectId = Object.hasOwn(data, 'selectedSubjectId') ? data.selectedSubjectId : ''

      this.statsView = Object.hasOwn(data, 'statsView') ? data.statsView : statsViews.BY_QUESTION
      /**
       * @type {Date} statsFilterDate The date to filter stats by.
       * Default is 90 days ago.
       */
      this.statsFilterDate = Object.hasOwn(data, 'statsFilterDate') ? data.statsFilterDate : new Date(new Date().setDate(new Date().getDate() - 90)).toISOString()
   }
}

class AccountSubject {
   constructor(data = {}) {
      // composit key
      this.accountId = Object.hasOwn(data, 'accountId') ? data.accountId : ''
      this.subjectId = Object.hasOwn(data, 'subjectId') ? data.subjectId : ''
      // meta data
      this.focusTopicIds = Object.hasOwn(data, 'focusTopicIds') ? data.focusTopicIds : []
      this.selectedTopicId = Object.hasOwn(data, 'selectedTopicId') ? data.selectedTopicId : ''
      this.selectedQuestion = Object.hasOwn(data, 'selectedQuestion') ? data.selectedQuestion : {}
   }
}

class MetaData {
   constructor(data = {}) {
      this.id = Object.hasOwn(data, 'id') ? data.id : 1
      this.selectedAccountId = Object.hasOwn(data, 'selectedAccountId') ? data.selectedAccountId : ''
   }
}

class Question {
   constructor(data = {}) {
      this.id = Object.hasOwn(data, 'id') ? data.id : null
      this.topicId = Object.hasOwn(data, 'topicId') ? data.topicId : ''
      this.shortPhrase = Object.hasOwn(data, 'shortPhrase') ? data.shortPhrase : ''
      this.phrase = Object.hasOwn(data, 'phrase') ? data.phrase : ''
      this.answer = Object.hasOwn(data, 'answer') ? data.answer : ''
      this.deletedDate = Object.hasOwn(data, 'deletedDate') ? data.deletedDate : null
   }
}

class QuestionAnswer {
   constructor(data = {}) {
      this.id = Object.hasOwn(data, 'id') ? data.id : new Date().toISOString()
      this.accountId = Object.hasOwn(data, 'accountId') ? data.accountId : ''
      this.quizId = Object.hasOwn(data, 'quizId') ? data.quizId : ''
      this.questionId = Object.hasOwn(data, 'questionId') ? data.questionId : ''
      this.answeredCorrectly = Object.hasOwn(data, 'answeredCorrectly') ? data.answeredCorrectly : false
   }
}

class Quiz {
   constructor(data = {})
   {
      this.id = Object.hasOwn(data, 'id') ? data.id : newId(6)
      this.accountId = Object.hasOwn(data, 'accountId') ? data.accountId : ''
      this.completeDate = Object.hasOwn(data, 'completeDate') ? data.completeDate : null
      this.allQuestionIds = Object.hasOwn(data, 'allQuestionIds') ? data.allQuestionIds : []
      this.answeredQuestionIds = Object.hasOwn(data, 'answeredQuestionIds') ? data.answeredQuestionIds : []
   }
   get isComplete() {
      if (this.allQuestionIds.length ===  this.answeredQuestionIds.length) {
         return true
      } 
      return false
   }
}

class Subject {
   constructor(data = {}) {
      this.id = Object.hasOwn(data, 'id') ? data.id : newId(6)
      this.title = Object.hasOwn(data, 'title') ? data.title : ''
      this.deletedDate = Object.hasOwn(data, 'deletedDate') ? data.deletedDate : null
   }
}

class Topic {
   constructor(data = {}) {
      this.id = Object.hasOwn(data, 'id') ? data.id : newId(6)
      this.subjectId = Object.hasOwn(data, 'subjectId') ? data.subjectId : ''
      this.title = Object.hasOwn(data, 'title') ? data.title : ''
      this.questionCount = Object.hasOwn(data, 'questionCount') ? data.questionCount : 0
      this.deletedDate = Object.hasOwn(data, 'deletedDate') ? data.deletedDate : null
   }
}

//#region DTOs

class SubjectListItem {
   /**
    * Instantiates a new SubjectListItem object
    * @param {AccountSubject} accountSubject The AccountSubject object that contains the focusTopicIds
    * @param {Subject} subject The Subject object that contains the title and id
    */
   constructor(accountSubject, subject) {
      this.subjectId = accountSubject.subjectId
      this.accountId = accountSubject.accountId
      this.focusTopicIds = accountSubject.focusTopicIds
      this.selectedTopicId = accountSubject.selectedTopicId
      this.selectedQuestion = accountSubject.selectedQuestion
      
      this.title = subject.title
   }

   toSubject() {
      return new Subject({id:this.subjectId, title:this.title})
   }
}

class QuestionListItem {
   constructor(question, questionAnswer) {
      if (!question || !questionAnswer || question.id !== questionAnswer.questionId) return
      this.id = question.id
      this.shortPhrase = question.shortPhrase
      this.correct = questionAnswer.answeredCorrectly
      /**
       * @type {[boolean]} [true, false] A collection of historical answers.
       * Used in the stats page to show overall performance.
       */
      this.history = []
   }
   /**
    * @returns {percent} The percentage of correct answers for this question.
    * This will always be rounded to the nearest whole number.
    */
   get score() {
      let correct = this.history.filter(x => x).length
      return Math.round((correct / this.history.length) * 100)
   }
}

//#endregion DTOs