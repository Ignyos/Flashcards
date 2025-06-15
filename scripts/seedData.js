class SeedData {
   constructor(acctName = "", sCount = 4, tCount = 4, qCount = 4) {
      this.sCount = sCount
      this.tCount = tCount
      this.qCount = qCount
      if (!acctName) { acctName = newId(4) }
      this.account = new Account({name:acctName}) // N.Hügelhaus
      this.subjects = []
      this.acctSubs = []
      this.topics = []
      this.questions = []

      for (let s = 1; s <= this.sCount; s++) {
         let subject = new Subject({
            title:`${acctName} ${s}`
         })
         this.subjects.push(subject)

         let acctSub = new AccountSubject({
            accountId:this.account.id,
            subjectId:subject.id
         })
         this.acctSubs.push(acctSub)

         for (let t = 1; t <= this.tCount; t++) {
            let topic = new Topic({
               subjectId:subject.id,
               title:`${acctName} ${s}.${t}`,
               questionCount:this.qCount
            })
            this.topics.push(topic)

            for (let q = 1; q <= this.qCount; q++) {
               let txt = `${acctName} ${s}.${t}.${q}`
               let question = new Question({
                  topicId:topic.id,
                  shortPhrase:txt,
                  phrase:`Q: ${txt}`,
                  answer:`A: ${txt}`
               })
               this.questions.push(question)
            }
         }
      }
   }
   async save() {
      await dbCtx.account.add(this.account)

      this.subjects.forEach(async subject => {
         await dbCtx.subject.add(subject)
      })

      this.acctSubs.forEach(async acctSub => {
         await dbCtx.accountSubject.add(acctSub)
      })

      this.topics.forEach(async topic => {
         await dbCtx.topic.add(topic)
      })

      this.questions.forEach(async question => {
         question.id = await newQuestionId()
         await dbCtx.question.add(question)
      })
   }
}

async function addSeedData() {
   const accts = await dbCtx.account.all()
   if (accts.length > 0) {
      return
   }
   let seed;
   const names = ['a', 'b', 'c', 'd']
   for (let i = 0; i < names.length; i++) {
      seed = new SeedData(names[i], 4, 4, 4)
      await seed.save()
   }
   app.route()
}