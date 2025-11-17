class App {
   constructor() {
      this.route()
   }

   async route() {
      this.hideModal()
      new SiteHeader().removeMenus()
      await stateMgr.loadSite()
      await this.initSiteHeader()
      await this.loadPage()
      await this.sendActivityLog()
   }F

   async sendActivityLog()
   {
      let id = stateMgr.account?.id ?? 'null'
      let page = stateMgr.account?.state?.currentPage ?? 'null'
      await api.postAppLog(`${id} ~|~ ${page}`)
   }

   async initSiteHeader() {
      let siteHeader = document.getElementById('site-header')
      if (siteHeader)
      {
         siteHeader.remove()
      }
      document.body.appendChild(await new SiteHeader().getElement())
   }

   get title()
   {
      let ele = document.createElement('title')
      ele.innerHTML = "Ignyos"
      return ele
   }

   async loadPage()
   {
      try {
         this.removeScripts()
         await this.loadScripts(this.resources)
         .then(async (page) => {
            let pageEle = document.getElementById('page')
            if (pageEle) pageEle.remove()
            document.body.appendChild(page.element)
            await page.load()
         })
      } catch(err) {
         console.error(err)
         messageCenter.addError("Error loading page.")
      }
   }

   removeScripts() {
      let css = document.getElementById('css')
      if (css) css.remove()
      let script = document.getElementById('script')
      if (script) script.remove()
   }

   async loadScripts(resource)
   {
      return new Promise((resolve, reject) => {
         try {
            if(resource.href) {
               let ele = document.createElement('link')
               ele.id = 'css'
               ele.setAttribute('rel', 'stylesheet')
               ele.setAttribute('href',`${resource.href}?v=${resource.version}`)
               document.head.appendChild(ele)
            }

            if(resource.src) {
               let scr = document.createElement('script')
               scr.id = 'script'
               scr.setAttribute('async', true)
               scr.setAttribute('type','text/javascript')
               scr.setAttribute('src',`${resource.src}?v=${resource.version}`)
               scr.addEventListener('load',() => {
                  resolve(page)
               })
               document.head.appendChild(scr)
            }
         } catch (error) {
            reject(error)
         }
      })
   }

   get resources()
   {
      const pg = stateMgr.account?.state?.currentPage ?? pages.HOME
      return {
         src: `./pages/${pg}/${pg}.js`,
         href: `./pages/${pg}/${pg}.css`,
         version: this.pageVersion[pg]
      }
   }

   get pageVersion()
   {
      const result = {}
      result[pages.HOME] = 0;
      result[pages.FLASH_CARDS] = 0;
      result[pages.QUIZ] = 0;
      result[pages.STATS] = 0;
      return result
   }

   //#region Modals

   //#region Confirm Modal

   confirm(okFn, message = 'Are You Sure?') {
      this.hideModal()
      let bg = document.createElement('div')
      bg.id = 'modal-bg'
      bg.addEventListener('click', this.hideModal)
      bg.appendChild(this.getConfirmModal(okFn, message))
      document.body.appendChild(bg)
   }

   getConfirmModal(okFn, message) {
      let msg = document.createElement('div')
      msg.classList.add('msg')
      msg.innerText = message

      let ele = document.createElement('div')
      ele.classList.add('modal')
      ele.classList.add('confirm')
      ele.appendChild(msg)
      const ctrls = document.createElement('div')
      ctrls.appendChild(this.getOkayBtn(okFn))
      ctrls.appendChild(this.getCancelBtn())
      ctrls.classList.add('ctrls')
      ele.appendChild(ctrls)
      ele.addEventListener('click', (event) => { event.stopPropagation() })
      return ele
   }

   input(okFn, message = 'Enter Value', addtlElement = null) {
      this.getModal(okFn, message, 'input', addtlElement)
   }

   getModal(okFn, message, type, addtlElement = null) {
      this.hideModal()
      let ele = document.createElement('div')
      ele.classList.add('modal')
      if (addtlElement) ele.appendChild(addtlElement)

      let main;
      switch (type) {
         case 'confirm':
            main = document.createElement('div')
            main.classList.add('msg')
            main.innerText = message
            ele.classList.add('confirm')
            break
         case 'input':
            main = document.createElement('input')
            main.id = 'modal-input'
            main.type = 'text'
            main.placeholder = message
            ele.classList.add('input')
            break
         default:
            break
      }

      ele.appendChild(main)
      const ctrls = document.createElement('div')
      ctrls.appendChild(this.getOkayBtn(() => { okFn(main.value); }))
      ctrls.appendChild(this.getCancelBtn())
      ctrls.classList.add('ctrls')
      ele.appendChild(ctrls)
      ele.addEventListener('click', (event) => { event.stopPropagation() })
      
      let bg = document.createElement('div')
      bg.id = 'modal-bg'
      bg.addEventListener('click', this.hideModal)
      bg.appendChild(ele)
      document.body.appendChild(bg)
   }

   getOkayBtn(okFn) {
      let ok = document.createElement('div')
      ok.classList.add('modal-btn')
      ok.classList.add('ok')
      ok.innerText = 'OK'
      const fn = () => { okFn(); this.hideModal(); }
      ok.addEventListener('click', fn)
      return ok
   }

   getCancelBtn() {
      let cancel = document.createElement('div')
      cancel.classList.add('modal-btn')
      cancel.classList.add('cancel')
      cancel.innerText = 'CANCEL'
      cancel.addEventListener('click', this.hideModal)
      return cancel
   }

   //#endregion

   //#region Form Modal

   formModal(bgClass, form) {
      this.hideModal()

      let bg = document.createElement('div')
      bg.id = 'modal-bg'
      bg.classList.add(bgClass)
      bg.appendChild(form)
      document.body.appendChild(bg)
   }

   //#endregion
   
   hideModal() {
      let ele = document.getElementById('modal-bg')
      if (ele) ele.remove()
   }

   //#endregion
}

class SiteHeader {
   constructor() { }

   async getElement()
   {
      let e = document.createElement('div')
      e.id = 'site-header'
      e.appendChild(await this.getMenuButton())
      e.appendChild(document.createElement('div'))
      e.appendChild(this.acctName)
      return e
   }
   
   async getMenuButton()
   {
      let e = document.createElement('div')
      e.id="menu-button"
      e.innerText = "|||"
      e.addEventListener('click', async () => {
         let menu = document.getElementById('main-menu');
         if (menu && !menu.classList.contains('hidden')) {
            this.removeMenus()
         } else {
            this.removeMenus()
            await this.displayMenu()
         }
      })
      return e
   }

   removeMenus() {
      let menu = document.getElementById('main-menu');
      if (menu) { menu.remove() }
      let subMenu = document.querySelector('.sub-menu')
      if (subMenu) { subMenu.remove() }
   }

   async displayMenu() {
      let menu = document.getElementById('main-menu');
      if (menu) { menu.remove() }
      menu = await this.getMainMenu();
      document.body.appendChild(menu);
      menu.classList.toggle('hidden');
      document.addEventListener('click', 
         this.hideMenuOnClickOutside.bind(this)
      );
    }

    hideMenuOnClickOutside(event) {
        const menu = document.getElementById('main-menu');
        const button = document.getElementById('menu-button');
        if (menu && !menu.contains(event.target) && !button.contains(event.target)) {
            menu.classList.add('hidden');
            document.removeEventListener('click', this.hideMenuOnClickOutside.bind(this));
        }
    }

   async getMainMenu() {
      let e = document.createElement('div')
      e.id = 'main-menu'
      e.classList.add('hidden')
      e.classList.add('menu')
      let ul = document.createElement('ul')
      
      let enabled = stateMgr.account?.state?.currentPage != pages.QUIZ && stateMgr.account?.state?.currentPage != pages.HOME

      let homeBtn = this.getMenuItem("Home", false, enabled)
      if (enabled) this.addPageSwitcher(homeBtn, pages.HOME)
      ul.appendChild(homeBtn)

      ul.appendChild(document.createElement('hr'))
      
      enabled = stateMgr.account?.state?.currentPage != pages.QUIZ
      let newAcct = this.getMenuItem("New Student", false, enabled)
      newAcct.addEventListener('click', () => {
         new SiteHeader().createNewStudent()
      })
      ul.appendChild(newAcct)

      enabled = stateMgr.accounts?.length > 1 && stateMgr.account?.state?.currentPage != pages.QUIZ
      let acctSubMenu = false
      if (enabled) acctSubMenu = await this.getAcctSubMenu()
      ul.appendChild(this.getMenuItem("Switch Student" , acctSubMenu, enabled))

      ul.appendChild(document.createElement('hr'))
      
      enabled = this.doEnableQuizBtn()
      let quizMe = this.getMenuItem("Quiz Me!", false, enabled)
      if (enabled) this.addPageSwitcher(quizMe, pages.QUIZ, () => stateMgr.createNewQuiz())
      ul.appendChild(quizMe)

      enabled = stateMgr.account && stateMgr.account?.state?.currentPage != pages.QUIZ && stateMgr.account?.state?.currentPage != pages.STATS
      let statsBtn = this.getMenuItem("Stats", false, enabled)
      if (enabled) this.addPageSwitcher(statsBtn, pages.STATS)
      ul.appendChild(statsBtn)

      enabled = stateMgr.account && stateMgr.account?.state?.currentPage != pages.QUIZ && stateMgr.account?.state?.currentPage != pages.FLASH_CARDS
      let fcBtn = this.getMenuItem("Flash Cards", false, enabled)
      if (enabled) this.addPageSwitcher(fcBtn, pages.FLASH_CARDS)
      ul.appendChild(fcBtn)

      e.appendChild(ul)
      return e
   }

   addPageSwitcher(li, page, adtnlFn = null) {
      li.addEventListener('click', async () => {
         if (adtnlFn) await adtnlFn()
         await stateMgr.setPage(page)
         let pgEle = document.getElementById('page')
         if (pgEle) pgEle.innerHTML = null
         await app.route()
      })
   }
   
   doEnableQuizBtn() {
      const isQuizPage = stateMgr.account?.state.currentPage == pages.QUIZ
      const hasCards = stateMgr.cards && stateMgr.cards.length > 0
      return !isQuizPage && hasCards
   }

   getMenuItem(txt, submenu = false, enabled = true) {
      let li = document.createElement('li')
      let span = document.createElement('span')
      span.innerText = txt
      li.appendChild(span)
      let arrowDiv = document.createElement('div')
      li.appendChild(arrowDiv)
      if (submenu && enabled) {
            arrowDiv.classList.add('chev-r')
            document.body.appendChild(submenu)
            li.addEventListener('click', (event) => {
               event.stopPropagation()
               const rect = li.getBoundingClientRect()
               submenu.style.top = `${rect.top - 7}px`
               submenu.style.left = `${rect.right + 3}px`
               submenu.classList.add('menu')
               submenu.classList.toggle('hidden')
               submenu.addEventListener('click', (event) => {
                  submenu.classList.add('hidden')
               })
               document.addEventListener('click', this.hideSubMenuOnClickOutside.bind(this, submenu));
         })
      }
      if (!enabled) {
         li.classList.add('disabled')
      }
      return li
   }

   hideSubMenuOnClickOutside(submenu, event) {
        if (!submenu.contains(event.target)) {
            submenu.classList.add('hidden');
            document.removeEventListener('click', this.hideSubMenuOnClickOutside.bind(this, submenu));
        }
   }

   hideElementOnClickOutside(element, event) {
      if (!element.contains(event.target)) {
            element.classList.add('hidden');
            document.removeEventListener('click', this.hideElementOnClickOutside.bind(this, element));
      }
   }

   async getAcctSubMenu() {
      let subMenu = document.createElement('div')
      subMenu.classList.add('sub-menu')
      subMenu.classList.add('hidden')
      let ul = document.createElement('ul')

      let accounts = await dbCtx.account.all()
      accounts.sort((a,b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      accounts.forEach (acct => {
         let li = this.getAcctListItem(acct.name)
         li.addEventListener('click', async () => {
            await this.switchToAccount(acct.id)
         })
         ul.appendChild(li)
      })
      subMenu.appendChild(ul)
      return subMenu
   }

   getAcctListItem(txt) {
      let li = document.createElement('li');
      let span = document.createElement('span');
      span.innerText = txt;
      li.appendChild(span);
      return li;
   }

   createNewStudent(){
      app.input(async (val) => { 
         let n = val.trim()
         if (n.length > 0) {
            if (await dbCtx.account.exists(n)) {
               messageCenter.addError(`A student '${n}' already exists.`)
            } else {
               const newAccount = new Account({ name: n });
               await dbCtx.account.add(newAccount)
               await dbCtx.metadata.setSelectedAccountId(newAccount.id)
               app.route()
            }
         } else {
            messageCenter.addError('Name cannot be blank.')
         }
      }, "Student's Name...", this.newStudentNotice);
      document.getElementById('main-menu')?.remove()
      document.getElementById('modal-input').focus()
   }

   get newStudentNotice() {
      let ele = document.createElement('div')
      ele.classList.add('msg')
      let title = document.createElement('h2')
      title.innerText = "Enter your name."
      ele.appendChild(title)
      let msg = document.createElement('p')
      msg.innerText = "We do not collect any personal information."
      msg.style.maxWidth = '21em'
      msg.style.margin = '1em auto'
      ele.appendChild(msg)
      return ele
   }

   async switchToAccount(id) {
      await dbCtx.metadata.setSelectedAccountId(id)
      let pgEle = document.getElementById('page')
      if (pgEle) pgEle.innerHTML = null
      app.route()
   }

   get acctName()
   {
      let div = document.createElement('div')
      div.classList.add('acct-name')
      div.innerText = stateMgr.account?.name ?? ''
      return div
   }
}

messageCenter = {
   get element() {
      let ele = document.getElementById('msg-cntr')
      if (!ele) {
         ele = document.createElement('div')
         ele.id = ('msg-cntr')
         document.body.appendChild(ele)
      }
      return ele
   },
   addError(msg) {
      this.addItem(msg,'err')
   },
   addInfo(msg) {
      this.addItem(msg,'nfo')
   },
   addItem(msg,cls) {
      let ele = document.createElement('div')
      ele.classList.add(cls)
      ele.innerText = msg
      setTimeout(()=>{ele.remove()},3000)
      this.element.appendChild(ele)
   }
}

