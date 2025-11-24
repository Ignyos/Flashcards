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
      
      // Button container
      let buttonContainer = document.createElement('div')
      buttonContainer.className = 'button-container'
      
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
      
      settingsContainer.appendChild(buttonContainer)
      
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
               'Number of consecutive correct answers needed before a question is considered mastered and asked less frequently.',
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
               'Number of days of quiz history to include in statistics and performance calculations. Older data will be ignored.',
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
            content.appendChild(this.createActionItem(
               'Clear Quiz History',
               'Delete all completed quizzes and their results. This will remove all quiz data from your statistics but will not affect mastery progress.',
               'clear-quiz-history',
               'Clear History',
               'destructive'
            ))
            
            // Reset Mastery Data
            content.appendChild(this.createActionItem(
               'Reset Mastery Progress',
               'Clear all mastery progress and delete the learning history for mastered cards. This completely removes mastery records and their associated question answers.',
               'reset-mastery-data',
               'Reset Mastery',
               'destructive'
            ))
            
            // Reset All Data
            content.appendChild(this.createActionItem(
               'Reset All Learning Data',
               'Complete reset: delete all quiz history AND mastery progress. This clears all historical learning data but cards may still be re-detected as mastered based on recent performance within the current Mastery Window when taking new quizzes.',
               'reset-all-data',
               'Reset Everything',
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
            // Export Data
            content.appendChild(this.createActionItem(
               'Export Learning Data',
               'Download your quiz history and mastery progress as a backup file. This allows you to keep a record before resetting or for transfer to another device.',
               'export-data',
               'Export Data',
               'secondary'
            ))
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

   async handleDataAction(actionId) {
      try {
         switch (actionId) {
            case 'clear-quiz-history':
               if (await this.confirmDataAction('Clear Quiz History', 'This will permanently delete all quiz history and statistics. Your mastery progress will be preserved.')) {
                  await this.clearQuizHistory()
                  alert('Quiz history has been cleared successfully.')
               }
               break

            case 'reset-mastery-data':
               if (await this.confirmDataAction('Reset Mastery Progress', 'This will completely clear all mastery progress and delete the learning history for mastered cards. This action cannot be undone.')) {
                  await this.resetMasteryData()
                  alert('Mastery progress has been reset successfully.')
               }
               break

            case 'reset-all-data':
               if (await this.confirmDataAction('Reset All Learning Data', 'This will delete ALL quiz history AND mastery progress. This cannot be undone!', true)) {
                  await this.resetAllData()
                  alert('All learning data has been reset successfully.')
               }
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
      
      // Delete all quizzes for this account
      await dbCtx.quiz.deleteAllForAccount(accountId)
      
      // Delete all question answers for this account  
      await dbCtx.questionAnswer.deleteAllForAccount(accountId)
      
      // Reload stats data if on stats page
      if (stateMgr.account?.state?.currentPage === pages.STATS) {
         await stateMgr.loadStatsPage()
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
         const accountId = stateMgr.account.id
         
         // Gather all data
         const exportData = {
            exportDate: new Date().toISOString(),
            accountName: stateMgr.account.name,
            quizHistory: await dbCtx.quiz.allForAccount(accountId),
            questionAnswers: await dbCtx.questionAnswer.allForAccount(accountId),
            masteryData: stateMgr.decks ? stateMgr.decks.map(deck => ({
               deckId: deck.deckId,
               deckTitle: deck.title,
               masteredCardIds: deck.masteredCardIds
            })) : [],
            settings: stateMgr.account.settings
         }
         
         // Create and download file
         const dataStr = JSON.stringify(exportData, null, 2)
         const dataBlob = new Blob([dataStr], { type: 'application/json' })
         
         const link = document.createElement('a')
         link.href = URL.createObjectURL(dataBlob)
         link.download = `flashcards-data-${stateMgr.account.name}-${new Date().toISOString().split('T')[0]}.json`
         document.body.appendChild(link)
         link.click()
         document.body.removeChild(link)
         
         alert('Learning data has been exported successfully.')
      } catch (error) {
         console.error('Error exporting data:', error)
         alert('Failed to export data. Please try again.')
      }
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
