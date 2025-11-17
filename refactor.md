# Flashcards Data Structure & UI Refactor Plan

## Overview
Major refactor to simplify data structure and modernize UI:
- **Data Structure**: Remove Topic layer, rename Subject→Deck and Question→Card
- **UI**: Replace three-pane layout with tabbed interface (Decks tab, Cards tab)

## Current Data Structure
```
Account (1) → AccountSubject (many) → Subject (1) → Topic (many) → Question (many)
```

## Target Data Structure  
```
Account (1) → AccountDeck (many) → Deck (1) → Card (many)
```

## Refactor Steps

### Phase 1: Database Schema Migration
**Goal**: Update IndexedDB schema and data models

#### Step 1.1: Update Data Models (`dataModels.js`)
- [x] Rename `Subject` class to `Deck`
- [x] Rename `Question` class to `Card`  
- [x] Remove `Topic` class entirely
- [x] Update `AccountSubject` to `AccountDeck`
- [x] Remove topic-related properties from `AccountDeck`
- [x] Update `Card` to reference `deckId` instead of `topicId`
- [x] Remove topic-related DTOs and methods

#### Step 1.2: Update Database Schema (`indexedDb.js`)
- [x] Update store names in `stores` object:
  - Rename `stores.SUBJECT` to `stores.DECK`  
  - Rename `stores.QUESTION` to `stores.CARD`
  - Rename `stores.ACCOUNT_SUBJECT` to `stores.ACCOUNT_DECK`
  - Remove `stores.TOPIC`
- [x] Update `onupgradeneeded` function to create new schema:
  - Replace `subjectStore` with `deckStore`
  - Replace `questionStore` with `cardStore` (index on `deckId`)
  - Replace `accountSubjectStore` with `accountDeckStore`
  - Remove `topicStore` creation entirely
- [x] Increment database version to trigger schema recreation

#### Step 1.3: Database Context Updates (`indexedDb.js`)
- [x] Update `dbCtx.accountSubject` to `dbCtx.accountDeck`
- [x] Update `dbCtx.subject` to `dbCtx.deck`  
- [x] Update `dbCtx.question` to `dbCtx.card`
- [x] Remove `dbCtx.topic` methods entirely
- [x] Update all CRUD operations to use new naming

### Phase 2: State Management Updates
**Goal**: Update state manager to handle new data structure

#### Step 2.1: State Manager Core (`state.js`)
- [x] Update property names:
  - `subjects` → `decks`
  - `questions` → `cards` 
  - Remove `topics` property
  - Remove `question` property (will be handled differently)
- [x] Update page loading methods:
  - `loadSubjects()` → `loadDecks()`
  - `loadQuestions()` → `loadCards()` 
  - Remove `loadTopics()`
- [x] Update getter methods:
  - `subjectId` → `deckId`
  - Remove `topicId`, `topic`, `accountSubject` getters
  - Add `accountDeck` getter

#### Step 2.2: State Manager Methods (`state.js`)
- [x] Update deck management methods:
  - `setSubjectId()` → `setDeckId()`
  - `addNewAccountSubject()` → `addNewAccountDeck()`
  - `updateAccountSubject()` → `updateAccountDeck()`
  - `deleteAccountSubject()` → `deleteAccountDeck()`
- [x] Remove all topic-related methods:
  - `setTopicId()`, `toggleFocusTopic()`, `addNewTopic()`, etc.
- [x] Update card management methods:
  - Update to work directly with decks (no topic intermediary)
  - `loadQuestions()` → `loadCards()` - filter by `deckId`

#### Step 2.3: Account State Updates (`dataModels.js`)
- [x] Update `AccountState`:
  - `selectedSubjectId` → `selectedDeckId`
  - Remove topic-related state properties
- [x] Update `AccountDeck` (formerly `AccountSubject`):
  - Remove `focusTopicIds`, `selectedTopicId`, `selectedQuestion`
  - Add `selectedCardId` if needed for UI state

### Phase 3: UI Architecture Rebuild  
**Goal**: Replace three-pane layout with tabbed interface

#### Step 3.1: New UI Structure (`flashcards.js`, `flashcards.css`)
- [x] Update page layout from three columns to single column with tabs
- [x] Create tab navigation component:
  - "Decks" tab - shows deck list and management
  - "Cards" tab - shows cards for selected deck
- [x] Update CSS grid layout:
  - Remove three-column `grid-template-areas`
  - Implement tab container with tab content areas
- [x] Create tab button styling with button-in-button design
- [x] Add responsive tab layout (horizontal on large screens, vertical on small)
- [x] Update terminology: subject → deck, question → card
- [x] Remove topic-related CSS entirely

#### Step 3.2: Decks Tab Implementation  
- [ ] Combine subject pane functionality into Decks tab:
  - Deck list display
  - New deck creation
  - Deck editing/deletion
  - Deck selection (updates Cards tab)
- [ ] Remove subject-specific CSS classes, update to deck terminology
- [ ] Update event handlers for deck operations

#### Step 3.3: Cards Tab Implementation
- [ ] Combine question pane functionality into Cards tab:
  - Card list display (filtered by selected deck)
  - New card creation  
  - Card editing/deletion
  - Card selection and preview
- [ ] Remove question-specific CSS classes, update to card terminology
- [ ] Update event handlers for card operations
- [ ] Add "Select a deck" state when no deck is chosen

#### Step 3.4: Remove Topic UI Components
- [ ] Remove all topic-related UI methods and CSS:
  - `topicPane`, `topicPaneControls`, `topicList`, etc.
  - Focus topic functionality
  - Topic editing/deletion modals
- [ ] Remove topic-related CSS classes and styles
- [ ] Update navigation to work without topic context

### Phase 4: Integration & Testing
**Goal**: Ensure all systems work together with new structure

#### Step 4.1: Update Dependent Features
- [ ] **Quiz System**: Update to select cards directly from decks
  - Remove topic-based filtering
  - Update quiz creation to work with deck-based selection
- [ ] **Stats System**: Update to track card performance by deck
  - Remove topic-based grouping
  - Update stats queries and display
- [ ] **Seed Data**: Update to generate deck/card structure
  - Remove topic generation
  - Update sample data to match new schema

#### Step 4.2: Update Helper Functions (`helpers.js`)
- [ ] Update ID generation and utility functions
- [ ] Remove topic-related helper methods
- [ ] Update card-related utilities to work with deck context

#### Step 4.3: Cross-File Reference Updates
- [ ] Search and replace remaining references:
  - `topicId` → `deckId` 
  - `questionId` → `cardId`
  - Subject/Topic/Question → Deck/Card terminology
- [ ] Update all error messages and user-facing text
- [ ] Update comments and documentation

### Phase 5: Testing & Validation
**Goal**: Ensure all systems work correctly with new structure

#### Step 5.1: Comprehensive Testing
- [ ] Test deck/card CRUD operations
- [ ] Verify quiz functionality with new structure
- [ ] Test stats tracking and display
- [ ] Validate seed data generation
- [ ] Test UI responsiveness and state management

#### Step 5.2: Edge Case Handling
- [ ] Test with empty decks
- [ ] Test deck deletion with existing cards
- [ ] Validate account switching
- [ ] Test browser refresh/reload scenarios

## Implementation Notes

### Critical Dependencies
- **Order matters**: Database changes must come before state management changes
- **UI depends on state**: Complete state refactor before UI changes
- **Test incrementally**: Each phase should be functional before moving to next

### Key Challenges
1. **State Synchronization**: Removing topic layer affects how deck selection drives card display  
2. **UI Complexity**: Moving from three panes to tabs changes user interaction flow
3. **Quiz Integration**: Quiz creation logic needs significant updates
4. **Terminology Consistency**: Ensuring all references are updated throughout codebase

### Testing Strategy
- Test each phase independently with seed data
- Create fresh database schema for testing new structure
- Validate data integrity after each major change
- Test UI responsiveness and state management
- Use browser dev tools to verify IndexedDB schema changes

### Rollout Plan
1. Update database schema and models
2. Complete state management refactor
3. Build new UI incrementally (Decks tab first, then Cards tab)
4. Update dependent systems (Quiz, Stats)
5. Generate fresh seed data for testing
6. Comprehensive testing with various scenarios

---

**Estimated Timeline**: 1-2 weeks for complete refactor  
**Risk Level**: Medium (no production data to migrate)  
**Recommendation**: Implement incrementally, test frequently with fresh seed data