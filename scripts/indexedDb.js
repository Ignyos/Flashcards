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
const request = indexedDB.open("ignyos.flashcards", 2);

request.onupgradeneeded = function(event) {
   db = event.target.result;
   const oldVersion = event.oldVersion;

   // Migration: Drop entire database if version is less than 2
   if (oldVersion < 2 && oldVersion > 0) {
      // Delete all existing object stores (cleaner than iterating)
      for (const storeName of db.objectStoreNames) {
         db.deleteObjectStore(storeName);
      }
   }

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
            const request = store.getAll();

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const allAnswers = event.target.result;
                  const filteredAnswers = allAnswers.filter(answer => 
                     answer.accountId === acctId && 
                     answer.id >= dateFilter
                  );
                  resolve(filteredAnswers);
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
      
      /**
       * Returns all QuestionAnswers for the given quiz IDs
       * @param {string} acctId 
       * @param {string[]} quizIds 
       */
      async byQuizIds(acctId, quizIds) {
         try {
            const store = getObjectStore(stores.QUESTION_ANSWER, "readonly");
            const request = store.getAll();

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const allAnswers = event.target.result;
                  const filteredAnswers = allAnswers.filter(answer => 
                     answer.accountId === acctId && 
                     quizIds.includes(answer.quizId)
                  );
                  resolve(filteredAnswers);
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
      },
      async delete(answerId) {
         try {
            const store = getObjectStore(stores.QUESTION_ANSWER, "readwrite");
            const request = store.delete(answerId);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Answer not deleted");
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
      async create(acctId, questionCount, isQuick = true) {
         if (isQuick) {
            try {
               // Use the new mastery-aware quiz generation logic
               const cardIds = await this.generateQuickQuiz(acctId, questionCount)
               
               // If no cards are available, return false (maintains backward compatibility)
               if (cardIds.length === 0) {
                  return false
               }

               // Get the deck IDs for the selected cards
               const selectedDecks = await this._getSelectedAccountDecks(acctId)
               const deckIds = selectedDecks.map(deck => deck.deckId)
               
               // Create Quiz object with selected cards and decks
               const result = new Quiz({
                  accountId: acctId,
                  allCardIds: cardIds,
                  allDeckIds: deckIds
               })
                           
               // Persist the quiz to the database
               await this.add(result)
               
               return result
               
            } catch (error) {
               console.error('Error creating quiz:', error)
               return false
            }
         } else {
            // no logic for this yet.
            // this will handle a custom quiz generation strategy in the future.
            return false
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
                  const cardIds = answers.map(answer => answer.cardId);
                  const cards = await dbCtx.card.byIdArray(cardIds);
                  const results = cards.map(card => {
                     const answer = answers.find(answer => answer.cardId === card.id);
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
      },
      async delete(quizId) {
         try {
            const store = getObjectStore(stores.QUIZ, "readwrite");
            const request = store.delete(quizId);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Quiz not deleted");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      /**
       * Generates a new quiz using the complex mastery-aware algorithm described in about.md
       * @param {string} accountId The account to generate quiz for
       * @param {number|null} questionCount Override default question count (uses account settings if null)
       * @returns {string[]} Array of card IDs for the quiz, or empty array if no questions available
       */
      async generateQuickQuiz(accountId, questionCount = null) {
         try {
            // Get account settings for configuration
            const account = await dbCtx.account.byId(accountId)
            if (!account) throw new Error('Account not found')
            
            const settings = account.settings
            const targetQuestionCount = questionCount || settings.defaultQuestionCount
            
            // Step 1: Get selected decks and load all cards
            const selectedDecks = await this._getSelectedAccountDecks(accountId)
            if (selectedDecks.length === 0) return []
            
            const allCards = await this._getAllCardsFromDecks(selectedDecks.map(d => d.deckId))
            if (allCards.length === 0) return []
            
            // Step 2: Filter out already mastered cards
            const filteredCards = this._filterOutMasteredCards(allCards, selectedDecks)
            if (filteredCards.length === 0) return []
            
            // Step 3: Load and filter QuestionAnswers by review cycle
            const reviewCutoffDate = new Date()
            reviewCutoffDate.setDate(reviewCutoffDate.getDate() - settings.reviewCycleDays)
            const recentQuestionAnswers = await this._getRecentQuestionAnswers(
               accountId, 
               filteredCards.map(c => c.id), 
               reviewCutoffDate
            )
            
            // Step 4: Detect newly mastered cards and update cache
            const newlyMasteredCardIds = this._detectNewlyMasteredCards(
               recentQuestionAnswers, 
               settings.masteryStreakCount,
               settings.masteryWindowDays
            )
            
            if (newlyMasteredCardIds.length > 0) {
               await this._updateMasteredCardsCache(selectedDecks, newlyMasteredCardIds)
            }
            
            const availableCards = filteredCards.filter(card => 
               !newlyMasteredCardIds.includes(card.id)
            )
            if (availableCards.length === 0) return []
            
            // Step 5 & 6: Prioritize and build quiz
            return this._buildQuizFromPrioritizedCards(
               availableCards, 
               recentQuestionAnswers, 
               targetQuestionCount,
               settings.reviewCycleDays
            )
            
         } catch (error) {
            console.error('Error generating quiz:', error)
            return []
         }
      },
      
      /**
       * Helper method to get selected AccountDeck objects for an account
       * @private
       */
      async _getSelectedAccountDecks(accountId) {
         const accountDecks = await dbCtx.accountDeck.list(accountId)
         return accountDecks.filter(deck => deck.isSelected)
      },
      
      /**
       * Helper method to get all cards from specified deck IDs
       * @private
       */
      async _getAllCardsFromDecks(deckIds) {
         const store = getObjectStore(stores.CARD, "readonly")
         const request = store.getAll()
         
         return await new Promise((resolve, reject) => {
            request.onsuccess = function(event) {
               const cards = event.target.result
               resolve(cards.filter(card => 
                  deckIds.includes(card.deckId) && !card.deletedDate
               ))
            }
            
            request.onerror = function(event) {
               reject("Cards not found")
            }
         })
      },
      
      /**
       * Helper method to filter out cards that are already mastered
       * @private
       */
      _filterOutMasteredCards(cards, accountDecks) {
         const masteredCardIds = new Set()
         
         // Collect all mastered card IDs from all selected decks
         accountDecks.forEach(deck => {
            if (deck.masteredCardIds && deck.masteredCardIds.length > 0) {
               deck.masteredCardIds.forEach(cardId => masteredCardIds.add(cardId))
            }
         })
         
         return cards.filter(card => !masteredCardIds.has(card.id))
      },
      
      /**
       * Helper method to get recent QuestionAnswers within review cycle
       * @private
       */
      async _getRecentQuestionAnswers(accountId, cardIds, cutoffDate) {
         const store = getObjectStore(stores.QUESTION_ANSWER, "readonly")
         const index = store.index("compsiteIndex")
         
         return await new Promise((resolve, reject) => {
            const answers = []
            const request = index.openCursor()
            
            request.onsuccess = function(event) {
               const cursor = event.target.result
               if (cursor) {
                  const answer = cursor.value
                  if (answer.accountId === accountId && 
                      cardIds.includes(answer.cardId) &&
                      new Date(answer.id) >= cutoffDate) {
                     answers.push(answer)
                  }
                  cursor.continue()
               } else {
                  resolve(answers)
               }
            }
            
            request.onerror = function(event) {
               reject("Question answers not found")
            }
         })
      },
      
      /**
       * Helper method to detect newly mastered cards using mastery window logic
       * @private
       */
      _detectNewlyMasteredCards(questionAnswers, masteryStreakCount, masteryWindowDays) {
         const newlyMasteredCardIds = []
         const masteryWindowMs = masteryWindowDays * 24 * 60 * 60 * 1000
         
         // Group answers by card ID
         const answersByCard = {}
         questionAnswers.forEach(answer => {
            if (!answersByCard[answer.cardId]) {
               answersByCard[answer.cardId] = []
            }
            answersByCard[answer.cardId].push(answer)
         })
         
         // Check each card for mastery
         Object.keys(answersByCard).forEach(cardId => {
            const answers = answersByCard[cardId]
            
            // Sort by date descending (most recent first)
            answers.sort((a, b) => new Date(b.id) - new Date(a.id))
            
            // Check if last N answers were correct and within mastery window
            if (answers.length >= masteryStreakCount) {
               const recentAnswers = answers.slice(0, masteryStreakCount)
               const allCorrect = recentAnswers.every(answer => answer.answeredCorrectly)
               
               if (allCorrect) {
                  // Check if they're within the mastery window
                  const oldestCorrectAnswer = recentAnswers[recentAnswers.length - 1]
                  const newestCorrectAnswer = recentAnswers[0]
                  const timeDiff = new Date(newestCorrectAnswer.id) - new Date(oldestCorrectAnswer.id)
                  
                  if (timeDiff <= masteryWindowMs) {
                     newlyMasteredCardIds.push(cardId)
                  }
               }
            }
         })
         
         return newlyMasteredCardIds
      },
      
      /**
       * Helper method to update mastered cards cache in AccountDeck records
       * @private
       */
      async _updateMasteredCardsCache(accountDecks, newlyMasteredCardIds) {
         if (newlyMasteredCardIds.length === 0) return
         
         // Get card details to map them to their decks
         const masteredCards = await dbCtx.card.byIdArray(newlyMasteredCardIds)
         
         // Group mastered cards by deck ID
         const masteredByDeckId = {}
         masteredCards.forEach(card => {
            if (!masteredByDeckId[card.deckId]) {
               masteredByDeckId[card.deckId] = []
            }
            masteredByDeckId[card.deckId].push(card.id)
         })
         
         // Update each AccountDeck with its newly mastered cards
         for (const accountDeck of accountDecks) {
            const deckMasteredCards = masteredByDeckId[accountDeck.deckId] || []
            
            if (deckMasteredCards.length > 0) {
               // Add to existing mastered cards, avoiding duplicates
               const existingMastered = new Set(accountDeck.masteredCardIds || [])
               deckMasteredCards.forEach(cardId => existingMastered.add(cardId))
               accountDeck.masteredCardIds = Array.from(existingMastered)
               
               // Update in database
               await dbCtx.accountDeck.update(accountDeck)
            }
         }
      },
      
      /**
       * Helper method to build quiz from prioritized cards using steps 5 & 6 logic
       * @private
       */
      _buildQuizFromPrioritizedCards(availableCards, questionAnswers, targetQuestionCount, reviewCycleDays) {
         // Step 5: Separate unasked vs asked cards
         const answeredCardIds = new Set(questionAnswers.map(qa => qa.cardId))
         const unaskedCards = availableCards.filter(card => !answeredCardIds.has(card.id))
         const askedCards = availableCards.filter(card => answeredCardIds.has(card.id))
         
         let selectedCardIds = []
         
         // Step 5.1: If enough unasked questions, use only those
         if (unaskedCards.length >= targetQuestionCount) {
            // Randomly select from unasked cards
            const shuffled = [...unaskedCards].sort(() => 0.5 - Math.random())
            selectedCardIds = shuffled.slice(0, targetQuestionCount).map(card => card.id)
         } else {
            // Step 5.2: Add all unasked cards, then fill with worst performers
            selectedCardIds = unaskedCards.map(card => card.id)
            const remainingNeeded = targetQuestionCount - selectedCardIds.length
            
            if (remainingNeeded > 0 && askedCards.length > 0) {
               // Step 6: Sort asked cards by success rate (worst to best), then by age (oldest to newest)
               const cardPerformance = this._calculateCardPerformance(askedCards, questionAnswers, reviewCycleDays)
               const sortedWorstPerformers = cardPerformance
                  .sort((a, b) => {
                     // First by success rate (ascending - worst first)
                     if (a.successRate !== b.successRate) {
                        return a.successRate - b.successRate
                     }
                     // Then by age (ascending - oldest first)
                     return a.oldestAnswerDate - b.oldestAnswerDate
                  })
                  .slice(0, remainingNeeded)
                  .map(perf => perf.cardId)
               
               selectedCardIds = selectedCardIds.concat(sortedWorstPerformers)
            }
         }
         
         return selectedCardIds
      },
      
      /**
       * Helper method to calculate performance metrics for cards
       * @private
       */
      _calculateCardPerformance(cards, questionAnswers, reviewCycleDays) {
         const reviewCutoffDate = new Date()
         reviewCutoffDate.setDate(reviewCutoffDate.getDate() - reviewCycleDays)
         
         return cards.map(card => {
            const cardAnswers = questionAnswers.filter(qa => qa.cardId === card.id)
            const correctAnswers = cardAnswers.filter(qa => qa.answeredCorrectly).length
            const successRate = cardAnswers.length > 0 ? correctAnswers / cardAnswers.length : 0
            
            // Find oldest answer date within review cycle
            const sortedAnswers = cardAnswers.sort((a, b) => new Date(a.id) - new Date(b.id))
            const oldestAnswerDate = sortedAnswers.length > 0 ? new Date(sortedAnswers[0].id) : new Date()
            
            return {
               cardId: card.id,
               successRate,
               oldestAnswerDate,
               totalAnswers: cardAnswers.length,
               correctAnswers
            }
         })
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
