class API {
  #headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-App-Name': 'Flashcards'
  }

  constructor( apiBaseUrl = 'https://api.funtility.com/') {
      this.apiBaseUrl = apiBaseUrl;
  }

  async postAppLog(message) {
    message = message.trim();
    if (!message) {
      return;
    }
    await fetch(this.apiBaseUrl + 'log/app', {
        method: 'POST',
        headers: this.#headers,
        body: JSON.stringify(message)
    });
  }
}