newId = (len = 6) => {
   const c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   let o='';
   for (let i = 0; i < len; i++ )
      {
         const r = Math.floor(Math.random() * c.length);
         o += c[r];
      }
   return o;
}

getRandomNElements = (arr, n) => {
   let result = new Array(n),
       len = arr.length,
       taken = new Array(len);
   if (n > len) n = len;
   while (n--) {
      const x = Math.floor(Math.random() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
   }
   return result;
}

async function newQuestionId() {
   let i = 0
   let id = newId(6)
   while (await dbCtx.question.exists(id) && i < 10) {
      id = newId(6)
      i++
   }
   if (i >= 10) {
      messageCenter.addError("Unable to create a new question id")
   }
   return id
}

getNavItemPill = (text, enabled) => {
   let ele = document.createElement('div')
   ele.innerText = text
   if (enabled) {
      ele.classList.add('pill')
   } else {
      ele.classList.add('pill-disabled')
   }
   return ele
}