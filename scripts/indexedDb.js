const stores = {
   ACCOUNT: "account",
   ACCOUNT_SUBJECT: "accountSubject",
   METADATA: "metaData",
   QUESTION: "question",
   QUESTION_ANSWER: "questionAnswer",
   QUIZ: "quiz",
   SUBJECT: "subject",
   TOPIC: "topic"
}

let db;
const request = indexedDB.open("ignyos.funtility", 1);

request.onupgradeneeded = function(event) {
   db = event.target.result;

   const accountStore = db.createObjectStore(stores.ACCOUNT, { keyPath: "id" });
   accountStore.createIndex("name", "name", { unique: true });

   const accountSubjectStore = db.createObjectStore(stores.ACCOUNT_SUBJECT, { keyPath: "subjectId" });
   accountSubjectStore.createIndex("accountId", "accountId", { unique: false });

   const metaDataStore = db.createObjectStore(stores.METADATA, { keyPath: "id" });
   metaDataStore.add({ id: 1, selectedAccountId: '' });

   const questionStore = db.createObjectStore(stores.QUESTION, { keyPath: "id" });
   questionStore.createIndex("topicId", "topicId", { unique: false });

   const questionAnswerStore = db.createObjectStore(stores.QUESTION_ANSWER, { keyPath: "id" });
   questionAnswerStore.createIndex("compsiteIndex", ["accountId", "quizId"], { unique: false });

   const quizStore = db.createObjectStore(stores.QUIZ, { keyPath: "id" });
   quizStore.createIndex("accountId", "accountId", { unique: false });

   const subjectStore = db.createObjectStore(stores.SUBJECT, { keyPath: "id" });

   const topicStore = db.createObjectStore(stores.TOPIC, { keyPath: "id" });
   topicStore.createIndex("subjectId", "subjectId", { unique: false });
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
   accountSubject: {
      async list(accountId) {
         try {
            const accountSubjects = await this.all(accountId);
            const subjects = await dbCtx.subject.all(accountId);

            return accountSubjects.map(accountSubject => {
               const subject = subjects.find(subject => subject.id === accountSubject.subjectId);
               return new SubjectListItem(accountSubject, subject);
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      async all(acctId) {
         try {
            const store = getObjectStore(stores.ACCOUNT_SUBJECT, "readonly");
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
      async add(accountSubject) {
         try {
            const store = getObjectStore(stores.ACCOUNT_SUBJECT, "readwrite");
            const request = store.add(accountSubject);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("AccountSubject not added");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async update(accountSubject) {
         try {
            const store = getObjectStore(stores.ACCOUNT_SUBJECT, "readwrite");
            const request = store.put(accountSubject);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("AccountSubject not updated");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async delete(accountId, subjectId) {
         try {
            const store = getObjectStore(stores.ACCOUNT_SUBJECT, "readwrite");
            const index = store.index("accountId");
            const request = index.openCursor(IDBKeyRange.only(accountId));

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const cursor = event.target.result;
                  if (cursor) {
                     if (cursor.value.subjectId === subjectId) {
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
                     reject("AccountSubject not found");
                  }
               };

               request.onerror = function(event) {
                  reject("AccountSubject not found");
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

            request.onsuccess = function(event) {
               const metaData = event.target.result;
               metaData.selectedAccountId = accountId;
               store.put(metaData);
            };
         } catch (error) {
            console.error(error);
         }
      },
   },
   question: {
      /**
       * Only returns the questions that have not been deleted.
       * @param {*} topicId 
       * @returns 
       */
      async byTopicId(topicId) {
         if (!topicId) return [];
         try {
            const store = getObjectStore(stores.QUESTION, "readonly");
            const index = store.index("topicId");
            const request = index.getAll(topicId);

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve(event.target.result.filter(question => !question.deletedDate).sort((a, b) => a.shortPhrase.localeCompare(b.shortPhrase)));
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
            const store = getObjectStore(stores.QUESTION, "readonly");
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
            return new Question();
         }
      },
      async byIdArray(ids) {
         try {
            const store = getObjectStore(stores.QUESTION, "readonly");
            const request = store.getAll();

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const questions = event.target.result;
                  resolve(questions.filter(question => ids.includes(question.id)));
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
      async add(question) {
         try {
            const store = getObjectStore(stores.QUESTION, "readwrite");
            const request = store.add(question);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Question not added");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async update(question) {
         try {
            const store = getObjectStore(stores.QUESTION, "readwrite");
            const request = store.put(new Question(question));

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
            const focusTopicIds = await this.focusTopicIds(acctId);
            const questionIds = await this.questionIds(focusTopicIds);
            const answeredQuestions = await this.answeredQuestions(acctId, questionIds);
            const unansweredQuestionIds = this.unansweredQuestionIds(questionIds, answeredQuestions);

            let quizQuestionIds;
            if (unansweredQuestionIds.length > questionCount - 1) {
               quizQuestionIds = getRandomNElements(unansweredQuestionIds, questionCount);
            } else {
               const n = questionCount - unansweredQuestionIds.length;
               const questionIdsInMostNeedOfStudy = this.questionIdsInMostNeedOfStudy(n, answeredQuestions);
               quizQuestionIds = unansweredQuestionIds.concat(questionIdsInMostNeedOfStudy);
            }

            if (quizQuestionIds.length === 0) {
               return false;
            } else {
               result.allQuestionIds = quizQuestionIds;
               await this.add(result);
               return result;
            }
         } catch (error) {
            console.error(error);
            return false;
         }
      },
      async focusTopicIds(acctId) {
         try {
            const accountSubjects = await dbCtx.accountSubject.all(acctId);
            // combine all the focusTopicIds from the accountSubjects
            return accountSubjects.reduce((acc, curr) => acc.concat(curr.focusTopicIds), []);
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      async questionIds(focusTopicIds) {
         try {
            const store = getObjectStore(stores.QUESTION, "readonly");
            const request = store.getAll();

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const questions = event.target.result;
                  resolve(questions
                     .filter(question => focusTopicIds
                        .includes(question.topicId) 
                        && question.deletedDate === null)
                     .map(question => question.id)
                  );
               };

               request.onerror = function(event) {
                  reject("Questions not found");
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      async answeredQuestions(acctId, questionIds) {
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
                     if (answer.accountId === acctId && questionIds.includes(answer.questionId)) {
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
      unansweredQuestionIds(questionIds, answeredQuestions) {
         return questionIds
            .filter(questionId => !answeredQuestions
               .some(answer => answer.questionId === questionId));
      },
      questionIdsInMostNeedOfStudy(count, answeredQuestions) {
         if (answeredQuestions.length === 0) { return []; }
         answeredQuestions.sort((a, b) => {
            return a.id.localeCompare(b.id);
         });
         const distinctQuestionIds = [...new Set(answeredQuestions.map(answer => answer.questionId))];
         let stackRank = [];// two dimentiional array
         distinctQuestionIds.forEach(questionId => {
            const answers = answeredQuestions.filter(answer => answer.questionId === questionId);
            stackRank.push([questionId, this.getWeight(answers)]);
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
       * Finds all the QuestionAnswers for the given account id and quiz id. Then finds all the questions
       * based on the question ids from the QuestionAnswers. Then creates a QuestionListItem object for each
       * question and answer. Then returns the collection of QuestionListItem objects.
       * @param {string} accountId 
       * @param {string} quizId 
       * @returns {QuestionListItem[]}
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
                  const questions = await dbCtx.question.byIdArray(questionIds);
                  const results = questions.map(question => {
                     const answer = answers.find(answer => answer.questionId === question.id);
                     return new QuestionListItem(question, answer);
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
   subject: {
      /**
       * First gets all the AccountSubject associated with the account id. Then gets all the subjects
       * based on the subject ids from the AccountSubjects.  
       * @param {*} acctId 
       * @returns 
       */
      async all(acctId) {
         try {
            const accountSubjects = await dbCtx.accountSubject.all(acctId);
            const subjectIds = accountSubjects.map(as => as.subjectId);
            const store = getObjectStore(stores.SUBJECT, "readonly");
            const request = store.getAll();

            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  const subjects = event.target.result;
                  resolve(subjects.filter(subject => subjectIds.includes(subject.id)));
               };

               request.onerror = function(event) {
                  reject("Subjects not found");
               };
            });
         } catch (error) {
            console.error(error);
            return [];
         }
      },
      async add(subject) {
         try {
            const store = getObjectStore(stores.SUBJECT, "readwrite");
            const request = store.add(subject);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Subject not added");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async update(subject) {
         try {
            const store = getObjectStore(stores.SUBJECT, "readwrite");
            const request = store.put(new Subject(subject));

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
   },
   topic: {
      async all(subjectId) {
         if (!subjectId) return [];
         try {
            const store = getObjectStore(stores.TOPIC, "readonly");
            const index = store.index("subjectId");
            const request = index.getAll(subjectId);
            return await new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve(event.target.result.filter(topic => !topic.deletedDate).sort((a, b) => a.title.localeCompare(b.title)));
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
      async add(topic) {
         try {
            const store = getObjectStore(stores.TOPIC, "readwrite");
            const request = store.add(topic);

            return new Promise((resolve, reject) => {
               request.onsuccess = function(event) {
                  resolve();
               };

               request.onerror = function(event) {
                  reject("Topic not added");
               };
            });
         } catch (error) {
            console.error(error);
         }
      },
      async update(topic) {
         try {
            const store = getObjectStore(stores.TOPIC, "readwrite");
            const request = store.put(new Topic(topic));

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
