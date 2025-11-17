const stores = {
   ACCOUNT: "account",
   ACCOUNT_DECK: "accountDeck",
   METADATA: "metaData",
   CARD: "card",
   QUESTION_ANSWER: "questionAnswer",
   QUIZ: "quiz",
   DECK: "deck"
}

let db;
const request = indexedDB.open("ignyos.flashcards", 3);

request.onupgradeneeded = function(event) {
   db = event.target.result;

   const accountStore = db.createObjectStore(stores.ACCOUNT, { keyPath: "id" });
   accountStore.createIndex("name", "name", { unique: true });

   const accountDeckStore = db.createObjectStore(stores.ACCOUNT_DECK, { keyPath: ["accountId", "deckId"] });
   accountDeckStore.createIndex("accountId", "accountId", { unique: false });

   const metaDataStore = db.createObjectStore(stores.METADATA, { keyPath: "id" });
   metaDataStore.add({ id: 1, selectedAccountId: '' });

   const cardStore = db.createObjectStore(stores.CARD, { keyPath: "id" });
   cardStore.createIndex("deckId", "deckId", { unique: false });

   const questionAnswerStore = db.createObjectStore(stores.QUESTION_ANSWER, { keyPath: "id" });
   questionAnswerStore.createIndex("compsiteIndex", ["accountId", "quizId"], { unique: false });

   const quizStore = db.createObjectStore(stores.QUIZ, { keyPath: "id" });
   quizStore.createIndex("accountId", "accountId", { unique: false });

   const deckStore = db.createObjectStore(stores.DECK, { keyPath: "id" });
};

request.onsuccess = function(event) {
   db = event.target.result;
};

request.onerror = function(event) {
  console.error("Database error: ", event.target.errorCode);
};

function getObjectStore(storeName, mode) {
   const transaction = db.transaction(storeName, mode);
   return transaction.objectStore(storeName);
}

function ensureDbReady() {
   return new Promise((resolve, reject) => {
      if (db) {
         resolve();
      } else {
         const interval = setInterval(() => {
            if (db) {
               clearInterval(interval);
               resolve();
            }
         }, 100);
      }
   });
}

const dbCtx = {
   account: {
      async byName(name) {
         try {
            const store = getObjectStore(stores.ACCOUNT, "readonly");
            const index = store.index("name");
            const request = index.get(name);
            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  if (event.target.result) {
                     resolve(event.target.result);
                  } else {
                     reject("Account not found");
                  }
               };
               request.onerror = function(event) {
                  reject("Account not found");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async exists(name) {
         try {
            await this.byName(name);
            return true;
         } catch (error) {
            return false;
         }
      },
      async add(account) {
         try {
            const store = getObjectStore(stores.ACCOUNT, "readwrite");
            const request = store.add(account);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Account not added");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async byId(id) {
         try {
            const store = getObjectStore(stores.ACCOUNT, "readonly");
            const request = store.get(id);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  if (event.target.result) {
                     resolve(event.target.result);
                  } else {
                     reject("Account not found");
                  }
               };
               request.onerror = function(event) {
                  reject("Account not found");
               };
            });
         } catch (error) {
            console.error(error)
         }
      },
      async current() {
         try {
            const metaDataStore = getObjectStore(stores.METADATA, "readonly");
            const metaDataRequest = metaDataStore.get(1);

            const metaData = await new Promise((resolve, reject) => {
               metaDataRequest.onsuccess = function(event) {
                  resolve(event.target.result);
               };
               metaDataRequest.onerror = function(event) {
                  reject("MetaData not found");
               };
            });

            const accountStore = getObjectStore(stores.ACCOUNT, "readonly");
            const accountRequest = accountStore.get(metaData.selectedAccountId);

            return await new Promise((resolve, reject) => {
               accountRequest.onsuccess = function(event) {
                  resolve(event.target.result);
               };
               accountRequest.onerror = function(event) {
                  reject("Selected account not found");
               };
            });
         } catch (error) {
            console.error(error);
            return new Account();
         }
      },
      async all() {
         try {
            const accountStore = getObjectStore(stores.ACCOUNT, "readonly");
            const accountRequest = accountStore.getAll();

            return await new Promise((resolve, reject) => {
               accountRequest.onsuccess = function(event) {
                  // Map the results to Account objects.
                  // This allows for an easy way to migrate the account class definition.
                  resolve(event.target.result.map(data => new Account(data)));
               };
               accountRequest.onerror = function(event) {
                  reject("Selected account not found");
               };
            });
         } catch (error) {
            console.error(error);
            throw error;
         }
      },
      async delete(accountId) {
         try {
            const store = getObjectStore(stores.ACCOUNT, "readwrite");
            const request = store.delete(accountId);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Account not deleted");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async update(account) {
         try {
            const store = getObjectStore(stores.ACCOUNT, "readwrite");
            const request = store.put(account);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Account not updated");
               };
            });
         } catch (error) {
            console.error(error);
         }
      }
   },
   accountDeck: {
      async list(accountId) {
         try {
            const accountDecks = await this.all(accountId);
            const decks = await dbCtx.deck.all(accountId);

            return accountDecks.map(accountDeck => {
               const deck = decks.find(deck => deck.id === accountDeck.deckId);
               return new DeckListItem(accountDeck, deck);
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      async all(acctId) {
         try {
            const store = getObjectStore(stores.ACCOUNT_DECK, "readonly");
            const index = store.index("accountId");
            const request = index.getAll(acctId);

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve(event.target.result);
               };

               request.onerror = function(event) {
                  resolve([]);
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      async add(accountDeck) {
         try {
            const store = getObjectStore(stores.ACCOUNT_DECK, "readwrite");
            const request = store.add(accountDeck);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("AccountDeck not added");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async addOrUpdate(accountDeck) {
         try {
            const store = getObjectStore(stores.ACCOUNT_DECK, "readwrite");
            const request = store.put(accountDeck); // Use put() to handle duplicates

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("AccountDeck not added or updated");
               };
            });
         } catch (error) {
            console.error(error);
            throw error;
         }
      },
      async update(accountDeck) {
         try {
            const store = getObjectStore(stores.ACCOUNT_DECK, "readwrite");
            const request = store.put(accountDeck);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("AccountDeck not updated");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async delete(accountId, deckId) {
         try {
            const store = getObjectStore(stores.ACCOUNT_DECK, "readwrite");
            const index = store.index("accountId");
            const request = index.openCursor(IDBKeyRange.only(accountId));

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const cursor = event.target.result;
                  if (cursor) {
                     if (cursor.value.deckId === deckId) {
                        const deleteRequest = cursor.delete();
                        deleteRequest.onsuccess = function() {
                           resolve();
                        };
                        deleteRequest.onerror = function() {
                           reject("Failed to delete the record");
                        };
                     } else {
                        cursor.continue();
                     }
                  } else {
                     reject("AccountDeck not found");
                  }
               };

               request.onerror = function(event) {
                  reject("AccountDeck not found");
               };
            });
         } catch (error) {
            console.error(error);
         }
      }
   },
   metadata: {
      async get() {
         try {
            const store = getObjectStore(stores.METADATA, "readonly");
            const request = store.get(1);

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve(event.target.result);
               };

               request.onerror = function(event) {
                  reject("Metadata not found");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async set(data) {
         try {
            const store = getObjectStore(stores.METADATA, "readwrite");
            const request = store.put(data);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Metadata not updated");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      /**
       * Gets the MetaData from the metadata store, then updates the selected account id.
       * @param {*} accountId The account id to set as the selected account.
       * @returns null
       */
      async setSelectedAccountId(accountId) {
         try {
            const store = getObjectStore(stores.METADATA, "readwrite");
            const request = store.get(1);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const metaData = event.target.result;
                  metaData.selectedAccountId = accountId;
                  const putRequest = store.put(metaData);
                  
                  putRequest.onsuccess = function() {
                     resolve();
                  };
                  
                  putRequest.onerror = function() {
                     reject("Failed to update selected account");
                  };
               };

               request.onerror = function() {
                  reject("Failed to get metadata");
               };
            });
         } catch (error) {
            console.error(error);
            throw error;
         }
      },
   },
   card: {
      /**
       * Only returns the cards that have not been deleted.
       * @param {*} deckId 
       * @returns 
       */
      async byDeckId(deckId) {
         if (!deckId) return [];
         try {
            const store = getObjectStore(stores.CARD, "readonly");
            const index = store.index("deckId");
            const request = index.getAll(deckId);

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve(event.target.result.filter(card => !card.deletedDate).sort((a, b) => a.shortPhrase.localeCompare(b.shortPhrase)));
               };

               request.onerror = function(event) {
                  resolve([]);
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      async get(id) {
         try {
            const store = getObjectStore(stores.CARD, "readonly");
            const request = store.get(id);

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  if (event.target.result === undefined) {
                     resolve(false);
                  } else {
                     resolve(event.target.result);
                  }
               };

               request.onerror = function(event) {
                  resolve(false);
               };
            });
         } catch (error) {
            console.error(error);
            return new Card();
         }
      },
      async byIdArray(ids) {
         try {
            const store = getObjectStore(stores.CARD, "readonly");
            const request = store.getAll();

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const cards = event.target.result;
                  resolve(cards.filter(card => ids.includes(card.id)));
               };

               request.onerror = function(event) {
                  resolve([]);
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      async exists(id) {
         if (!id) return false;
         try {
            const resp = await this.get(id);
            return resp === false ? false : true;
         } catch (error) {
            return false;
         }
      },
      async add(card) {
         try {
            const store = getObjectStore(stores.CARD, "readwrite");
            const request = store.add(card);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Card not added");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async update(card) {
         try {
            const store = getObjectStore(stores.CARD, "readwrite");
            const request = store.put(new Card(card));

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve(true);
               };

               request.onerror = function(event) {
                  reject("Card not updated");
               };
            });
         } catch (error) {
            console.error(error);
            throw error;
         }
      },

      async delete(cardId) {
         try {
            const store = getObjectStore(stores.CARD, "readwrite");
            const request = store.delete(cardId);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Card not deleted");
               };
            });
         } catch (error) {
            console.error(error);
            throw error;
         }
      }
   },
   questionAnswer: {
      /**
       * Returns all the QuestionAnswers for the given account
       * id where the QuestionAnswer.Id >= the date filter.
       * @param {string} acctId 
       * @param {Date.toISOString} dateFilter 
       */
      async byAccountId(acctId, dateFilter) {
         try {
            const store = getObjectStore(stores.QUESTION_ANSWER, "readonly");
            const index = store.index("accountId");
            const request = index.openCursor(IDBKeyRange.bound([acctId, dateFilter], [acctId, new Date().toISOString()]));

            return await new Promise((resolve, reject) => {
               const answers = [];
               request.onsuccess = function(event) {
                  const cursor = event.target.result;
                  if (cursor) {
                     answers.push(cursor.value);
                     cursor.continue();
                  } else {
                     resolve(answers);
                  }
               };

               request.onerror = function(event) {
                  reject("Answers not found");
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      async add(answer) {
         try {
            const store = getObjectStore(stores.QUESTION_ANSWER, "readwrite");
            const request = store.add(answer);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Answer not added");
               };
            });
         } catch (error) {
            console.error(error);
         }
      }
   },
   quiz: {
      async byAccountId(acctId) {
         try {
            const store = getObjectStore(stores.QUIZ, "readonly");
            const index = store.index("accountId");
            const request = index.getAll(acctId);

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const quizes = event.target.result;
                  resolve(quizes.map(quiz => new Quiz(quiz)));
               };

               request.onerror = function(event) {
                  reject("Quiz not found");
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      /**
       * Get the current quiz for the account id. If there is a quiz with
       * the completedDate set to null, then return that quiz. Otherwise return the quiz with the most recent completedDate.
       * @param {*} acctId 
       */
      async latest(acctId) {
         try {
            const store = getObjectStore(stores.QUIZ, "readonly");
            const index = store.index("accountId");
            const request = index.getAll(acctId);

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const quizzes = event.target.result;
                  if (quizzes.length === 0) {
                     resolve(false);
                  } else {
                     const openQuizzes = quizzes.filter(quiz => !quiz.completeDate);
                     if (openQuizzes.length > 0) {
                        resolve(new Quiz(openQuizzes[0]));
                     } else {
                        const sorted = quizzes.sort((a, b) => {
                           return a.completeDate.localeCompare(b.completeDate);
                        });
                        resolve(new Quiz(sorted[0]));
                     }
                  }
               };

               request.onerror = function(event) {
                  reject("Quiz not found");
               };
            });
         } catch (error) {
            console.error(error);
            return false;
         }
      },
      async create(acctId, questionCount) {
         try {
            const result = new Quiz({ accountId: acctId });
            const focusDeckIds = await this.focusDeckIds(acctId);
            const cardIds = await this.cardIds(focusDeckIds);
            const answeredCards = await this.answeredCards(acctId, cardIds);
            const unansweredCardIds = this.unansweredCardIds(cardIds, answeredCards);

            let quizCardIds;
            if (unansweredCardIds.length > questionCount - 1) {
               quizCardIds = getRandomNElements(unansweredCardIds, questionCount);
            } else {
               const n = questionCount - unansweredCardIds.length;
               const cardIdsInMostNeedOfStudy = this.cardIdsInMostNeedOfStudy(n, answeredCards);
               quizCardIds = unansweredCardIds.concat(cardIdsInMostNeedOfStudy);
            }

            if (quizCardIds.length === 0) {
               return false;
            } else {
               // Store as allQuestionIds for backward compatibility
               result.allQuestionIds = quizCardIds;
               await this.add(result);
               return result;
            }
         } catch (error) {
            console.error(error);
            return false;
         }
      },
      async focusDeckIds(acctId) {
         try {
            const accountDecks = await dbCtx.accountDeck.list(acctId);
            // Get selected deck IDs from accountDecks where isSelected = true
            return accountDecks
               .filter(accountDeck => accountDeck.isSelected)
               .map(accountDeck => accountDeck.deckId);
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      async cardIds(focusDeckIds) {
         try {
            const store = getObjectStore(stores.CARD, "readonly");
            const request = store.getAll();

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const cards = event.target.result;
                  resolve(cards
                     .filter(card => focusDeckIds
                        .includes(card.deckId) 
                        && !card.deletedDate)
                     .map(card => card.id)
                  );
               };

               request.onerror = function(event) {
                  reject("Cards not found");
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      async answeredCards(acctId, cardIds) {
         try {
         const store = getObjectStore(stores.QUESTION_ANSWER, "readonly");
         const index = store.index("compsiteIndex");

            return await new Promise((resolve, reject) => {
               const answers = [];
               const request = index.openCursor();

               request.onsuccess = function(event) {
                  const cursor = event.target.result;
                  if (cursor) {
                     const answer = cursor.value;
                     // Note: keeping questionId field name for backward compatibility with existing quiz data
                     if (answer.accountId === acctId && cardIds.includes(answer.questionId)) {
                        answers.push(answer);
                     }
                     cursor.continue();
                  } else {
                     resolve(answers);
                  }
               };

               request.onerror = function(event) {
                  reject("Answers not found");
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      unansweredCardIds(cardIds, answeredCards) {
         return cardIds
            .filter(cardId => !answeredCards
               .some(answer => answer.questionId === cardId));
      },
      cardIdsInMostNeedOfStudy(count, answeredCards) {
         if (answeredCards.length === 0) { return []; }
         answeredCards.sort((a, b) => {
            return a.id.localeCompare(b.id);
         });
         const distinctCardIds = [...new Set(answeredCards.map(answer => answer.questionId))];
         let stackRank = [];// two dimentiional array
         distinctCardIds.forEach(cardId => {
            const answers = answeredCards.filter(answer => answer.questionId === cardId);
            stackRank.push([cardId, this.getWeight(answers)]);
         });
         let sorted = stackRank.sort((a, b) => {
            return a[1] - b[1];
         });
         if (count < sorted.length) {
            return sorted.slice(0, count).map(item => item[0]);
         } else {
            return sorted.map(item => item[0]);
         }
      },
      getWeight(answeredQuestions) {
         const allTimeCount = answeredQuestions.length;
         const allTimeCorrect = answeredQuestions.filter(answer => answer.answeredCorrectly).length;
         const allTimeAvg = allTimeCorrect / allTimeCount;

         let lastThreeCorrect = 0;
         let lastThreeAvg = 0;
         if (allTimeCount > 2) {
            const lastThree = answeredQuestions.slice(allTimeCount - 3);
            lastThreeCorrect = lastThree.filter(answer => answer.answeredCorrectly).length;
            lastThreeAvg = lastThreeCorrect / 3;
         } else {
            lastThreeCorrect = answeredQuestions.filter(answer => answer.answeredCorrectly).length;
            lastThreeAvg = lastThreeCorrect / 3;
         }
      },
      async add(quiz) {
         try {
            const store = getObjectStore(stores.QUIZ, "readwrite");
            const request = store.add(quiz);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Quiz not added");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async update(quiz) {
         try {
            const store = getObjectStore(stores.QUIZ, "readwrite");
            const request = store.put(quiz);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Quiz not updated");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async quit(acctId, quizId) {
         try {
            const store = getObjectStore(stores.QUIZ, "readwrite");
            const request = store.get(quizId);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const quiz = event.target.result;
                  if (quiz && quiz.accountId === acctId) {
                     quiz.completeDate = new Date().toISOString();
                     store.put(quiz);
                     resolve();
                  } else {
                     resolve(false);
                  }
               };

               request.onerror = function(event) {
                  reject("Quiz not found");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      /**
       * Finds all the QuestionAnswers for the given account id and quiz id. Then finds all the cards
       * based on the question ids from the QuestionAnswers. Then creates a CardListItem object for each
       * card and answer. Then returns the collection of CardListItem objects.
       * @param {string} accountId 
       * @param {string} quizId 
       * @returns {CardListItem[]}
       */
      async results(accountId, quizId) {
         try {
            const store = getObjectStore(stores.QUESTION_ANSWER, "readonly");
            const index = store.index("compsiteIndex");
            const request = index.getAll(IDBKeyRange.bound([accountId, quizId], [accountId, quizId]));

            return await new Promise((resolve, reject) => {
               request.onsuccess = async function(event) {
                  const answers = event.target.result;
                  const questionIds = answers.map(answer => answer.questionId);
                  const cards = await dbCtx.card.byIdArray(questionIds);
                  const results = cards.map(card => {
                     const answer = answers.find(answer => answer.questionId === card.id);
                     return new CardListItem(card, answer);
                  });
                  resolve(results);
               };

               request.onerror = function(event) {
                  reject("Answers not found");
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      }
   },
   deck: {
      /**
       * First gets all the AccountDeck associated with the account id. Then gets all the decks
       * based on the deck ids from the AccountDecks.  
       * @param {*} acctId 
       * @returns 
       */
      async all(acctId) {
         try {
            const accountDecks = await dbCtx.accountDeck.all(acctId);
            const deckIds = accountDecks.map(ad => ad.deckId);
            const store = getObjectStore(stores.DECK, "readonly");
            const request = store.getAll();

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const decks = event.target.result;
                  resolve(decks.filter(deck => deckIds.includes(deck.id)));
               };

               request.onerror = function(event) {
                  reject("Decks not found");
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },

      async getAll() {
         try {
            const store = getObjectStore(stores.DECK, "readonly");
            const request = store.getAll();

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve(event.target.result);
               };

               request.onerror = function(event) {
                  reject("Error getting all decks");
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },

      async get(id) {
         try {
            const store = getObjectStore(stores.DECK, "readonly");
            const request = store.get(id);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve(event.target.result);
               };

               request.onerror = function(event) {
                  reject("Deck not found");
               };
            });
         } catch (error) {
            console.error(error);
            return null;
         }
      },
      async add(deck) {
         try {
            const store = getObjectStore(stores.DECK, "readwrite");
            const request = store.add(deck);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Deck not added");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async update(deck) {
         try {
            const store = getObjectStore(stores.DECK, "readwrite");
            const request = store.put(new Deck(deck));

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve(true);
               };

               request.onerror = function(event) {
                  resolve(false);
               };
            });
         } catch (error) {
            console.error(error);
            resolve(false);
         }
      }
   }
}
