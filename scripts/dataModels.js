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
      this.selectedDeckId = Object.hasOwn(data, 'selectedDeckId') ? data.selectedDeckId : ''

      this.statsView = Object.hasOwn(data, 'statsView') ? data.statsView : statsViews.BY_QUESTION
      /**
       * @type {Date} statsFilterDate The date to filter stats by.
       * Default is 90 days ago.
       */
      this.statsFilterDate = Object.hasOwn(data, 'statsFilterDate') ? data.statsFilterDate : new Date(new Date().setDate(new Date().getDate() - 90)).toISOString()
   }
}

class AccountDeck {
   constructor(data = {}) {
      // composit key
      this.accountId = Object.hasOwn(data, 'accountId') ? data.accountId : ''
      this.deckId = Object.hasOwn(data, 'deckId') ? data.deckId : ''
      this.isSelected = Object.hasOwn(data, 'isSelected') ? data.isSelected : false
   }
}

class MetaData {
   constructor(data = {}) {
      this.id = Object.hasOwn(data, 'id') ? data.id : 1
      this.selectedAccountId = Object.hasOwn(data, 'selectedAccountId') ? data.selectedAccountId : ''
   }
}

class Card {
   constructor(data = {}) {
      this.id = Object.hasOwn(data, 'id') ? data.id : null
      this.deckId = Object.hasOwn(data, 'deckId') ? data.deckId : ''
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

class Deck {
   constructor(data = {}) {
      this.id = Object.hasOwn(data, 'id') ? data.id : newId(6)
      this.title = Object.hasOwn(data, 'title') ? data.title : ''
      this.deletedDate = Object.hasOwn(data, 'deletedDate') ? data.deletedDate : null
   }
}

//#region DTOs

class DeckListItem {
   /**
    * Instantiates a new DeckListItem object
    * @param {AccountDeck} accountDeck The AccountDeck object
    * @param {Deck} deck The Deck object that contains the title and id
    */
   constructor(accountDeck, deck) {
      this.deckId = accountDeck.deckId
      this.accountId = accountDeck.accountId
      this.isSelected = accountDeck.isSelected
      
      this.title = deck.title
   }

   toDeck() {
      return new Deck({id:this.deckId, title:this.title})
   }
}

class CardListItem {
   constructor(card, questionAnswer) {
      if (!card || !questionAnswer || card.id !== questionAnswer.questionId) return
      this.id = card.id
      this.shortPhrase = card.shortPhrase
      this.correct = questionAnswer.answeredCorrectly
      /**
       * @type {[boolean]} [true, false] A collection of historical answers.
       * Used in the stats page to show overall performance.
       */
      this.history = []
   }
   /**
    * @returns {percent} The percentage of correct answers for this card.
    * This will always be rounded to the nearest whole number.
    */
   get score() {
      let correct = this.history.filter(x => x).length
      return Math.round((correct / this.history.length) * 100)
   }
}

//#endregion DTOs