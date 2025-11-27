page = {
   get element() {
      let ele = document.createElement('div')
      ele.id = 'page'
      
      // Sticky header (initially hidden)
      ele.appendChild(this.stickyHeader)
      
      // Main content
      let content = document.createElement('div')
      content.classList.add('main-content')
      
      // Splash section (what we'll observe)
      let splashSection = document.createElement('div')
      splashSection.classList.add('splash-section')
      splashSection.appendChild(this.title)
      splashSection.appendChild(document.createElement('br'))
      splashSection.appendChild(document.createElement('br'))
      splashSection.appendChild(this.tagLine)
      splashSection.appendChild(document.createElement('br'))
      splashSection.appendChild(document.createElement('br'))
      splashSection.appendChild(this.getStarted)
      
      content.appendChild(splashSection)
      content.appendChild(document.createElement('br'))
      content.appendChild(document.createElement('br'))
      content.appendChild(this.featuresSection)
      
      ele.appendChild(content)
      return ele
   },
   async load() {
      // Set up intersection observer for sticky header
      setTimeout(() => {
         const getStartedElement = document.querySelector('.get-started')
         const stickyHeader = document.querySelector('.sticky-header')
         
         if (getStartedElement && stickyHeader) {
            // Ensure sticky header starts hidden
            stickyHeader.classList.remove('visible')
            
            const observer = new IntersectionObserver((entries) => {
               entries.forEach(entry => {
                  // Show sticky header when get-started button is not intersecting (scrolled past)
                  if (entry.isIntersecting) {
                     stickyHeader.classList.remove('visible')
                  } else {
                     stickyHeader.classList.add('visible')
                  }
               })
            }, { 
               threshold: 0,
               rootMargin: '0px'
            })
            
            observer.observe(getStartedElement)
         }
      }, 100)
   },
   get stickyHeader() {
      let ele = document.createElement('div')
      ele.classList.add('sticky-header')
      
      let title = document.createElement('span')
      title.innerText = 'Flashcards by Ignyos'
      title.classList.add('sticky-title')
      
      let button = document.createElement('button')
      button.innerText = 'Get Started'
      button.classList.add('sticky-get-started')
      button.onclick = () => {
         new SiteHeader().createNewStudent()
      }
      
      ele.appendChild(title)
      ele.appendChild(button)
      
      return ele
   },
   get featuresSection() {
      let section = document.createElement('div')
      section.classList.add('features-section')
      
      // Features title
      let featuresTitle = document.createElement('h2')
      featuresTitle.innerText = 'Features'
      featuresTitle.classList.add('features-title')
      section.appendChild(featuresTitle)
      
      // Feature categories
      section.appendChild(this.createFeatureCategory(
         '🧠 Smart Learning System',
         [
            'Adaptive Spaced Repetition: Automatically adjusts review intervals based on your performance',
            'Mastery Tracking: Cards graduate to "mastered" status when consistently answered correctly', 
            'Performance Analytics: Detailed statistics track your learning progress over time',
            'Customizable Learning Parameters: Adjust mastery requirements, and review cycles'
         ]
      ))
      
      section.appendChild(this.createFeatureCategory(
         '📚 Flexible Study Options',
         [
            'Regular Quizzes: Algorithmic quiz generation focusing on cards that need the most practice',
            'Custom Quiz Builder: Create targeted study sessions with specific decks and cards',
            'Multi-Student Support: Separate profiles for different learners'
         ]
      ))
      
      section.appendChild(this.createFeatureCategory(
         '📊 Comprehensive Analytics', 
         [
            'Performance Dashboard: Visual insights into your learning progress',
            'Success Rate Tracking: Monitor accuracy trends across all your decks',
            'Mastery Progress: See which cards you\'ve conquered and which need work'
         ]
      ))
      
      section.appendChild(this.createFeatureCategory(
         '⚙️ Advanced Settings',
         [
            'Granular Data Management: Clear history or reset mastery for specific decks or all content',
            'Customizable Study Parameters: Fine-tune the learning algorithm to match your preferences',
            'Export/Import Capabilities: Backup your progress and transfer data between devices',
            'Responsive Design: Works seamlessly on desktop and mobile devices'
         ]
      ))
      
      return section
   },
   createFeatureCategory(title, features) {
      let category = document.createElement('div')
      category.classList.add('feature-category')
      
      let categoryTitle = document.createElement('h3')
      categoryTitle.innerText = title
      categoryTitle.classList.add('category-title')
      category.appendChild(categoryTitle)
      
      let featuresList = document.createElement('ul')
      featuresList.classList.add('features-list')
      
      features.forEach(feature => {
         let listItem = document.createElement('li')
         let [name, description] = feature.split(': ')
         
         let featureName = document.createElement('strong')
         featureName.innerText = name + ': '
         
         let featureDesc = document.createElement('span')
         featureDesc.innerText = description
         
         listItem.appendChild(featureName)
         listItem.appendChild(featureDesc)
         featuresList.appendChild(listItem)
      })
      
      category.appendChild(featuresList)
      return category
   },
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
