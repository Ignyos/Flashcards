# How quizes work

All of this is scoped to the currently active user.

## Generating a new quiz

The selection of decks that are checked/selected are used to build a quiz.

1. All the cards from all the selected decks are loaded.

2. All cards that are in the AccountDeck.masteredCardIds collection are filtered out. This is a new property to add to the AccountDeck. It will store the Ids of mastered cards for performance improvement.

3. All the QuestionAnswer data is loaded for the remaining cards.

 - **3.1** All the QuestionAnswer's older than the AccountSettings.reviewCycleDays cutoff are filtered out. The QuestionAnswer.id is the date it was answered.

4. A search is done for newly mastered questions.

  - **4.1** QuestionAnswers are grouped by card id then sorted by date descending.
  
  - **4.2** Each group is checked to see if the last Mastery Threshold count of cards were answered correctly. If so, their card id is added to the AccountDeck.masteredCardIds collection and they are filtered out of the rest of the selection process.

5. Any card's question that has not been asked (no QuestionAnswer data from the previous step) is prioritized.

  - **5.1** If the number of unasked questions is greater than or equal to the Default Question Count, the filter stops there and the quiz is built by randomly selecting the Default Question Count number of cards and generates the quiz.

  - **5.2** If the number of unasked questions is less than the Default Question Count, any cards that are not asked are immediately added to the quiz and the Default Question Count - those cards count is what is added with the following filter logic.