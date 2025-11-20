# Stats Page Requirements

## Overview
Create a comprehensive statistics page that displays student performance data organized by deck with detailed card-level analytics.

## User Interface Structure

### [ ] Page Layout
- **Page Title**: "Your Statistics" or similar heading
- **Date Info**: A small text under the title that says how far back the stats are viewing. Based on AccountSettings.statsHistoryAgeInDays. E.G. Viewing data since Aug 13 2025 (90 days)
- **Main Container**: Scrollable list of deck statistics
- **Empty State**: Message when no quiz data exists
- **Loading State**: Show progress while fetching data

### [ ] Deck List Structure
- **Format**: Accordion-style list similar to Students management page
- **Sorting**: Decks ordered alphabetically by title
- **Visual Consistency**: Follow same styling patterns as Students page

## Deck List Item Components

### [ ] Collapsed State (Default View)
- **Toggle Button**: ▶ arrow icon on the left
- **Deck Title**: Display deck name clearly
- **Visual Style**: `.item` class similar to Students page
- **Hover Effect**: Subtle highlight on mouse over

### [ ] Expanded State (Detailed View)
- **Toggle Button**: ▼ arrow icon indicating expanded state
- **Deck Title**: Same as collapsed state
- **Visual Style**: `.item-selected` class for consistency
- **Smooth Animation**: CSS transition for expand/collapse

### [ ] Top-Level Statistics (Expanded State)
- **Quiz Count**: "Quizzed X times in the last N days"
  - X = Number of completed quizzes for this deck
    - To get this, look up all quizes where the Quiz.accountId matches the current student, the Quiz.completeDate is not null and also falls within the AccountSettings.statsHistoryAgeInDays (retain all quiz id for Average Score)
  - N = `AccountSettings.statsHistoryAgeInDays` (default: 90 days)
- **Average Score**: "Average score: X%"
  - Calculate from all quiz attempts in the date range
    - To get this, look up all QuestionAnswer data where the quizId is in the array of quiz ids from the Quiz Count step. Then calculate based on the QuizAnswer.answeredCorrectly data (retain all QuizAnswer data for the Card-Level Statistics)
  - Round to nearest whole percentage
  - Handle case where no quizzes exist ("No quiz data")

### [ ] Card-Level Statistics (Expanded State)
- **Card List**: Sub-list showing individual card performance
- **Card Display**: Show card's `shortPhrase` field
- **Success Rate**: "X% correct" or "No data"
  - Calculate percentage of correct answers for each card
    - To get this use the QuizAnswer array from the Average Score data then filter per Card by the QuestionAnswer.cardId and calulate based on the QuizAnswer.answeredCorrectly data
  - Based on `QuestionAnswer` records within date range
  - Show "No data" if card has never been answered

## Data Requirements

### [ ] Data Sources
- **Decks**: Get all decks associated with current student (`AccountDeck` + `Deck`)
- **Quizzes**: Filter by `accountId` and date range (`Quiz`)
- **Quiz Results**: Get all answers for the student (`QuestionAnswer`)
- **Cards**: Get all cards for each deck (`Card`)

### [ ] Date Filtering
- **Reference Date**: Use `AccountSettings.statsHistoryAgeInDays`
- **Calculation**: Current date minus N days
- **Apply To**: Quiz completion dates and question answer timestamps. Note the QuestionAnswer.id is the timestamp

### [ ] Performance Calculations
- **Quiz Average**: Sum of quiz scores ÷ number of quizzes
- **Card Success Rate**: Correct answers ÷ total answers × 100
- **Data Validation**: Handle division by zero, missing data

## Technical Implementation

### [ ] JavaScript Structure
- **Main Container**: `#stats-list` element
- **Page Object**: Follow existing page pattern (`page.load()`, `page.element`)
- **Data Loading**: Async methods for fetching statistics
- **Accordion Logic**: Reuse pattern from Students page

### [ ] CSS Styling
- **Consistency**: Extend Students page CSS patterns
- **Accordion Animation**: Smooth expand/collapse transitions
- **Card Sub-List**: Indented styling for card statistics
- **Responsive Design**: Mobile-friendly layout

### [ ] Database Queries
- **Efficient Loading**: Minimize database calls
- **Date Filtering**: Proper date range queries
- **Error Handling**: Graceful fallbacks for missing data

## User Experience Features

### [ ] Interaction Design
- **Click Target**: Entire row clickable for expand/collapse
- **Visual Feedback**: Clear hover and active states
- **Accessibility**: Proper ARIA labels and keyboard navigation

### [ ] Data Presentation
- **Clear Labels**: Self-explanatory text for all statistics
- **Meaningful Defaults**: Handle cases with no data gracefully
- **Progressive Disclosure**: Show summary first, details on demand

### [ ] Performance Considerations
- **Lazy Loading**: Only calculate stats for expanded decks
- **Caching**: Store calculated data to avoid recalculation
- **Smooth Animations**: 60fps expand/collapse transitions

## Edge Cases & Validation

### [ ] No Data Scenarios
- **No Decks**: Show "No decks available" message
- **No Quizzes**: Show "No quiz history" for deck
- **No Card Answers**: Show "No data" for individual cards
- **Future Dates**: Handle invalid date ranges

### [ ] Data Quality
- **Invalid Scores**: Handle corrupt or out-of-range scores
- **Missing References**: Handle orphaned quiz/answer records
- **Performance**: Optimize for users with large datasets

## Success Criteria
- [ ] Page loads quickly with proper loading states
- [ ] All deck statistics display accurately
- [ ] Card-level data matches quiz history
- [ ] Smooth, intuitive accordion interactions
- [ ] Responsive design works on all screen sizes
- [ ] Consistent styling with existing pages
- [ ] Proper error handling for edge cases

## Future Enhancements (Out of Scope)
- Charts and graphs for visual statistics
- Export statistics to CSV/PDF
- Comparison between different time periods
- Goal setting and progress tracking
- Filtering and search capabilities

## Notes
- Follow established patterns from Students management page
- Maintain consistency with existing design system
- Prioritize performance for users with extensive quiz history
- Ensure accessibility standards are met
