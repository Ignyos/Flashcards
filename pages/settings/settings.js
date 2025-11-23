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

   createQuizGenerationSection() {
      let section = document.createElement('div')
      section.className = 'settings-section'
      
      // Header
      let header = document.createElement('div')
      header.className = 'settings-section-header'
      
      let title = document.createElement('h2')
      title.className = 'settings-section-title'
      title.innerText = 'Quiz Generation'
      header.appendChild(title)
      
      let description = document.createElement('p')
      description.className = 'settings-section-description'
      description.innerText = 'Control how quizzes are created and which questions are included.'
      header.appendChild(description)
      
      section.appendChild(header)
      
      // Content
      let content = document.createElement('div')
      content.className = 'settings-section-content'
      
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
      
      section.appendChild(content)
      
      return section
   },

   createPerformanceTrackingSection() {
      let section = document.createElement('div')
      section.className = 'settings-section'
      
      // Header
      let header = document.createElement('div')
      header.className = 'settings-section-header'
      
      let title = document.createElement('h2')
      title.className = 'settings-section-title'
      title.innerText = 'Performance Tracking'
      header.appendChild(title)
      
      let description = document.createElement('p')
      description.className = 'settings-section-description'
      description.innerText = 'Configure how your quiz performance and statistics are calculated and displayed.'
      header.appendChild(description)
      
      section.appendChild(header)
      
      // Content
      let content = document.createElement('div')
      content.className = 'settings-section-content'
      
      // Stats History Age
      content.appendChild(this.createSettingItem(
         'Statistics History',
         'Number of days of quiz history to include in statistics and performance calculations. Older data will be ignored.',
         'statsHistoryAgeInDays',
         'number',
         { min: 7, max: 365 },
         'days'
      ))
      
      section.appendChild(content)
      
      return section
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
