// Este script se ejecuta en segundo plano
chrome.runtime.onInstalled.addListener(() => {
    console.log('API Explorer instalado correctamente');
  });
  
  // Manejar solicitudes desde el popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fetchResource') {
      fetch(message.url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${message.token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
      
      return true; // Indica que la respuesta será asíncrona
    }
  });
  