// Clase para manejar la conexión con la API
class ApiConnection {
  constructor() {
    this.baseUrl = '';
    this.token = '';
    this.tokenPrefix = ''; // Puede ser 'Bearer ' o vacío
    this.isConnected = false;
    this.resources = ['productos', 'listado-productos', 'productoimagenes'];
    this.statusEndpoint = 'status';
    this.cache = {}; // Caché para almacenar respuestas
    this.lastRequestTime = 0; // Tiempo de la última solicitud
    this.requestDelay = 1000; // Retraso mínimo entre solicitudes (1 segundo)
  }

  // Establecer la URL base de la API
  setBaseUrl(url) {
    if (!url || !this.isValidUrl(url)) {
      return false;
    }
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    return true;
  }

  // Establecer el token de acceso
  setToken(token) {
    if (!token || token.trim() === '') {
      return false;
    }
    // Asegurarse de que el token no tenga el prefijo "Bearer"
    this.token = token.startsWith('Bearer ') ? token.substring(7) : token;
    return true;
  }

  // Establecer el formato del token
  setTokenFormat(useBearer, useTokenHeader = true) {
    this.tokenPrefix = useBearer ? 'Bearer ' : '';
    this.useTokenHeader = useTokenHeader;
  }

  // Establecer el endpoint de verificación
  setStatusEndpoint(endpoint) {
    if (endpoint && endpoint.trim() !== '') {
      this.statusEndpoint = endpoint.trim();
    }
  }

  // Validar formato de URL
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Obtener encabezados para las solicitudes
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Determinar si usar 'Authorization' o 'token' como encabezado
    if (this.useTokenHeader) {
      // Usar 'token' como encabezado
      headers['token'] = this.token;
      console.log("Usando encabezado personalizado 'token':", this.token);
    } else {
      // Usar 'Authorization' como encabezado
      headers['Authorization'] = `${this.tokenPrefix}${this.token}`;
      console.log("Usando encabezado 'Authorization':", `${this.tokenPrefix}${this.token}`);
    }
    
    return headers;
  }

  // Esperar entre solicitudes para evitar rate limiting
  async waitBetweenRequests() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      console.log(`Esperando ${waitTime}ms para evitar rate limiting...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Realizar solicitud con reintentos y manejo de rate limiting
  async makeRequest(url, options, maxRetries = 3) {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        // Esperar entre solicitudes
        await this.waitBetweenRequests();
        
        const response = await fetch(url, options);
        
        // Si la respuesta es 429 (Too Many Requests), esperar y reintentar
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || 
                            Math.pow(2, retries) * 1000; // Backoff exponencial
          
          console.log(`Rate limit alcanzado. Esperando ${retryAfter}ms antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter)));
          retries++;
          continue;
        }
        
        return response;
      } catch (error) {
        if (retries >= maxRetries - 1) throw error;
        
        // Esperar antes de reintentar (backoff exponencial)
        const waitTime = Math.pow(2, retries) * 1000;
        console.log(`Error en la solicitud. Reintentando en ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retries++;
      }
    }
  }

  // Intentar conectar a un endpoint específico
  async tryConnect(endpoint) {
    try {
      // Construir la URL correctamente
      let url;
      if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        url = endpoint;
      } else {
        url = `${this.baseUrl}/${endpoint}`;
      }
      
      console.log(`Intentando conectar a: ${url}`);
      
      // Verificar si tenemos una respuesta en caché
      const cacheKey = `connect_${url}`;
      if (this.cache[cacheKey]) {
        console.log(`Usando respuesta en caché para ${url}`);
        return this.cache[cacheKey];
      }
      
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      console.log(`Respuesta de ${endpoint}:`, response.status);
      
      let result;
      if (response.ok) {
        result = { success: true, message: `Conexión exitosa a ${endpoint}` };
      } else if (response.status === 401) {
        result = { 
          success: false, 
          status: 401,
          message: `Error de autenticación en ${endpoint}: Token inválido o expirado (401 Unauthorized)` 
        };
      } else if (response.status === 429) {
        result = {
          success: false,
          status: 429,
          message: `Demasiadas solicitudes a ${endpoint}. Por favor, intenta más tarde (429 Too Many Requests)`
        };
      } else {
        result = { 
          success: false, 
          status: response.status,
          message: `Error en ${endpoint}: ${response.status} ${response.statusText}` 
        };
      }
      
      // Guardar en caché solo si no es un error de rate limiting
      if (response.status !== 429) {
        this.cache[cacheKey] = result;
      }
      
      return result;
    } catch (error) {
      console.error(`Error al conectar a ${endpoint}:`, error);
      return { 
        success: false, 
        error: error,
        message: `Error de conexión a ${endpoint}: ${error.message}` 
      };
    }
  }

  // Conectar a la API y verificar acceso
  async connect() {
    try {
      // Usar directamente la URL base sin añadir ningún endpoint
      let url = this.baseUrl;
      
      // Asegurarse de que la URL no termine con una barra
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      
      console.log(`Realizando solicitud a: ${url}`);
      console.log(`Usando encabezado personalizado 'token': ${this.token}`);
      
      // Realizar una solicitud con el token como encabezado personalizado
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      console.log(`Respuesta: ${response.status}`);
      
      // Intentar leer el cuerpo de la respuesta para ver el mensaje de error
      let responseBody;
      try {
        responseBody = await response.json();
        console.log('Cuerpo de la respuesta:', responseBody);
      } catch (e) {
        console.log('No se pudo parsear la respuesta como JSON');
      }
      
      if (response.ok) {
        this.isConnected = true;
        return { success: true, message: `Conexión exitosa a la API` };
      } else if (response.status === 401 || response.status === 403) {
        this.isConnected = false;
        let errorMessage = `Error de autenticación: Token inválido o expirado (${response.status})`;
        if (responseBody && responseBody.message) {
          errorMessage += ` - ${responseBody.message}`;
        }
        return { 
          success: false, 
          status: response.status,
          message: errorMessage
        };
      } else {
        this.isConnected = false;
        let errorMessage = `Error: ${response.status} ${response.statusText}`;
        if (responseBody && responseBody.message) {
          errorMessage += ` - ${responseBody.message}`;
        }
        return { 
          success: false, 
          status: response.status,
          message: errorMessage
        };
      }
    } catch (error) {
      console.error(`Error de conexión:`, error);
      this.isConnected = false;
      return { 
        success: false, 
        error: error,
        message: `Error de conexión: ${error.message}` 
      };
    }
  }

  // Obtener lista de recursos disponibles
  getResources() {
    // En una implementación real, esto podría ser una llamada a la API
    // para descubrir los endpoints disponibles
    return this.resources;
  }

  // Obtener datos de un recurso específico
  async getResourceData(resource) {
    if (!this.isConnected) {
      return { success: false, message: 'No hay conexión activa con la API' };
    }

    try {
      // Construir la URL correctamente
      let baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
      let resourcePath = resource.startsWith('/') ? resource.slice(1) : resource;
      
      // Construir URL completa
      let url = `${baseUrl}/${resourcePath}`;
      
      console.log(`Obteniendo datos de: ${url}`);
      console.log(`Usando encabezado personalizado 'token': ${this.token}`);
      
      // Verificar si tenemos una respuesta en caché
      const cacheKey = `data_${url}`;
      if (this.cache[cacheKey]) {
        console.log(`Usando datos en caché para ${url}`);
        return this.cache[cacheKey];
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      console.log(`Respuesta de ${resource}:`, response.status);
      
      let result;
      if (response.ok) {
        const data = await response.json();
        result = { success: true, data };
      } else if (response.status === 401) {
        this.isConnected = false;
        result = { 
          success: false, 
          message: 'Error de autenticación: Token inválido o expirado (401 Unauthorized)' 
        };
      } else {
        result = { 
          success: false, 
          message: `Error al obtener datos: ${response.status} ${response.statusText}` 
        };
      }
      
      // Guardar en caché solo si es exitoso
      if (result.success) {
        this.cache[cacheKey] = result;
      }
      
      return result;
    } catch (error) {
      console.error(`Error al obtener datos de ${resource}:`, error);
      return { success: false, message: `Error: ${error.message}` };
    }
  }

  // Limpiar caché
  clearCache() {
    this.cache = {};
    console.log('Caché limpiada');
  }

  // Guardar configuración en el almacenamiento local
  saveConfig() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          apiUrl: this.baseUrl,
          apiToken: this.token,
          tokenPrefix: this.tokenPrefix,
          statusEndpoint: this.statusEndpoint
        });
      } else {
        // Alternativa: usar localStorage si chrome.storage no está disponible
        localStorage.setItem('apiExplorer', JSON.stringify({
          apiUrl: this.baseUrl,
          apiToken: this.token,
          tokenPrefix: this.tokenPrefix,
          statusEndpoint: this.statusEndpoint
        }));
      }
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
    }
  }

  // Cargar configuración desde el almacenamiento local
  async loadConfig() {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['apiUrl', 'apiToken', 'tokenPrefix', 'statusEndpoint'], (result) => {
            if (result.apiUrl) this.baseUrl = result.apiUrl;
            if (result.apiToken) this.token = result.apiToken;
            if (result.tokenPrefix !== undefined) this.tokenPrefix = result.tokenPrefix;
            if (result.statusEndpoint) this.statusEndpoint = result.statusEndpoint;
            resolve(!!result.apiUrl && !!result.apiToken);
          });
        } else {
          // Alternativa: usar localStorage si chrome.storage no está disponible
          const saved = localStorage.getItem('apiExplorer');
          if (saved) {
            const config = JSON.parse(saved);
            this.baseUrl = config.apiUrl || '';
            this.token = config.apiToken || '';
            if (config.tokenPrefix !== undefined) this.tokenPrefix = config.tokenPrefix;
            if (config.statusEndpoint) this.statusEndpoint = config.statusEndpoint;
            resolve(!!this.baseUrl && !!this.token);
          } else {
            resolve(false);
          }
        }
      } catch (error) {
        console.error('Error al cargar la configuración:', error);
        resolve(false);
      }
    });
  }

  // Método para obtener una URL de imagen válida (con token si es necesario)
  async getImageUrl(imageUrl) {
    // Si la URL ya tiene el token myft, devolverla tal cual
    if (hasMyFilesToken(imageUrl)) {
      return imageUrl;
    }
    
    // Si la URL apunta a MyFiles/Public, devolverla tal cual
    if (imageUrl.includes('/MyFiles/Public/')) {
      return imageUrl;
    }
    
    // Intentar obtener el token a través de la API
    try {
      const path = imageUrl.split('/MyFiles/')[1]; // Extraer la ruta relativa
      if (!path) {
        return imageUrl; // No es una ruta de MyFiles, devolver tal cual
      }
      
      // Construir la URL para solicitar el token
      const tokenUrl = `${this.baseUrl}/get-myfiles-token?path=MyFiles/${path}`;
      
      const response = await this.makeRequest(tokenUrl, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          // Construir la URL con el token
          return `${imageUrl}?myft=${data.token}`;
        }
      }
      
      // Si no se pudo obtener el token, devolver la URL original
      return imageUrl;
    } catch (error) {
      console.error('Error al obtener token para imagen:', error);
      return imageUrl;
    }
  }
}

/**
 * Verifica si hay mensajes pendientes de WhatsApp
 */
checkPendingWhatsAppMessage = function () {
    chrome.runtime.sendMessage({ action: 'checkPendingWhatsAppMessage' }, function (response) {
        if (response && response.message) {
            alert(response.message);
        } else {
            console.log('No hay mensajes pendientes de WhatsApp');
        }
    });
};

/**
 * Añade botones de compartir a todas las tarjetas de productos
 */
function addShareButtonsToCards() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (card.querySelector('.share-button')) return;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'absolute';
        buttonContainer.style.top = '10px';
        buttonContainer.style.right = '10px';
        buttonContainer.style.zIndex = '10';

        const shareButton = document.createElement('button');
        shareButton.className = 'share-button';
        shareButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
            </svg>
        `;
        shareButton.style.backgroundColor = '#25D366';
        shareButton.style.color = 'white';
        shareButton.style.border = 'none';
        shareButton.style.borderRadius = '50%';
        shareButton.style.width = '36px';
        shareButton.style.height = '36px';
        shareButton.style.display = 'flex';
        shareButton.style.justifyContent = 'center';
        shareButton.style.alignItems = 'center';
        shareButton.style.cursor = 'pointer';
        shareButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        shareButton.title = 'Compartir en WhatsApp';

        shareButton.onmouseover = function () {
            this.style.backgroundColor = '#128C7E';
        };
        shareButton.onmouseout = function () {
            this.style.backgroundColor = '#25D366';
        };

        shareButton.addEventListener('click', (e) => {
            e.stopPropagation();
            shareOnWhatsApp(card);
        });

        buttonContainer.appendChild(shareButton);
        if (getComputedStyle(card).position === 'static') {
            card.style.position = 'relative';
        }
        card.appendChild(buttonContainer);
    });
}

/**
 * Comparte la información de una tarjeta en WhatsApp con la imagen adjunta
 * @param {HTMLElement} card - Tarjeta a compartir
 */
async function shareOnWhatsApp(card) {
    const title = card.querySelector('h3').textContent;
    const properties = {};
    card.querySelectorAll('p').forEach(p => {
        const text = p.textContent;
        const colonIndex = text.indexOf(':');
        if (colonIndex > -1) {
            const key = text.substring(0, colonIndex).trim().toLowerCase();
            const value = text.substring(colonIndex + 1).trim();
            properties[key] = value;
        }
    });

    const img = card.querySelector('img');
    const imageUrl = img ? img.src : ''; // URL de la imagen (debe ser pública)

    // Generar el mensaje
    let message = `*${title}*\n\n`;
    if (properties.referencia) message += `📋 Referencia: ${properties.referencia}\n`;
    if (properties.precio) message += `💰 Precio: ${properties.precio}\n`;
    if (properties.descripcion) message += `📝 Descripción: ${properties.descripcion}\n`;
    if (properties.id) message += `🆔 ID: ${properties.id}\n`;
    message += `\n✅ Producto disponible en nuestro catálogo.`;

    try {
        // Convertir la imagen a un Data URL
        const imageDataUrl = await fetch(imageUrl).then(res => res.blob()).then(blob => {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        });

        // Enviar la imagen y el mensaje en WhatsApp Web
        await sendImageAndMessageInWhatsApp(imageDataUrl, message);
    } catch (error) {
        console.error('Error al procesar la imagen o el mensaje:', error);
        alert('No se pudo compartir el producto. Por favor, intenta de nuevo.');
    }
}

/**
 * Envía automáticamente una imagen y un mensaje en WhatsApp Web
 * @param {string} imageDataUrl - URL de datos de la imagen
 * @param {string} message - Mensaje a enviar
 */
async function sendImageAndMessageInWhatsApp(imageDataUrl, message) {
    try {
        // Seleccionar el botón de adjuntar en WhatsApp Web
        const attachButton = document.querySelector('span[data-icon="clip"]');
        if (!attachButton) {
            alert('No se encontró el botón de adjuntar en WhatsApp Web.');
            return;
        }
        attachButton.click();

        // Esperar a que aparezca el input de archivo
        const fileInput = document.querySelector('input[type="file"]');
        if (!fileInput) {
            alert('No se encontró el input de archivo en WhatsApp Web.');
            return;
        }

        // Convertir el Data URL a un Blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'producto.jpg', { type: 'image/jpeg' });

        // Simular la selección del archivo
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        // Simular el evento de cambio para cargar la imagen
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);

        // Esperar a que se cargue la vista previa de la imagen
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Escribir el mensaje en el campo de texto
        const messageBox = document.querySelector('div[contenteditable="true"]');
        if (!messageBox) {
            alert('No se encontró el campo de texto en WhatsApp Web.');
            return;
        }
        messageBox.textContent = message;

        // Simular el evento de entrada para actualizar el campo de texto
        const inputEvent = new InputEvent('input', { bubbles: true });
        messageBox.dispatchEvent(inputEvent);

        // Hacer clic en el botón de enviar
        const sendButton = document.querySelector('span[data-icon="send"]');
        if (!sendButton) {
            alert('No se encontró el botón de enviar en WhatsApp Web.');
            return;
        }
        sendButton.click();

        alert('Imagen y mensaje enviados correctamente.');
    } catch (error) {
        console.error('Error al enviar la imagen y el mensaje en WhatsApp:', error);
        alert('No se pudo enviar la imagen y el mensaje. Por favor, intenta de nuevo.');
    }
}

// Exportar la clase para que pueda ser utilizada por popup.js
window.ApiConnection = ApiConnection;
