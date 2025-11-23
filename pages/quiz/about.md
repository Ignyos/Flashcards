# How quizes work

All of this is scoped to the currently active user.

## Generating a new 'quick' quiz - business logic

The selection of decks that are checked/selected are used to build a quiz.

1. All the cards from all the selected decks are loaded.

2. All cards that are in the AccountDeck.masteredCardIds collection are filtered out. This is a new property to add to the AccountDeck. It will store the Ids of mastered cards for performance improvement.

3. All the QuestionAnswer data is loaded for the remaining cards.

 - **3.1** All the QuestionAnswer's older than the AccountSettings.reviewCycleDays cutoff are filtered out. The QuestionAnswer.id is the date it was answered.

4. A search is done for newly mastered questions.

  - **4.1** QuestionAnswers are grouped by card id then sorted by date descending.
  
  - **4.2** Each group is checked to see if the last Mastery Threshold count of cards were answered correctly. Only the QuestionAnswers within the Mastery Window are considered. If so, their card id is added to the AccountDeck.masteredCardIds collection and they are filtered out of the rest of the selection process.

5. Any card's question that has not been asked (no QuestionAnswer data remaining from the previous steps filters) is prioritized.

  - **5.1** If the number of unasked questions is greater than or equal to the Default Question Count, the filter stops there and the quiz is built by randomly selecting the Default Question Count number of cards and generates the quiz.

  - **5.2** If the number of unasked questions is less than the Default Question Count, any cards that are not asked are immediately added to the quiz and the Default Question Count - those cards count is what is added with the following filter logic. E.G. Default Question Count = 10, unasked questions count = 5, this leaves 5 more questions to add to the quiz being built.

6. Any card's that have been asked are now sorted by sucessful answer rate from worst to best and then sub sorted by longest ago to most recently asked. Take n cards where n is equal to the number from step 5.2.

If at any point the number of questions available is less than the Default Question Count, then all the available questions are asked. This applies only after filtering out the Mastered Questions.