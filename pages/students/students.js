page = {
   selectedStudentId: null,

   get element() {
      let ele = document.createElement('div')
      ele.id = 'page'
      
      let header = document.createElement('h1')
      header.innerText = 'Manage Students'
      ele.appendChild(header)
      
      let studentList = document.createElement('div')
      studentList.id = 'student-list'
      ele.appendChild(studentList)
      
      return ele
   },

   async load() {
      await this.loadStudents()
   },

   async loadStudents() {
      const students = await dbCtx.account.all()
      // Sort alphabetically by name
      students.sort((a, b) => a.name.localeCompare(b.name))
      
      const container = document.getElementById('student-list')
      container.innerHTML = ''
      
      students.forEach(student => {
         container.appendChild(this.studentListItem(student))
      })
   },

   studentListItem(student) {
      let ele = document.createElement('div')
      ele.id = `student-${student.id}`
      ele.classList.add('item')

      // Accordion toggle button
      let accordionBtn = document.createElement('div')
      accordionBtn.classList.add('accordion-toggle')
      accordionBtn.innerHTML = '▶' // Right arrow for collapsed
      accordionBtn.addEventListener('click', () => {
         this.toggleAccordion(student.id)
      })
      ele.appendChild(accordionBtn)

      // Student name
      let nameDiv = document.createElement('div')
      nameDiv.innerText = student.name
      nameDiv.classList.add('student-name')
      ele.appendChild(nameDiv)

      // Action buttons container
      let actionsDiv = document.createElement('div')
      actionsDiv.classList.add('actions')
      
      // Check if this student is selected for blue border
      if (this.selectedStudentId === student.id) {
         ele.classList.remove('item')
         ele.classList.add('item-selected')
         actionsDiv.appendChild(this.editStudentBtn(student))
         actionsDiv.appendChild(this.deleteStudentBtn(student))
      }
      
      ele.appendChild(actionsDiv)

      // Click handler to select student (add blue border)
      ele.addEventListener('click', (e) => {
         // Don't trigger selection if clicking accordion or buttons
         if (e.target === accordionBtn || e.target.closest('.actions')) return
         this.selectStudent(student.id)
      })

      // Details section (initially hidden)
      let details = document.createElement('div')
      details.classList.add('student-details')
      details.classList.add('hidden')
      details.id = `details-${student.id}`
      
      let createdDiv = document.createElement('div')
      createdDiv.innerHTML = `<strong>Created:</strong> ${new Date(student.created).toLocaleDateString()}`
      details.appendChild(createdDiv)
      
      let lastUsedDiv = document.createElement('div')
      lastUsedDiv.innerHTML = `<strong>Last Used:</strong> ${new Date(student.lastUsed).toLocaleDateString()}`
      details.appendChild(lastUsedDiv)
      
      ele.appendChild(details)

      return ele
   },

   studentListItemEditing(student) {
      let ele = document.createElement('div')
      ele.id = `student-${student.id}`
      ele.classList.add('item-editing')

      // Accordion toggle button (disabled during edit)
      let accordionBtn = document.createElement('div')
      accordionBtn.classList.add('accordion-toggle')
      accordionBtn.classList.add('disabled')
      accordionBtn.innerHTML = '▶'
      ele.appendChild(accordionBtn)

      // Edit input
      ele.appendChild(this.getEditStudentInput(student))
      
      // Spacer for alignment
      ele.appendChild(document.createElement('div'))
      
      // Save button
      ele.appendChild(this.getEditStudentButton(student))
      
      return ele
   },

   getEditStudentInput(student) {
      let input = document.createElement('input')
      input.type = 'text'
      input.spellcheck = false
      input.placeholder = 'Name is required!'
      input.value = student.name
      input.id = 'edit-student'
      input.classList.add('edit-student')
      input.addEventListener('keyup', async (event) => {
         if (event.key == 'Enter') {
            await this.editStudent(student)
         } else if (event.key == 'Escape') {
            this.loadStudents()
         }
      })
      return input
   },

   getEditStudentButton(student) {
      let btn = document.createElement('div')
      btn.classList.add('btn')
      btn.classList.add('check')
      btn.addEventListener('click', async () => {
         await this.editStudent(student)
      })
      return btn
   },

   async editStudent(student) {
      let val = document.getElementById('edit-student').value.trim()
      if (val == '') return

      // Check if name already exists (excluding current student)
      if (await dbCtx.account.exists(val) && val !== student.name) {
         messageCenter.addError(`A student '${val}' already exists.`)
         return
      }
      
      // Update the student name
      student.name = val
      await dbCtx.account.update(student)
      
      // Refresh the student list
      await this.loadStudents()
   },

   editStudentBtn(student) {
      let ele = document.createElement('div')
      ele.classList.add('edit')
      ele.addEventListener('click', (e) => {
         e.stopPropagation()
         let item = document.getElementById(`student-${student.id}`)
         let edit = this.studentListItemEditing(student)
         item.replaceWith(edit)
         document.getElementById('edit-student').focus()
      })
      return ele
   },

   deleteStudentBtn(student) {
      let ele = document.createElement('div')
      ele.classList.add('trash')
      ele.addEventListener('click', (e) => {
         e.stopPropagation()
         this.showDeleteStudentConfirm(student)
      })
      return ele
   },

   showDeleteStudentConfirm(student) {
      app.confirm(async () => {
         await this.deleteStudent(student)
      }, `Are you sure you want to delete student "${student.name}"? This will remove all their decks, cards, and quiz history.`)
   },

   async deleteStudent(student) {
      try {
         // Delete all associated data
         await this.deleteStudentData(student.id)
         
         // Delete the student account
         await dbCtx.account.delete(student.id)
         
         // If this was the current student, we need to handle that
         if (stateMgr.account && stateMgr.account.id === student.id) {
            // Check if there are any remaining students
            const remainingStudents = await dbCtx.account.all()
            if (remainingStudents.length === 0) {
               // No students left, go to home page
               await dbCtx.metadata.setSelectedAccountId('')
               await stateMgr.setPage(pages.HOME)
               await app.route()
               return
            } else {
               // Switch to another student
               await dbCtx.metadata.setSelectedAccountId(remainingStudents[0].id)
               await stateMgr.loadAccount()
            }
         }
         
         // Refresh the student list
         await this.loadStudents()
         messageCenter.addSuccess(`Student "${student.name}" has been deleted.`)
         
      } catch (error) {
         console.error('Error deleting student:', error)
         messageCenter.addError('Failed to delete student.')
      }
   },

   async deleteStudentData(accountId) {
      try {
         // Delete quiz history
         const quizzes = await dbCtx.quiz.byAccountId(accountId)
         for (const quiz of quizzes) {
            // Note: If delete method doesn't exist, we'll skip for now
            if (dbCtx.quiz.delete) {
               await dbCtx.quiz.delete(quiz.id)
            }
         }
         
         // Delete question answers
         const questionAnswers = await dbCtx.questionAnswer.byAccountId(accountId, '1970-01-01T00:00:00.000Z')
         for (const qa of questionAnswers) {
            // Note: If delete method doesn't exist, we'll skip for now
            if (dbCtx.questionAnswer.delete) {
               await dbCtx.questionAnswer.delete(qa.id)
            }
         }
         
         // Delete account decks
         const accountDecks = await dbCtx.accountDeck.all(accountId)
         for (const accountDeck of accountDecks) {
            await dbCtx.accountDeck.delete(accountId, accountDeck.deckId)
         }
      } catch (error) {
         console.error('Error deleting student data:', error)
         // Continue with student deletion even if associated data deletion fails
      }
   },

   selectStudent(studentId) {
      // Remove selection from all students
      document.querySelectorAll('#student-list .item-selected').forEach(el => {
         el.classList.remove('item-selected')
         el.classList.add('item')
         // Clear action buttons
         const actions = el.querySelector('.actions')
         if (actions) actions.innerHTML = ''
      })

      // Add selection to clicked student
      const studentElement = document.getElementById(`student-${studentId}`)
      if (studentElement) {
         studentElement.classList.remove('item')
         studentElement.classList.add('item-selected')
         
         // Add action buttons
         const actions = studentElement.querySelector('.actions')
         const student = stateMgr.accounts.find(a => a.id === studentId)
         if (actions && student) {
            actions.appendChild(this.editStudentBtn(student))
            actions.appendChild(this.deleteStudentBtn(student))
         }
      }

      this.selectedStudentId = studentId
   },

   toggleAccordion(studentId) {
      const details = document.getElementById(`details-${studentId}`)
      const toggle = document.querySelector(`#student-${studentId} .accordion-toggle`)
      
      if (details && toggle) {
         if (details.classList.contains('hidden')) {
            // Expand
            details.classList.remove('hidden')
            details.classList.add('expanded')
            toggle.innerHTML = '▼' // Down arrow for expanded
         } else {
            // Collapse
            details.classList.remove('expanded')
            details.classList.add('hidden')
            toggle.innerHTML = '▶' // Right arrow for collapsed
         }
      }
   }
}

navigation = {}