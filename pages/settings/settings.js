// Settings Page Implementation
page = {
   pendingChanges: false,
   originalSettings: null,

   get element() {
      let ele = document.createElement('div')
      ele.id = 'page'
      
      // Page title
      let title = document.createElement('h1')
      title.innerText = 'Settings'
      ele.appendChild(title)
      
      // Button container (moved to top)
      let buttonContainer = document.createElement('div')
      buttonContainer.className = 'button-container top-buttons'
      
      // Save button
      let saveButton = document.createElement('button')
      saveButton.className = 'save-button'
      saveButton.innerText = 'Save Settings'
      saveButton.id = 'save-settings-btn'
      saveButton.addEventListener('click', () => this.saveSettings())
      buttonContainer.appendChild(saveButton)
      
      // Reset button
      let resetButton = document.createElement('button')
      resetButton.className = 'reset-button'
      resetButton.innerText = 'Reset to Defaults'
      resetButton.addEventListener('click', () => this.resetToDefaults())
      buttonContainer.appendChild(resetButton)
      
      ele.appendChild(buttonContainer)
      
      // Settings container
      let settingsContainer = document.createElement('div')
      settingsContainer.className = 'settings-container'
      
      // Quiz Generation section
      settingsContainer.appendChild(this.createQuizGenerationSection())
      
      // Performance Tracking section
      settingsContainer.appendChild(this.createPerformanceTrackingSection())
      
      // Learning Data Management section
      settingsContainer.appendChild(this.createLearningDataManagementSection())
      
      // Import / Export section
      settingsContainer.appendChild(this.createImportExportSection())
      
      ele.appendChild(settingsContainer)
      
      return ele
   },

   async load() {
      // Store original settings for comparison
      this.originalSettings = JSON.parse(JSON.stringify(stateMgr.account.settings))
      this.updateSaveButtonState()
   },

   createCollapsibleSection(sectionId, title, description, contentCreator) {
      const isExpanded = stateMgr.account.settings.settingsSectionStates[sectionId]
      
      let section = document.createElement('div')
      section.className = 'settings-section'
      section.setAttribute('data-section-id', sectionId)
      
      // Header with toggle
      let header = document.createElement('div')
      header.className = 'settings-section-header'
      
      // Create header container for toggle and title
      let headerContainer = document.createElement('div')
      headerContainer.className = 'header-container'
      
      // Toggle button
      const toggle = document.createElement('div')
      toggle.className = 'accordion-toggle'
      toggle.innerHTML = isExpanded ? '▼' : '▶'
      
      // Add click handler to toggle
      toggle.addEventListener('click', async (e) => {
         e.stopPropagation()
         await this.toggleSectionExpansion(section, sectionId)
      })
      
      headerContainer.appendChild(toggle)
      
      let titleElement = document.createElement('h2')
      titleElement.className = 'settings-section-title'
      titleElement.innerText = title
      headerContainer.appendChild(titleElement)
      
      header.appendChild(headerContainer)
      
      let descriptionElement = document.createElement('p')
      descriptionElement.className = 'settings-section-description'
      descriptionElement.innerText = description
      header.appendChild(descriptionElement)
      
      section.appendChild(header)
      
      // Content
      let content = document.createElement('div')
      content.className = 'settings-section-content'
      if (!isExpanded) {
         content.classList.add('hidden')
      }
      
      // Use the content creator function to populate the content
      contentCreator(content)
      
      section.appendChild(content)
      
      return section
   },

   async toggleSectionExpansion(sectionElement, sectionId) {
      const toggle = sectionElement.querySelector('.accordion-toggle')
      const content = sectionElement.querySelector('.settings-section-content')
      const isExpanded = !content.classList.contains('hidden')
      
      if (isExpanded) {
         // Collapse
         toggle.innerHTML = '▶'
         content.classList.add('hidden')
         stateMgr.account.settings.settingsSectionStates[sectionId] = false
      } else {
         // Expand
         toggle.innerHTML = '▼'
         content.classList.remove('hidden')
         stateMgr.account.settings.settingsSectionStates[sectionId] = true
      }
      
      // Save the state to the database
      await dbCtx.account.update(stateMgr.account)
   },

   createQuizGenerationSection() {
      return this.createCollapsibleSection(
         'quiz-generation',
         'Quiz Generation',
         'Control how quizzes are created and which questions are included.',
         (content) => {
            // Default Question Count
            content.appendChild(this.createSettingItem(
               'Default Question Count',
               'Number of questions included in each quiz by default.',
               'defaultQuestionCount',
               'number',
               { min: 1, max: 100 },
               'questions'
            ))
            
            // Review Cycle Days
            content.appendChild(this.createSettingItem(
               'Review Cycle',
               'Days to wait before asking a correctly answered question again. This helps with spaced repetition learning.',
               'reviewCycleDays',
               'number',
               { min: 1, max: 365 },
               'days'
            ))
            
            // Mastery Streak Count
            content.appendChild(this.createSettingItem(
               'Mastery Threshold',
               'Number of consecutive correct answers needed before a question is considered mastered. Mastered questions are not included in regular quizzes and will only appear if you build a custom quiz with them. This setting also determines how your success rate for each card is calculated and displayed: only the most recent N answers (where N is the Mastery Threshold) are used to compute your performance statistics.',
               'masteryStreakCount',
               'number',
               { min: 1, max: 10 },
               'correct answers'
            ))
            
            // Mastery Window
            content.appendChild(this.createSettingItem(
               'Mastery Window',
               'Time span for achieving mastery. Answer a question correctly ' + stateMgr.account.settings.masteryStreakCount + ' consecutive times within this timeframe. Note: This must be less than or equal to the Review Cycle.',
               'masteryWindowDays',
               'number',
               { min: 1, max: stateMgr.account.settings.reviewCycleDays },
               'days'
            ))
         }
      )
   },

   createPerformanceTrackingSection() {
      return this.createCollapsibleSection(
         'performance-tracking',
         'Performance Tracking',
         'Configure how your quiz performance and statistics are calculated and displayed.',
         (content) => {
            // Stats History Age
            content.appendChild(this.createSettingItem(
               'Statistics History',
               'Number of days of quiz history to include in statistics and performance calculations. Older data will be deleted.',
               'statsHistoryAgeInDays',
               'number',
               { min: 7, max: 365 },
               'days'
            ))
         }
      )
   },

   createLearningDataManagementSection() {
      return this.createCollapsibleSection(
         'learning-data-management',
         'Learning Data Management',
         'Manage your learning history and reset progress data. Use these options to start fresh or clean up old learning data.',
         (content) => {
            // Clear Quiz History
            content.appendChild(this.createDualActionItem(
               'Clear Quiz History',
               'Delete completed quizzes and their results. This will remove quiz data from your statistics but will not affect mastery progress.',
               'clear-quiz-history',
               'Clear All History',
               'Clear Selected Decks...',
               'destructive'
            ))
            
            // Reset Mastery Data
            content.appendChild(this.createDualActionItem(
               'Reset Mastery Progress',
               'Clear mastery progress and delete the learning history for mastered cards. This completely removes mastery records and their associated question answers.',
               'reset-mastery-data',
               'Reset All Mastery',
               'Reset Selected Decks...',
               'destructive'
            ))
            
            // Reset All Data
            content.appendChild(this.createDualActionItem(
               'Reset All Learning Data',
               'Complete reset: delete all quiz history AND mastery progress. This clears all historical learning data but cards may still be re-detected as mastered based on recent performance within the current Mastery Window when taking new quizzes.',
               'reset-all-data',
               'Reset Everything',
               'Reset Selected Decks...',
               'destructive-primary'
            ))
         }
      )
   },

   createImportExportSection() {
      return this.createCollapsibleSection(
         'import-export',
         'Import / Export',
         'Export your learning data for backup or transfer to another device. Import options will be available in future updates.',
         (content) => {
            // Selective Export Controls
            const exportOptions = document.createElement('div');
            exportOptions.className = 'export-options';
            exportOptions.style.marginBottom = '1rem';

            const options = [
               { id: 'export-decks', label: 'Decks', checked: true },
               { id: 'export-quiz-history', label: 'Quiz History', checked: true },
               { id: 'export-mastery-data', label: 'Mastery Data', checked: true },
               { id: 'export-settings', label: 'Settings', checked: true }
            ];
            options.forEach(opt => {
               const wrapper = document.createElement('label');
               wrapper.style.marginRight = '1.5em';
               const cb = document.createElement('input');
               cb.type = 'checkbox';
               cb.id = opt.id;
               cb.checked = opt.checked;
               cb.style.marginRight = '0.5em';
               wrapper.appendChild(cb);
               wrapper.appendChild(document.createTextNode(opt.label));
               exportOptions.appendChild(wrapper);
            });
            content.appendChild(exportOptions);

            // Export status message
            const exportStatus = document.createElement('div');
            exportStatus.id = 'export-status';
            exportStatus.style = 'margin-top: 1em; min-height: 2em; color: #388e3c; font-weight: bold;';
            content.appendChild(exportStatus);

            // Export Data Button
            const exportBtn = document.createElement('button');
            exportBtn.className = 'action-button secondary';
            exportBtn.innerText = 'Export Data';
            exportBtn.id = 'export-data';
            exportBtn.addEventListener('click', () => this.handleDataAction('export-data'));
            content.appendChild(exportBtn);
         }
      )
   },

   createSettingItem(label, description, settingKey, inputType, validation, unit) {
      let item = document.createElement('div')
      item.className = 'setting-item'
      
      // Info section
      let info = document.createElement('div')
      info.className = 'setting-info'
      
      let labelEle = document.createElement('div')
      labelEle.className = 'setting-label'
      labelEle.innerText = label
      info.appendChild(labelEle)
      
      let desc = document.createElement('div')
      desc.className = 'setting-description'
      desc.innerText = description
      info.appendChild(desc)
      
      item.appendChild(info)
      
      // Control section
      let control = document.createElement('div')
      control.className = 'setting-control'
      
      let input = document.createElement('input')
      input.className = 'setting-input'
      input.type = inputType
      input.id = `setting-${settingKey}`
      input.value = stateMgr.account.settings[settingKey]
      
      if (validation) {
         if (validation.min !== undefined) input.min = validation.min
         if (validation.max !== undefined) input.max = validation.max
      }
      
      input.addEventListener('input', () => this.onSettingChange(settingKey, input.value))
      control.appendChild(input)
      
      if (unit) {
         let unitLabel = document.createElement('span')
         unitLabel.className = 'setting-unit'
         unitLabel.innerText = unit
         control.appendChild(unitLabel)
      }
      
      item.appendChild(control)
      
      return item
   },

   createActionItem(label, description, actionId, buttonText, buttonClass) {
      let item = document.createElement('div')
      item.className = 'setting-item action-item'
      
      // Info section
      let info = document.createElement('div')
      info.className = 'setting-info'
      
      let labelEle = document.createElement('div')
      labelEle.className = 'setting-label'
      labelEle.innerText = label
      info.appendChild(labelEle)
      
      let desc = document.createElement('div')
      desc.className = 'setting-description'
      desc.innerText = description
      info.appendChild(desc)
      
      item.appendChild(info)
      
      // Control section with button
      let control = document.createElement('div')
      control.className = 'setting-control action-control'
      
      let button = document.createElement('button')
      button.className = `action-button ${buttonClass}`
      button.innerText = buttonText
      button.id = actionId
      button.addEventListener('click', () => this.handleDataAction(actionId))
      control.appendChild(button)
      
      item.appendChild(control)
      
      return item
   },

   createDualActionItem(label, description, actionId, allButtonText, selectedButtonText, buttonClass) {
      let item = document.createElement('div')
      item.className = 'setting-item action-item'
      
      // Info section
      let info = document.createElement('div')
      info.className = 'setting-info'
      
      let labelEle = document.createElement('div')
      labelEle.className = 'setting-label'
      labelEle.innerText = label
      info.appendChild(labelEle)
      
      let desc = document.createElement('div')
      desc.className = 'setting-description'
      desc.innerText = description
      info.appendChild(desc)
      
      item.appendChild(info)
      
      // Control section with two buttons
      let control = document.createElement('div')
      control.className = 'setting-control action-control dual-action'
      
      // "All" button
      let allButton = document.createElement('button')
      allButton.className = `action-button ${buttonClass}`
      allButton.innerText = allButtonText
      allButton.id = actionId
      allButton.addEventListener('click', () => this.handleDataAction(actionId))
      control.appendChild(allButton)
      
      // "Selected" button
      let selectedButton = document.createElement('button')
      selectedButton.className = `action-button ${buttonClass} secondary`
      selectedButton.innerText = selectedButtonText
      selectedButton.id = `${actionId}-selected`
      selectedButton.addEventListener('click', () => this.handleDataAction(`${actionId}-selected`))
      control.appendChild(selectedButton)
      
      item.appendChild(control)
      
      return item
   },

   async handleDataAction(actionId) {
      try {
         switch (actionId) {
            case 'clear-quiz-history':
               if (await this.confirmDataAction('Clear Quiz History', 'This will permanently delete all quiz history and statistics. Your mastery progress will be preserved.')) {
                  await this.clearQuizHistory()
                  alert('Quiz history has been cleared successfully.')
               }
               break

            case 'clear-quiz-history-selected':
               await this.handleSelectedDecksAction('clear-quiz-history')
               break

            case 'reset-mastery-data':
               if (await this.confirmDataAction('Reset Mastery Progress', 'This will completely clear all mastery progress and delete the learning history for mastered cards. This action cannot be undone.')) {
                  await this.resetMasteryData()
                  alert('Mastery progress has been reset successfully.')
               }
               break

            case 'reset-mastery-data-selected':
               await this.handleSelectedDecksAction('reset-mastery-data')
               break

            case 'reset-all-data':
               if (await this.confirmDataAction('Reset All Learning Data', 'This will delete ALL quiz history AND mastery progress. This cannot be undone!', true)) {
                  await this.resetAllData()
                  alert('All learning data has been reset successfully.')
               }
               break

            case 'reset-all-data-selected':
               await this.handleSelectedDecksAction('reset-all-data')
               break

            case 'export-data':
               await this.exportData()
               break

            default:
               console.error('Unknown data action:', actionId)
         }
      } catch (error) {
         console.error('Error performing data action:', error)
         alert('An error occurred while performing this action. Please try again.')
      }
   },

   async confirmDataAction(title, message, isHighRisk = false) {
      const confirmation = isHighRisk ? 
         prompt(`${title}\n\n${message}\n\nType "RESET" to confirm:`) :
         confirm(`${title}\n\n${message}\n\nAre you sure you want to continue?`)
      
      if (isHighRisk) {
         return confirmation === "RESET"
      }
      return confirmation
   },

   async clearQuizHistory() {
      const accountId = stateMgr.account.id
      console.log('Clearing quiz history for account:', accountId)
      // Delete all quizzes for this account
      await dbCtx.quiz.deleteAllForAccount(accountId)
      console.log('All quizzes deleted for account:', accountId)
      // Delete all question answers for this account  
      await dbCtx.questionAnswer.deleteAllForAccount(accountId)
      console.log('All question answers deleted for account:', accountId)
      // Reload stats data if on stats page
      if (stateMgr.account?.state?.currentPage === pages.STATS) {
         await stateMgr.loadStatsPage()
         console.log('Stats page reloaded after clearing quiz history.')
      }
      // Force UI update
      if (typeof this.refreshUI === 'function') {
         this.refreshUI()
         console.log('Settings UI refreshed after clearing quiz history.')
      }
   },

   async resetMasteryData() {
      const accountId = stateMgr.account.id
      
      // Get actual AccountDeck objects from database instead of using cached DeckListItems
      const accountDecks = await dbCtx.accountDeck.all(accountId)
      
      // Clear mastery data from all account decks
      for (let accountDeck of accountDecks) {
         // Get mastered card IDs before clearing them
         const masteredCardIds = accountDeck.masteredCardIds || []
         
         // Delete QuestionAnswers for all mastered cards
         for (let cardId of masteredCardIds) {
            await dbCtx.questionAnswer.deleteByCardId(accountId, cardId)
         }
         
         // Clear mastered cards list and update in database
         accountDeck.masteredCardIds = []
         await dbCtx.accountDeck.update(accountDeck)
         
         // Also update the state manager cache if it exists
         if (stateMgr.decks) {
            const cacheIndex = stateMgr.decks.findIndex(d => d.deckId === accountDeck.deckId)
            if (cacheIndex !== -1) {
               stateMgr.decks[cacheIndex].masteredCardIds = []
            }
         }
      }
      
      // Update the selected decks have cards check
      if (stateMgr.checkSelectedDecksHaveCards) {
         await stateMgr.checkSelectedDecksHaveCards()
         await app.initSiteHeader()
      }
   },

   async resetAllData() {
      // Clear both quiz history and mastery data
      await this.clearQuizHistory()
      await this.resetMasteryData()
   },

   async exportData() {
      try {
         messageCenter.addInfo('Exporting data...');
         const accountId = stateMgr.account.id;
         // Get selected export options
         const decksChecked = document.getElementById('export-decks')?.checked;
         const quizChecked = document.getElementById('export-quiz-history')?.checked;
         const masteryChecked = document.getElementById('export-mastery-data')?.checked;
         const settingsChecked = document.getElementById('export-settings')?.checked;

         const exportData = {
            exportDate: new Date().toISOString(),
            accountName: stateMgr.account.name
         };
         if (decksChecked) {
            exportData.decks = stateMgr.decks ? stateMgr.decks.map(deck => ({
               deckId: deck.deckId,
               title: deck.title,
               cards: deck.cards
            })) : [];
         }
         if (quizChecked) {
            exportData.quizHistory = await dbCtx.quiz.allForAccount(accountId);
            exportData.questionAnswers = await dbCtx.questionAnswer.allForAccount(accountId);
         }
         if (masteryChecked) {
            exportData.masteryData = stateMgr.decks ? stateMgr.decks.map(deck => ({
               deckId: deck.deckId,
               deckTitle: deck.title,
               masteredCardIds: deck.masteredCardIds
            })) : [];
         }
         if (settingsChecked) {
            exportData.settings = stateMgr.account.settings;
         }

         // Create and download file
         const dataStr = JSON.stringify(exportData, null, 2);
         const dataBlob = new Blob([dataStr], { type: 'application/json' });

         const link = document.createElement('a');
         link.href = URL.createObjectURL(dataBlob);
         link.download = `flashcards-data-${stateMgr.account.name}-${new Date().toISOString().split('T')[0]}.json`;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);

         messageCenter.addInfo('Export complete! Your selected data has been downloaded.');
      } catch (error) {
         console.error('Error exporting data:', error);
         messageCenter.addError('Failed to export data. Please try again.');
      }
   },

   async handleSelectedDecksAction(actionType) {
      // Show deck selection modal
      const selectedDeckIds = await this.showDeckSelectionModal(actionType)
      console.log('Selected deck IDs:', selectedDeckIds)
      if (!selectedDeckIds || selectedDeckIds.length === 0) {
         console.log('No decks selected or user cancelled.')
         return // User cancelled or selected nothing
      }

      // Get deck names for confirmation
      const selectedDeckNames = stateMgr.decks
         .filter(deck => selectedDeckIds.includes(deck.deckId))
         .map(deck => deck.title)
      console.log('Selected deck names:', selectedDeckNames)

      // Confirmation based on action type
      let confirmed = false
      switch (actionType) {
         case 'clear-quiz-history':
            confirmed = await this.confirmDataAction(
               'Clear Quiz History for Selected Decks',
               `This will permanently delete quiz history and statistics for the following decks:\n\n${selectedDeckNames.join('\n')}\n\nYour mastery progress will be preserved.`
            )
            if (confirmed) {
               console.log('Confirmed clear quiz history for decks:', selectedDeckIds)
               await this.clearQuizHistoryForDecks(selectedDeckIds)
               alert(`Quiz history has been cleared for ${selectedDeckNames.length} deck(s).`)
            }
            break

         case 'reset-mastery-data':
            confirmed = await this.confirmDataAction(
               'Reset Mastery Progress for Selected Decks',
               `This will completely clear mastery progress and delete learning history for mastered cards in the following decks:\n\n${selectedDeckNames.join('\n')}\n\nThis action cannot be undone.`
            )
            if (confirmed) {
               await this.resetMasteryDataForDecks(selectedDeckIds)
               alert(`Mastery progress has been reset for ${selectedDeckNames.length} deck(s).`)
            }
            break

         case 'reset-all-data':
            confirmed = await this.confirmDataAction(
               'Reset All Learning Data for Selected Decks',
               `This will delete ALL quiz history AND mastery progress for the following decks:\n\n${selectedDeckNames.join('\n')}\n\nThis cannot be undone!`,
               true
            )
            if (confirmed) {
               await this.resetAllDataForDecks(selectedDeckIds)
               alert(`All learning data has been reset for ${selectedDeckNames.length} deck(s).`)
            }
            break
      }
   },

   async showDeckSelectionModal(actionType) {
      return new Promise((resolve) => {
         // Create modal background
         const modalBg = document.createElement('div')
         modalBg.className = 'deck-selection-modal-bg'
         modalBg.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
         `

         // Create modal content
         const modal = document.createElement('div')
         modal.className = 'deck-selection-modal'
         modal.style.cssText = `
            background: rgb(30, 35, 40);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 2rem;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            color: #ddd;
         `

         // Modal title
         const title = document.createElement('h2')
         title.textContent = 'Select Decks'
         title.style.cssText = 'margin: 0 0 1rem 0; color: #fff;'
         modal.appendChild(title)

         // Description
         const description = document.createElement('p')
         const actionLabels = {
            'clear-quiz-history': 'clear quiz history for',
            'reset-mastery-data': 'reset mastery progress for',
            'reset-all-data': 'reset all learning data for'
         }
         description.textContent = `Choose which decks you want to ${actionLabels[actionType]}:`
         description.style.cssText = 'margin: 0 0 1rem 0; color: rgba(255, 255, 255, 0.8);'
         modal.appendChild(description)

         // Selection controls (moved above the list)
         const selectionControls = document.createElement('div')
         selectionControls.style.cssText = 'margin-bottom: 1rem; display: flex; gap: 0.5rem;'

         const selectAllBtn = document.createElement('button')
         selectAllBtn.textContent = 'Select All'
         selectAllBtn.style.cssText = 'padding: 0.25rem 0.5rem; font-size: 0.8rem; background: rgba(255, 255, 255, 0.1); color: #ddd; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; cursor: pointer;'
         selectAllBtn.addEventListener('click', () => {
            const checkboxes = deckList.querySelectorAll('input[type="checkbox"]')
            selectedDeckIds.clear() // Clear first to avoid duplicates
            checkboxes.forEach(cb => {
               cb.checked = true
               const deckId = cb.id.replace('deck-', '')
               selectedDeckIds.add(deckId)
            })
            updateButtons()
         })

         const selectNoneBtn = document.createElement('button')
         selectNoneBtn.textContent = 'Select None'
         selectNoneBtn.style.cssText = 'padding: 0.25rem 0.5rem; font-size: 0.8rem; background: rgba(255, 255, 255, 0.1); color: #ddd; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; cursor: pointer;'
         selectNoneBtn.addEventListener('click', () => {
            const checkboxes = deckList.querySelectorAll('input[type="checkbox"]')
            checkboxes.forEach(cb => {
               cb.checked = false
            })
            selectedDeckIds.clear()
            updateButtons()
         })

         selectionControls.appendChild(selectAllBtn)
         selectionControls.appendChild(selectNoneBtn)
         modal.appendChild(selectionControls)

         // Deck selection list
         const deckList = document.createElement('div')
         deckList.className = 'deck-selection-list'
         deckList.style.cssText = 'margin-bottom: 2rem; max-height: 300px; overflow-y: auto;'

         const selectedDeckIds = new Set()

         // Add deck checkboxes
         stateMgr.decks.forEach(deck => {
            const deckItem = document.createElement('div')
            deckItem.style.cssText = 'margin-bottom: 0.5rem; display: flex; align-items: center;'

            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.id = `deck-${deck.deckId}`
            checkbox.style.cssText = 'margin-right: 0.75rem;'
            checkbox.addEventListener('change', (e) => {
               const deckId = e.target.id.replace('deck-', '')
               if (e.target.checked) {
                  selectedDeckIds.add(deckId)
               } else {
                  selectedDeckIds.delete(deckId)
               }
               updateButtons()
            })

            const label = document.createElement('label')
            label.htmlFor = `deck-${deck.deckId}`
            label.textContent = deck.title
            label.style.cssText = 'cursor: pointer; flex: 1;'

            deckItem.appendChild(checkbox)
            deckItem.appendChild(label)
            deckList.appendChild(deckItem)
         })

         modal.appendChild(deckList)

         // Action buttons
         const buttonContainer = document.createElement('div')
         buttonContainer.style.cssText = 'display: flex; gap: 1rem; justify-content: flex-end;'

         const confirmBtn = document.createElement('button')
         confirmBtn.textContent = 'Continue'
         confirmBtn.style.cssText = 'padding: 0.5rem 1rem; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; opacity: 0.5;'
         confirmBtn.disabled = true
         confirmBtn.addEventListener('click', () => {
            document.body.removeChild(modalBg)
            resolve(Array.from(selectedDeckIds))
         })

         const cancelBtn = document.createElement('button')
         cancelBtn.textContent = 'Cancel'
         cancelBtn.style.cssText = 'padding: 0.5rem 1rem; background: rgba(255, 255, 255, 0.1); color: #ddd; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; cursor: pointer;'
         cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modalBg)
            resolve(null)
         })

         function updateButtons() {
            confirmBtn.disabled = selectedDeckIds.size === 0
            confirmBtn.style.opacity = selectedDeckIds.size === 0 ? '0.5' : '1'
            confirmBtn.style.cursor = selectedDeckIds.size === 0 ? 'not-allowed' : 'pointer'
         }

         buttonContainer.appendChild(cancelBtn)
         buttonContainer.appendChild(confirmBtn)
         modal.appendChild(buttonContainer)

         // Close modal on background click
         modalBg.addEventListener('click', (e) => {
            if (e.target === modalBg) {
               document.body.removeChild(modalBg)
               resolve(null)
            }
         })

         modalBg.appendChild(modal)
         document.body.appendChild(modalBg)
      })
   },

   async clearQuizHistoryForDecks(deckIds) {
      const accountId = stateMgr.account.id
      console.log('Clearing quiz history for decks:', deckIds)
      // Get all cards for the selected decks
      const allCards = []
      for (let deckId of deckIds) {
         const cards = await dbCtx.card.byDeckId(deckId)
         allCards.push(...cards)
      }
      const cardIdsToDelete = new Set(allCards.map(card => card.id))
      console.log('Card IDs for selected decks:', Array.from(cardIdsToDelete))
      // Get all quizzes for this account
      const allQuizzes = await dbCtx.quiz.allForAccount(accountId)
      // Get all answers for this account
      const allAnswers = await dbCtx.questionAnswer.allForAccount(accountId)
      for (let quiz of allQuizzes) {
         // Find answers for this quiz and selected deck's cards
         const quizAnswersToDelete = allAnswers.filter(answer => answer.quizId === quiz.id && cardIdsToDelete.has(answer.cardId))
         for (let answer of quizAnswersToDelete) {
            await dbCtx.questionAnswer.delete(answer.id)
         }
         // Remove cardIds and deckIds from quiz
         quiz.allCardIds = quiz.allCardIds.filter(cardId => !cardIdsToDelete.has(cardId))
         quiz.allDeckIds = quiz.allDeckIds.filter(deckId => !deckIds.includes(deckId))
         // Check if any answers remain for this quiz
         const remainingAnswers = allAnswers.filter(answer => answer.quizId === quiz.id && !cardIdsToDelete.has(answer.cardId))
         if (quiz.allCardIds.length === 0 || remainingAnswers.length === 0) {
            // No cards/answers left, delete quiz
            await dbCtx.quiz.delete(quiz.id)
         } else {
            // Update quiz to reflect removed cards/decks
            await dbCtx.quiz.update(quiz)
         }
      }
      // Also delete any standalone question answers for these cards (not tied to specific quizzes)
      const remainingAnswers = await dbCtx.questionAnswer.allForAccount(accountId)
      const cardAnswers = remainingAnswers.filter(answer => 
         cardIdsToDelete.has(answer.cardId) && 
         !allQuizzes.some(quiz => quiz.id === answer.quizId)
      )
      console.log('Standalone card answers to delete:', cardAnswers.map(a => a.id))
      for (let answer of cardAnswers) {
         await dbCtx.questionAnswer.delete(answer.id)
      }
      // Reload stats data if on stats page
      if (stateMgr.account?.state?.currentPage === pages.STATS) {
         await stateMgr.loadStatsPage()
         console.log('Stats page reloaded after clearing selected decks quiz history.')
      }
   },

   async resetMasteryDataForDecks(deckIds) {
      const accountId = stateMgr.account.id
      
      // Get AccountDeck objects for selected decks
      const accountDecks = await dbCtx.accountDeck.all(accountId)
      const selectedAccountDecks = accountDecks.filter(ad => deckIds.includes(ad.deckId))
      
      // Clear mastery data for selected decks only
      for (let accountDeck of selectedAccountDecks) {
         const masteredCardIds = accountDeck.masteredCardIds || []
         
         // Delete QuestionAnswers for all mastered cards
         for (let cardId of masteredCardIds) {
            await dbCtx.questionAnswer.deleteByCardId(accountId, cardId)
         }
         
         // Clear mastered cards list and update in database
         accountDeck.masteredCardIds = []
         await dbCtx.accountDeck.update(accountDeck)
         
         // Update state manager cache if it exists
         if (stateMgr.decks) {
            const cacheIndex = stateMgr.decks.findIndex(d => d.deckId === accountDeck.deckId)
            if (cacheIndex !== -1) {
               stateMgr.decks[cacheIndex].masteredCardIds = []
            }
         }
      }
      
      // Reload stats data if on stats page
      if (stateMgr.account?.state?.currentPage === pages.STATS) {
         await stateMgr.loadStatsPage()
      }
   },

   async resetAllDataForDecks(deckIds) {
      // Clear both quiz history and mastery data for selected decks
      await this.clearQuizHistoryForDecks(deckIds)
      await this.resetMasteryDataForDecks(deckIds)
   },

   onSettingChange(settingKey, value) {
      // Update the account settings
      const numValue = parseInt(value)
      if (!isNaN(numValue)) {
         stateMgr.account.settings[settingKey] = numValue
      }
      
      // Update dependent validations and descriptions
      if (settingKey === 'reviewCycleDays') {
         this.updateMasteryWindowValidation()
      } else if (settingKey === 'masteryStreakCount') {
         this.updateMasteryWindowDescription()
      }
      
      // Check if we have pending changes
      this.pendingChanges = JSON.stringify(stateMgr.account.settings) !== JSON.stringify(this.originalSettings)
      this.updateSaveButtonState()
   },

   updateSaveButtonState() {
      const saveButton = document.getElementById('save-settings-btn')
      if (saveButton) {
         saveButton.disabled = !this.pendingChanges
      }
   },

   updateMasteryWindowValidation() {
      const masteryWindowInput = document.getElementById('setting-masteryWindowDays')
      if (masteryWindowInput) {
         masteryWindowInput.max = stateMgr.account.settings.reviewCycleDays
         // If current value exceeds new max, adjust it
         if (parseInt(masteryWindowInput.value) > stateMgr.account.settings.reviewCycleDays) {
            masteryWindowInput.value = stateMgr.account.settings.reviewCycleDays
            this.onSettingChange('masteryWindowDays', masteryWindowInput.value)
         }
      }
   },

   updateMasteryWindowDescription() {
      const masteryWindowItem = document.getElementById('setting-masteryWindowDays')?.closest('.setting-item')
      if (masteryWindowItem) {
         const description = masteryWindowItem.querySelector('.setting-description')
         if (description) {
            description.innerText = 'Time span for achieving mastery. Answer a question correctly ' + 
               stateMgr.account.settings.masteryStreakCount + ' consecutive times within this timeframe.'
         }
      }
   },

   async saveSettings() {
      try {
         await dbCtx.account.update(stateMgr.account)
         this.originalSettings = JSON.parse(JSON.stringify(stateMgr.account.settings))
         this.pendingChanges = false
         this.updateSaveButtonState()
         
         messageCenter.addInfo('Settings saved successfully!')
      } catch (error) {
         console.error('Error saving settings:', error)
         messageCenter.addError('Failed to save settings.')
      }
   },

   resetToDefaults() {
      app.confirm(async () => {
         // Reset to default values
         stateMgr.account.settings.defaultQuestionCount = 10
         stateMgr.account.settings.statsHistoryAgeInDays = 90
         stateMgr.account.settings.reviewCycleDays = 21
         stateMgr.account.settings.masteryStreakCount = 3
         stateMgr.account.settings.masteryWindowDays = 21
         
         // Update the UI
         this.updateInputValues()
         this.pendingChanges = true
         this.updateSaveButtonState()
         
         messageCenter.addInfo('Settings reset to defaults. Click "Save Settings" to apply changes.')
      }, 'Reset all settings to their default values? This will undo any customizations you have made.')
   },

   updateInputValues() {
      const settings = stateMgr.account.settings
      
      document.getElementById('setting-defaultQuestionCount').value = settings.defaultQuestionCount
      document.getElementById('setting-statsHistoryAgeInDays').value = settings.statsHistoryAgeInDays
      document.getElementById('setting-reviewCycleDays').value = settings.reviewCycleDays
      document.getElementById('setting-masteryStreakCount').value = settings.masteryStreakCount
      document.getElementById('setting-masteryWindowDays').value = settings.masteryWindowDays
   }
}

navigation = {}
