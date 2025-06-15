page = {
   get element() {
      let ele = document.createElement('div')
      ele.id = 'page'
      ele.appendChild(this.title)
      ele.appendChild(document.createElement('br'))
      ele.appendChild(document.createElement('br'))
      ele.appendChild(this.tagLine)
      ele.appendChild(document.createElement('br'))
      ele.appendChild(document.createElement('br'))
      ele.appendChild(this.getStarted)
      return ele
   },
   async load() {},
   get title() {
      let ele = document.createElement('div')

      let subtitle = document.createElement('h1')
      subtitle.innerText = "Flash Cards"
      ele.appendChild(subtitle)

      let ignyos = document.createElement('h4')
      ignyos.innerHTML = "<span style='font-size:0.4em;vertical-align:top;top:.5em;position:relative;'>by</span> Ignyos&nbsp;"
      ignyos.style.color = '#898989'
      ele.appendChild(ignyos)

      return ele
   },
   get tagLine() {
      let ele = document.createElement('h3')
      
      let learn = document.createElement('h1')
      learn.innerHTML = "Learning"
      
      ele.appendChild(learn)

      let reinforcement = document.createElement('h5')
      reinforcement.innerHTML = "<span style='font-size:0.4em;vertical-align:top;top:.5em;position:relative;'>by</span>  Reinforcement"
      reinforcement.style.color = '#898989'
      ele.appendChild(reinforcement)
      
      return ele
   },
   get getStarted() {
      let ele = document.createElement('div')
      ele.classList.add('get-started')
      ele.innerText = "Get Started"
      ele.onclick = () => {
         new SiteHeader().createNewStudent()
      }
      return ele
   }
}
