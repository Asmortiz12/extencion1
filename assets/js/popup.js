// Elementos del DOM
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4');

const apiUrlInput = document.getElementById('apiUrl');
const apiUrlError = document.getElementById('apiUrlError');
const nextToTokenBtn = document.getElementById('nextToToken');

const apiTokenInput = document.getElementById('apiToken');
const tokenError = document.getElementById('tokenError');
const connectApiBtn = document.getElementById('connectApi');
const backToUrlBtn = document.getElementById('backToUrl');

const connectionStatus = document.getElementById('connectionStatus');
const resourcesContainer = document.getElementById('resourcesContainer');
const resourceList = document.getElementById('resourceList');
const backToTokenBtn = document.getElementById('backToToken');

const currentResourceSpan = document.getElementById('currentResource');
const resourceData = document.getElementById('resourceData');
const backToResourcesBtn = document.getElementById('backToResources');

// Estado de la aplicación
let appState = {
  apiUrl: '',
  apiToken: '',
  authType: 'token-only', // Cambiado a token sin prefijo por defecto
  authHeader: 'Authorization',
  resources: [],
  currentResource: null,
  rawData: null
};

// Cargar estado desde localStorage
function loadState() {
  try {
    const savedState = localStorage.getItem('apiExplorerState');
    if (savedState) {
      appState = JSON.parse(savedState);
      
      // Rellenar campos con datos guardados
      if (apiUrlInput) apiUrlInput.value = appState.apiUrl || '';
      if (apiTokenInput) apiTokenInput.value = appState.apiToken || '';
      
      // Si tenemos URL y token, podemos ir directamente a la lista de recursos
      if (appState.apiUrl && appState.apiToken && appState.resources && appState.resources.length > 0) {
        showStep(3);
        displayResources(appState.resources);
        if (connectionStatus) connectionStatus.innerHTML = '<p class="success">Conectado correctamente</p>';
        if (resourcesContainer) resourcesContainer.classList.remove('hidden');
      }
    }
  } catch (error) {
    console.error('Error al cargar desde localStorage:', error);
  }
}

// Guardar estado en localStorage
function saveState() {
  try {
    localStorage.setItem('apiExplorerState', JSON.stringify(appState));
  } catch (error) {
    console.error('Error al guardar en localStorage:', error);
  }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', loadState);

// Validar URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    // Para URLs locales como http://localhost, permitirlas
    if (url.startsWith('http://localhost') || url.startsWith('https://localhost')) {
      return true;
    }
    return false;
  }
}

// Mostrar paso específico
function showStep(stepNumber) {
  if (step1) step1.classList.add('hidden');
  if (step2) step2.classList.add('hidden');
  if (step3) step3.classList.add('hidden');
  if (step4) step4.classList.add('hidden');
  
  switch(stepNumber) {
    case 1:
      if (step1) step1.classList.remove('hidden');
      break;
    case 2:
      if (step2) step2.classList.remove('hidden');
      break;
    case 3:
      if (step3) step3.classList.remove('hidden');
      break;
    case 4:
      if (step4) step4.classList.remove('hidden');
      break;
  }
}

// Paso 1: Validar URL y pasar al token
if (nextToTokenBtn) {
  nextToTokenBtn.addEventListener('click', () => {
    const url = apiUrlInput.value.trim();
    
    if (!url || !isValidUrl(url)) {
      if (apiUrlError) apiUrlError.classList.remove('hidden');
      return;
    }
    
    if (apiUrlError) apiUrlError.classList.add('hidden');
    appState.apiUrl = url;
    saveState();
    showStep(2);
  });
}

// Volver de token a URL
if (backToUrlBtn) {
  backToUrlBtn.addEventListener('click', () => {
    showStep(1);
  });
}

// Función para crear los encabezados de autenticación
function createAuthHeaders(token, authType = 'token-only', headerName = 'Authorization') {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': '*/*'
  };
  
  // Diferentes tipos de autenticación
  switch (authType.toLowerCase()) {
    case 'bearer':
      headers[headerName] = `Bearer ${token}`;
      break;
    case 'token-only': // Token sin prefijo
      headers[headerName] = token;
      break;
    case 'basic':
      headers[headerName] = `Basic ${btoa(token)}`;
      break;
    case 'api-key':
      headers['X-API-Key'] = token;
      break;
    case 'token':
      headers[headerName] = `Token ${token}`;
      break;
    case 'custom':
      const [customHeaderName, customHeaderValue] = token.split(':');
      if (customHeaderName && customHeaderValue) {
        headers[customHeaderName.trim()] = customHeaderValue.trim();
      }
      break;
    case 'none':
      // No agregar encabezado de autenticación
      break;
    default:
      headers[headerName] = token; // Por defecto, usar token sin prefijo
  }
  
  return headers;
}

// Paso 2: Conectar con la API usando el token
if (connectApiBtn) {
  connectApiBtn.addEventListener('click', async () => {
    const token = apiTokenInput.value.trim();
    
    if (!token) {
      if (tokenError) tokenError.classList.remove('hidden');
      return;
    }
    
    if (tokenError) tokenError.classList.add('hidden');
    appState.apiToken = token;
    saveState();
    
    // Mostrar paso 3 y estado de conexión
    showStep(3);
    if (connectionStatus) connectionStatus.innerHTML = '<p>Conectando a la API...</p>';
    
    try {
      // Construir la URL correctamente
      const baseUrl = appState.apiUrl.endsWith('/') 
        ? appState.apiUrl.slice(0, -1) 
        : appState.apiUrl;
      
      console.log('URL de la solicitud:', baseUrl);
      console.log('Token usado:', appState.apiToken);
      
      // Usar solo el método de autenticación seleccionado
      const authType = appState.authType || 'token-only';
      const authHeader = appState.authHeader || 'Authorization';
      
      let requestUrl = baseUrl;
      let headers = {};
      let options = {
        method: 'GET',
        credentials: 'include' // Incluir cookies
      };
      
      if (authType === 'url-param') {
        // Agregar token como parámetro de URL
        const param = appState.authParam || 'token';
        const separator = baseUrl.includes('?') ? '&' : '?';
        requestUrl = `${baseUrl}${separator}${param}=${appState.apiToken}`;
        headers = {
          'Content-Type': 'application/json',
          'Accept': '*/*'
        };
      } else {
        // Usar encabezados de autenticación
        headers = createAuthHeaders(appState.apiToken, authType, authHeader);
      }
      
      options.headers = headers;
      
      console.log('Realizando solicitud con opciones:', {
        url: requestUrl,
        headers: headers
      });
      
      const response = await fetch(requestUrl, options);
      
      console.log('Respuesta:', {
        status: response.status,
        statusText: response.statusText
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Respuesta de la API:', data);
        
        // Procesar los datos
        processApiResponse(data);
      } else {
        // Manejar error
        if (connectionStatus) {
          connectionStatus.innerHTML = `<p class="error">Error de conexión: ${response.status} ${response.statusText}</p>`;
          
          // Agregar botón para probar todos los métodos
          const tryAllBtn = document.createElement('button');
          tryAllBtn.className = 'primary-button';
          tryAllBtn.textContent = 'Probar todos los métodos de autenticación';
          tryAllBtn.addEventListener('click', () => {
            document.getElementById('testAllAuthBtn')?.click();
          });
          
          connectionStatus.appendChild(document.createElement('br'));
          connectionStatus.appendChild(tryAllBtn);
        }
      }
    } catch (error) {
      console.error('Error en la solicitud:', error);
      if (connectionStatus) {
        connectionStatus.innerHTML = `<p class="error">Error de conexión: ${error.message}</p>`;
      }
    }
  });
}

// Función para procesar la respuesta de la API
function processApiResponse(data) {
  // Guardar los datos completos
  appState.rawData = data;
  
  // Procesar los datos según su tipo
  if (Array.isArray(data)) {
    // Si es un array, cada elemento es un recurso
    appState.resources = data.map((item, index) => {
      return {
        id: item.id || index,
        name: item.name || `Recurso ${index + 1}`,
        data: item
      };
    });
  } else if (typeof data === 'object' && data !== null) {
    // Si es un objeto, intentar extraer recursos
    if (data.resources && Array.isArray(data.resources)) {
      // Si tiene una propiedad 'resources' que es un array
      appState.resources = data.resources.map((item, index) => {
        return {
          id: item.id || index,
          name: item.name || `Recurso ${index + 1}`,
          data: item
        };
      });
    } else {
      // Si es un objeto sin propiedad 'resources', tratar cada propiedad como un recurso
      appState.resources = Object.keys(data).map((key, index) => {
        const value = data[key];
        return {
          id: index,
          name: key,
          data: value
        };
      });
    }
  } else {
    // Si no es ni array ni objeto, crear un único recurso
    appState.resources = [{
      id: 0,
      name: 'Respuesta',
      data: data
    }];
  }
  
  saveState();
  
  if (connectionStatus) connectionStatus.innerHTML = '<p class="success">Conectado correctamente</p>';
  displayResources(appState.resources);
  if (resourcesContainer) resourcesContainer.classList.remove('hidden');
}

// Volver de recursos a token
if (backToTokenBtn) {
    backToTokenBtn.addEventListener('click', () => {
        showStep(2);
      });
    }
    
    // Volver de datos de recurso a lista de recursos
    if (backToResourcesBtn) {
      backToResourcesBtn.addEventListener('click', () => {
        showStep(3);
      });
    }
    
    // Mostrar lista de recursos
    function displayResources(resources) {
      if (!resourceList) return;
      
      resourceList.innerHTML = '';
      
      resources.forEach((resource) => {
        const resourceElement = document.createElement('div');
        resourceElement.className = 'resource-item';
        resourceElement.textContent = resource.name;
        resourceElement.addEventListener('click', () => {
          showResourceDetails(resource);
        });
        
        resourceList.appendChild(resourceElement);
      });
    }
    
    // Reemplazar la función showResourceDetails existente con esta versión mejorada
    function showResourceDetails(resource) {
      appState.currentResource = resource;
      
      if (currentResourceSpan) currentResourceSpan.textContent = resource.name;
      if (resourceData) {
        // Limpiar el contenedor
        resourceData.innerHTML = '';
        
        // Crear tarjetas HTML en lugar de mostrar JSON crudo
        if (Array.isArray(resource.data)) {
          // Si es un array, crear una tarjeta para cada elemento
          resource.data.forEach((item, index) => {
            const card = createDataCard(item, `Elemento ${index + 1}`);
            resourceData.appendChild(card);
          });
        } else if (typeof resource.data === 'object' && resource.data !== null) {
          // Si es un objeto, crear una tarjeta para él
          const card = createDataCard(resource.data, resource.name);
          resourceData.appendChild(card);
        } else {
          // Si es un valor primitivo, mostrarlo en una tarjeta simple
          const card = document.createElement('div');
          card.className = 'data-card';
          card.innerHTML = `
            <div class="card-header">
              <h3>${resource.name}</h3>
            </div>
            <div class="card-body">
              <p>${resource.data}</p>
            </div>
          `;
          resourceData.appendChild(card);
        }
        
        // Agregar botón para ver JSON original
        const viewJsonBtn = document.createElement('button');
        viewJsonBtn.className = 'secondary-button';
        viewJsonBtn.textContent = 'Ver JSON original';
        viewJsonBtn.addEventListener('click', () => {
          // Mostrar el JSON original en un modal
          showJsonModal(resource.data);
        });
        
        resourceData.appendChild(document.createElement('br'));
        resourceData.appendChild(viewJsonBtn);
      }
      
      showStep(4);
    }

    // Función para crear una tarjeta de datos a partir de un objeto
    function createDataCard(data, title = 'Datos') {
      const card = document.createElement('div');
      card.className = 'data-card';
      
      // Crear el encabezado de la tarjeta
      const cardHeader = document.createElement('div');
      cardHeader.className = 'card-header';
      
      const cardTitle = document.createElement('h3');
      cardTitle.textContent = title;
      cardHeader.appendChild(cardTitle);
      
      // Crear el cuerpo de la tarjeta
      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';
      
      // Procesar los datos para mostrarlos en la tarjeta
      if (typeof data === 'object' && data !== null) {
        // Crear una lista de propiedades
        const propsList = document.createElement('div');
        propsList.className = 'properties-list';
        
        Object.entries(data).forEach(([key, value]) => {
          const propItem = document.createElement('div');
          propItem.className = 'property-item';
          
          const propLabel = document.createElement('div');
          propLabel.className = 'property-label';
          propLabel.textContent = key;
          
          const propValue = document.createElement('div');
          propValue.className = 'property-value';
          
          // Formatear el valor según su tipo
          if (value === null) {
            propValue.textContent = 'null';
            propValue.classList.add('null-value');
          } else if (typeof value === 'object') {
            // Si es un objeto anidado, mostrar un resumen y un botón para expandir
            propValue.textContent = Array.isArray(value) 
              ? `Array [${value.length} elementos]` 
              : `Objeto {${Object.keys(value).length} propiedades}`;
            propValue.classList.add('object-value');
            
            // Botón para expandir/colapsar
            const expandBtn = document.createElement('button');
            expandBtn.className = 'expand-btn';
            expandBtn.textContent = 'Expandir';
            expandBtn.dataset.expanded = 'false';
            
            // Contenedor para el objeto expandido
            const expandedContent = document.createElement('div');
            expandedContent.className = 'expanded-content hidden';
            
            // Al hacer clic, mostrar/ocultar el contenido expandido
            expandBtn.addEventListener('click', () => {
              if (expandBtn.dataset.expanded === 'false') {
                // Expandir y mostrar el contenido
                expandBtn.dataset.expanded = 'true';
                expandBtn.textContent = 'Colapsar';
                expandedContent.classList.remove('hidden');
                
                // Si aún no se ha generado el contenido, crearlo
                if (expandedContent.children.length === 0) {
                  const nestedCard = createDataCard(value, key);
                  expandedContent.appendChild(nestedCard);
                }
              } else {
                // Colapsar y ocultar el contenido
                expandBtn.dataset.expanded = 'false';
                expandBtn.textContent = 'Expandir';
                expandedContent.classList.add('hidden');
              }
            });
            
            propValue.appendChild(expandBtn);
            propItem.appendChild(expandedContent);
          } else if (typeof value === 'boolean') {
            propValue.textContent = value ? 'true' : 'false';
            propValue.classList.add(value ? 'true-value' : 'false-value');
          } else if (typeof value === 'number') {
            propValue.textContent = value;
            propValue.classList.add('number-value');
          } else if (typeof value === 'string') {
            // Detectar si es una URL o una imagen
            if (value.match(/^(http|https):\/\/[^\s]+$/)) {
              if (value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
                // Es una imagen
                const img = document.createElement('img');
                img.src = value;
                img.alt = key;
                img.className = 'card-image';
                propValue.appendChild(img);
              } else {
                // Es una URL
                const link = document.createElement('a');
                link.href = value;
                link.textContent = value;
                link.target = '_blank';
                propValue.appendChild(link);
              }
            } else {
              propValue.textContent = value;
            }
            propValue.classList.add('string-value');
          } else {
            propValue.textContent = String(value);
          }
          
          propItem.appendChild(propLabel);
          propItem.appendChild(propValue);
          propsList.appendChild(propItem);
        });
        
        cardBody.appendChild(propsList);
      } else {
        // Para valores primitivos
        const valueElement = document.createElement('p');
        valueElement.textContent = String(data);
        cardBody.appendChild(valueElement);
      }
      
      // Ensamblar la tarjeta
      card.appendChild(cardHeader);
      card.appendChild(cardBody);
      
      return card;
    }

    // Función para mostrar un modal con el JSON original
    function showJsonModal(data) {
      // Crear el modal
      const modal = document.createElement('div');
      modal.className = 'modal';
      
      // Contenido del modal
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      
      // Botón de cierre
      const closeBtn = document.createElement('span');
      closeBtn.className = 'close';
      closeBtn.innerHTML = '×';
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      // Título
      const title = document.createElement('h3');
      title.textContent = 'JSON Original';
      
      // Contenido JSON
      const jsonPre = document.createElement('pre');
      jsonPre.textContent = JSON.stringify(data, null, 2);
      
      // Botón para copiar
      const copyBtn = document.createElement('button');
      copyBtn.className = 'primary-button';
      copyBtn.textContent = 'Copiar JSON';
      copyBtn.addEventListener('click', () => {
        copyToClipboard(JSON.stringify(data, null, 2));
      });
      
      // Botón para cerrar
      const closeButton = document.createElement('button');
      closeButton.className = 'secondary-button';
      closeButton.textContent = 'Cerrar';
      closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      // Ensamblar el modal
      modalContent.appendChild(closeBtn);
      modalContent.appendChild(title);
      modalContent.appendChild(jsonPre);
      
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'button-container';
      buttonContainer.appendChild(copyBtn);
      buttonContainer.appendChild(closeButton);
      
      modalContent.appendChild(buttonContainer);
      modal.appendChild(modalContent);
      
      // Agregar al body
      document.body.appendChild(modal);
    }
    
    // Función para crear un elemento de interfaz de usuario
    function createUIElement(tag, className, textContent = '') {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (textContent) element.textContent = textContent;
      return element;
    }
    
    // Función para mostrar un mensaje de notificación temporal
    function showNotification(message, type = 'info', duration = 3000) {
      // Crear el elemento de notificación si no existe
      let notification = document.getElementById('notification');
      if (!notification) {
        notification = createUIElement('div', 'notification');
        notification.id = 'notification';
        document.body.appendChild(notification);
      }
      
      // Establecer el tipo y mensaje
      notification.className = `notification ${type}`;
      notification.textContent = message;
      notification.style.display = 'block';
      
      // Ocultar después de la duración especificada
      setTimeout(() => {
        notification.style.display = 'none';
      }, duration);
    }
    
    // Función para copiar datos al portapapeles
    function copyToClipboard(text) {
      try {
        navigator.clipboard.writeText(text).then(
          () => {
            showNotification('Copiado al portapapeles', 'success');
          },
          (err) => {
            console.error('Error al copiar:', err);
            showNotification('Error al copiar al portapapeles', 'error');
          }
        );
      } catch (error) {
        console.error('Error al acceder al portapapeles:', error);
        
        // Fallback para navegadores que no soportan clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            showNotification('Copiado al portapapeles', 'success');
          } else {
            showNotification('Error al copiar al portapapeles', 'error');
          }
        } catch (err) {
          console.error('Error al ejecutar comando de copia:', err);
          showNotification('Error al copiar al portapapeles', 'error');
        }
        
        document.body.removeChild(textarea);
      }
    }
    
    // Función para mejorar la visualización de los datos del recurso
    function enhanceResourceDataDisplay() {
      // Agregar botones de acción a cada vista de recurso
      const resourceDataContainers = document.querySelectorAll('.resource-data pre');
      
      resourceDataContainers.forEach(container => {
        // Evitar duplicar botones
        if (container.parentNode.querySelector('.resource-actions')) {
          return;
        }
        
        const actionsContainer = createUIElement('div', 'resource-actions');
        
        // Botón para copiar
        const copyBtn = createUIElement('button', 'action-button', 'Copiar');
        copyBtn.addEventListener('click', () => {
          copyToClipboard(container.textContent);
        });
        
        actionsContainer.appendChild(copyBtn);
        
        // Insertar antes del contenedor de datos
        container.parentNode.insertBefore(actionsContainer, container);
      });
    }
    
    // Ejecutar mejoras de UI cuando se carga el DOM
    document.addEventListener('DOMContentLoaded', () => {
      // Inicializar la aplicación
      loadState();
      
      // Agregar selector de tipo de autenticación
      addAuthTypeSelector();
      
      // Mejorar la visualización después de cargar los datos
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && 
              mutation.target.classList.contains('resource-data')) {
            enhanceResourceDataDisplay();
          }
        });
      });
      
      // Observar cambios en el contenedor de datos de recursos
      if (resourceData) {
        observer.observe(resourceData, { childList: true });
      }
    });
    
    // Función para agregar selector de tipo de autenticación
    function addAuthTypeSelector() {
      const tokenContainer = document.querySelector('#step2 .form-group');
      if (!tokenContainer) return;
      
      // Verificar si ya existe el selector
      if (document.getElementById('authTypeSelector')) return;
      
      // Crear el contenedor para el selector
      const authTypeSelectorContainer = createUIElement('div', 'form-group');
      
      // Crear la etiqueta
      const label = createUIElement('label', '', 'Tipo de autenticación:');
      label.setAttribute('for', 'authTypeSelector');
      
      // Crear el selector
      const select = createUIElement('select', 'form-control');
      select.id = 'authTypeSelector';
      
      // Opciones de autenticación
      const authTypes = [
        { value: 'token-only', text: 'Token sin prefijo' },
        { value: 'Bearer', text: 'Bearer Token' },
        { value: 'Basic', text: 'Basic Auth' },
        { value: 'API-Key', text: 'API Key' },
        { value: 'Token', text: 'Simple Token' },
        { value: 'custom', text: 'Personalizado (header:value)' },
        { value: 'none', text: 'Sin autenticación' }
      ];
      
      // Agregar opciones al selector
      authTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.text;
        
        // Seleccionar el tipo actual
        if (type.value.toLowerCase() === (appState.authType || 'token-only').toLowerCase()) {
          option.selected = true;
        }
        
        select.appendChild(option);
      });
      
      // Manejar cambios en el selector
      select.addEventListener('change', (e) => {
        appState.authType = e.target.value;
        saveState();
        
        // Actualizar el placeholder del input de token según el tipo seleccionado
        updateTokenInputPlaceholder(e.target.value);
      });
      
      // Agregar elementos al contenedor
      authTypeSelectorContainer.appendChild(label);
      authTypeSelectorContainer.appendChild(select);
      
      // Insertar antes del input de token
      tokenContainer.parentNode.insertBefore(authTypeSelectorContainer, tokenContainer);
      
      // Inicializar el placeholder
      updateTokenInputPlaceholder(appState.authType || 'token-only');
    }
    
    // Función para actualizar el placeholder del input de token
    function updateTokenInputPlaceholder(authType) {
      if (!apiTokenInput) return;
      
      switch (authType.toLowerCase()) {
        case 'token-only':
          apiTokenInput.placeholder = 'Ingrese su token (sin prefijo)';
          break;
        case 'bearer':
          apiTokenInput.placeholder = 'Ingrese su token JWT o OAuth';
          break;
        case 'basic':
          apiTokenInput.placeholder = 'username:password o token Base64';
          break;
        case 'api-key':
          apiTokenInput.placeholder = 'Ingrese su API Key';
          break;
        case 'token':
          apiTokenInput.placeholder = 'Ingrese su token simple';
          break;
        case 'custom':
          apiTokenInput.placeholder = 'Nombre-Cabecera: Valor';
          break;
        case 'none':
          apiTokenInput.placeholder = 'No se requiere token (opcional)';
          break;
        default:
          apiTokenInput.placeholder = 'Ingrese su token de autenticación';
      }
    }
    
    // Función para realizar una solicitud a la API con reintentos
    async function fetchWithRetry(url, options, maxRetries = 3) {
      let lastError;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await fetch(url, options);
          
          if (response.ok) {
            return await response.json();
          }
          
          // Si la respuesta no es exitosa, lanzar un error con el estado
          lastError = new Error(`HTTP error: ${response.status}`);
          lastError.status = response.status;
          
          // Si es un error de autenticación, no reintentar
          if (response.status === 401 || response.status === 403) {
            break;
          }
          
          // Esperar antes de reintentar (backoff exponencial)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        } catch (error) {
          lastError = error;
          console.error(`Intento ${attempt + 1} fallido:`, error);
          
          // Esperar antes de reintentar
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
      
      throw lastError;
    }
    
    // Función para exportar los datos como CSV
    function exportAsCSV(data) {
      if (!data || !Array.isArray(data)) {
        showNotification('No se pueden exportar los datos como CSV', 'error');
        return;
      }
      
      try {
        // Obtener todas las claves únicas
        const allKeys = new Set();
        data.forEach(item => {
          Object.keys(item).forEach(key => allKeys.add(key));
        });
        
        const headers = Array.from(allKeys);
        
        // Crear filas de datos
        const rows = data.map(item => {
          return headers.map(header => {
            const value = item[header];
            // Manejar valores que podrían contener comas o comillas
            if (value === null || value === undefined) {
              return '';
            } else if (typeof value === 'object') {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            } else {
              return `"${String(value).replace(/"/g, '""')}"`;
            }
          }).join(',');
        });
        
        // Combinar encabezados y filas
        const csvContent = [
          headers.join(','),
          ...rows
        ].join('\n');
        
        // Crear y descargar el archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'api_data_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Datos exportados como CSV', 'success');
      } catch (error) {
        console.error('Error al exportar como CSV:', error);
        showNotification('Error al exportar como CSV', 'error');
      }
    }
    
    // Función para realizar una solicitud a la API con el token actual
    async function makeApiRequest(endpoint, method = 'GET', body = null) {
      try {
        // Construir la URL completa
        const baseUrl = appState.apiUrl.endsWith('/') 
          ? appState.apiUrl.slice(0, -1) 
          : appState.apiUrl;
        
        const url = endpoint.startsWith('/') 
          ? `${baseUrl}${endpoint}` 
          : `${baseUrl}/${endpoint}`;
        
        // Opciones de la solicitud
        const options = {
          method: method,
          credentials: 'include', // Incluir cookies
          headers: {}
        };
        
        // Agregar encabezados según el tipo de autenticación
        if (appState.authType === 'url-param' && appState.authParam) {
          // Agregar token como parámetro de URL
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}${appState.authParam}=${appState.apiToken}`;
        } else if (appState.authType !== 'none') {
          // Usar encabezados de autenticación
          options.headers = createAuthHeaders(
            appState.apiToken, 
            appState.authType, 
            appState.authHeader
          );
        } else {
          // Sin autenticación, solo encabezados básicos
          options.headers = {
            'Content-Type': 'application/json',
            'Accept': '*/*'
          };
        }
        
        // Agregar cuerpo si es necesario
        if (body && method !== 'GET' && method !== 'HEAD') {
          options.body = JSON.stringify(body);
        }
        
        console.log('Realizando solicitud a:', url);
        console.log('Opciones:', options);
        
        // Realizar la solicitud
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        
        // Intentar parsear la respuesta como JSON
        try {
          return await response.json();
        } catch (jsonError) {
          // Si no es JSON, devolver el texto
          return await response.text();
        }
      } catch (error) {
        console.error('Error en la solicitud API:', error);
        throw error;
      }
    }
    
    // Agregar botón para probar todos los métodos de autenticación
    function addTestAllAuthButton() {
      const tokenContainer = document.querySelector('#step2 .button-group');
      if (!tokenContainer) return;
      
      // Verificar si ya existe el botón
      if (document.getElementById('testAllAuthBtn')) return;
      
      // Crear el botón
      const testAllAuthBtn = createUIElement('button', 'secondary-button', 'Probar todos los métodos');
      testAllAuthBtn.id = 'testAllAuthBtn';
      
      // Manejar clic en el botón
      testAllAuthBtn.addEventListener('click', async () => {
        const token = apiTokenInput.value.trim();
        
        if (!token) {
            if (tokenError) tokenError.classList.remove('hidden');
            return;
          }
          
          if (tokenError) tokenError.classList.add('hidden');
          appState.apiToken = token;
          saveState();
          
          // Mostrar estado de prueba
          showNotification('Probando todos los métodos de autenticación...', 'info');
          
          try {
            // Construir la URL correctamente
            const baseUrl = appState.apiUrl.endsWith('/') 
              ? appState.apiUrl.slice(0, -1) 
              : appState.apiUrl;
            
            console.log('URL de la solicitud:', baseUrl);
            console.log('Token usado:', appState.apiToken);
            
            // Configuraciones de autenticación a probar
            const authConfigurations = [
              // Token sin prefijo (solo el token)
              { type: 'token-only', header: 'Authorization', name: 'Token sin prefijo' },
              // Bearer token estándar
              { type: 'Bearer', header: 'Authorization', name: 'Bearer Token' },
              // Token personalizado
              { type: 'token-only', header: 'Token', name: 'Token en cabecera Token' },
              // API Key
              { type: 'api-key', header: 'X-API-Key', name: 'API Key' },
              // Sin autenticación
              { type: 'none', name: 'Sin autenticación' },
              // Personalizado - token como parámetro de URL
              { type: 'url-param', param: 'token', name: 'Token como parámetro URL' },
              // Personalizado - token como parámetro de URL alternativo
              { type: 'url-param', param: 'api_key', name: 'API Key como parámetro URL' }
            ];
            
            let results = [];
            
            for (const config of authConfigurations) {
              try {
                console.log(`Probando configuración: ${JSON.stringify(config)}`);
                
                let requestUrl = baseUrl;
                let headers = {};
                let options = {
                  method: 'GET',
                  credentials: 'include' // Incluir cookies
                };
                
                if (config.type === 'url-param') {
                  // Agregar token como parámetro de URL
                  const separator = baseUrl.includes('?') ? '&' : '?';
                  requestUrl = `${baseUrl}${separator}${config.param}=${appState.apiToken}`;
                  headers = {
                    'Content-Type': 'application/json',
                    'Accept': '*/*'
                  };
                } else {
                  // Usar encabezados de autenticación
                  headers = createAuthHeaders(appState.apiToken, config.type, config.header);
                }
                
                options.headers = headers;
                
                console.log('Realizando solicitud con opciones:', {
                  url: requestUrl,
                  headers: headers
                });
                
                const response = await fetch(requestUrl, options);
                
                results.push({
                  name: config.name,
                  status: response.status,
                  statusText: response.statusText,
                  success: response.ok
                });
                
                console.log(`Respuesta para configuración ${config.name}:`, {
                  status: response.status,
                  statusText: response.statusText,
                  success: response.ok
                });
                
              } catch (configError) {
                console.error(`Error al intentar con configuración ${config.name}:`, configError);
                results.push({
                  name: config.name,
                  status: 'Error',
                  statusText: configError.message,
                  success: false
                });
              }
            }
            
            // Mostrar resultados
            let resultsHtml = '<div class="auth-test-results">';
            resultsHtml += '<h3>Resultados de pruebas de autenticación</h3>';
            resultsHtml += '<table>';
            resultsHtml += '<tr><th>Método</th><th>Estado</th><th>Resultado</th></tr>';
            
            results.forEach(result => {
              resultsHtml += `<tr>
                <td>${result.name}</td>
                <td>${result.status} ${result.statusText}</td>
                <td class="${result.success ? 'success' : 'error'}">${result.success ? 'Éxito' : 'Fallido'}</td>
              </tr>`;
            });
            
            resultsHtml += '</table></div>';
            
            // Crear modal para mostrar resultados
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
              <div class="modal-content">
                <span class="close">×</span>
                ${resultsHtml}
                <button class="primary-button close-modal">Cerrar</button>
              </div>
            `;
            
            document.body.appendChild(modal);
            
            // Manejar cierre del modal
            modal.querySelector('.close').addEventListener('click', () => {
              document.body.removeChild(modal);
            });
            
            modal.querySelector('.close-modal').addEventListener('click', () => {
              document.body.removeChild(modal);
            });
            
            // Configurar automáticamente el método exitoso
            const successfulConfig = results.find(result => result.success);
            if (successfulConfig) {
              const matchingConfig = authConfigurations.find(config => config.name === successfulConfig.name);
              if (matchingConfig) {
                if (matchingConfig.type === 'url-param') {
                  appState.authType = 'url-param';
                  appState.authParam = matchingConfig.param;
                } else {
                  appState.authType = matchingConfig.type;
                  appState.authHeader = matchingConfig.header || 'Authorization';
                }
                
                saveState();
                
                // Actualizar el selector de tipo de autenticación
                const authTypeSelector = document.getElementById('authTypeSelector');
                if (authTypeSelector) {
                  for (let i = 0; i < authTypeSelector.options.length; i++) {
                    if (authTypeSelector.options[i].value.toLowerCase() === matchingConfig.type.toLowerCase()) {
                      authTypeSelector.selectedIndex = i;
                      break;
                    }
                  }
                }
                
                showNotification(`Método exitoso configurado: ${successfulConfig.name}`, 'success');
              }
            } else {
              showNotification('Ningún método de autenticación tuvo éxito', 'error');
            }
            
          } catch (error) {
            console.error('Error al probar métodos de autenticación:', error);
            showNotification('Error al probar métodos de autenticación', 'error');
          }
        });
        
        // Agregar el botón al contenedor
        tokenContainer.appendChild(testAllAuthBtn);
      }
      
      // Función para agregar botón de exportación CSV
      function addExportButton() {
        const resourceDataContainer = document.querySelector('#step4');
        if (!resourceDataContainer) return;
        
        // Verificar si ya existe el botón
        if (document.getElementById('exportCsvBtn')) return;
        
        // Crear el botón
        const exportBtn = createUIElement('button', 'secondary-button', 'Exportar CSV');
        exportBtn.id = 'exportCsvBtn';
        
        // Manejar clic en el botón
        exportBtn.addEventListener('click', () => {
          if (appState.rawData && Array.isArray(appState.rawData)) {
            exportAsCSV(appState.rawData);
          } else if (appState.currentResource && appState.currentResource.data && Array.isArray(appState.currentResource.data)) {
            exportAsCSV(appState.currentResource.data);
          } else {
            showNotification('No hay datos en formato array para exportar', 'warning');
          }
        });
        
        // Agregar el botón después del botón de volver
        const backButton = resourceDataContainer.querySelector('button');
        if (backButton) {
          backButton.parentNode.insertBefore(exportBtn, backButton.nextSibling);
        } else {
          resourceDataContainer.appendChild(exportBtn);
        }
      }
      
      // Función para detectar y manejar errores CORS
      function handleCorsError(error) {
        if (
          error.message.includes('CORS') || 
          error.message.includes('Cross-Origin') ||
          error.message.includes('Access-Control-Allow-Origin')
        ) {
          showNotification('Error CORS: La API no permite solicitudes desde este origen', 'error');
          
          // Sugerir soluciones
          const modal = document.createElement('div');
          modal.className = 'modal';
          modal.innerHTML = `
            <div class="modal-content">
              <span class="close">×</span>
              <h3>Error de Política CORS Detectado</h3>
              <p>La API no permite solicitudes desde este origen debido a restricciones de seguridad CORS.</p>
              <h4>Posibles soluciones:</h4>
              <ol>
                <li>Configurar la API para permitir solicitudes desde este origen</li>
                <li>Usar un proxy CORS para evitar las restricciones</li>
                <li>Ejecutar la extensión en el mismo dominio que la API</li>
                <li>Usar una extensión de navegador para deshabilitar CORS (solo para desarrollo)</li>
              </ol>
              <button class="primary-button close-modal">Entendido</button>
            </div>
          `;
          
          document.body.appendChild(modal);
          
          // Manejar cierre del modal
          modal.querySelector('.close').addEventListener('click', () => {
            document.body.removeChild(modal);
          });
          
          modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
          });
          
          return true;
        }
        
        return false;
      }
      
      // Inicializar la aplicación con todas las mejoras
      document.addEventListener('DOMContentLoaded', () => {
        // Cargar estado
        loadState();
        
        // Agregar selector de tipo de autenticación
        addAuthTypeSelector();
        
        // Agregar botón para probar todos los métodos de autenticación
        addTestAllAuthButton();
        
        // Agregar botón de exportación CSV
        addExportButton();
        
        // Mejorar la visualización después de cargar los datos
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && 
                mutation.target.classList.contains('resource-data')) {
              enhanceResourceDataDisplay();
            }
          });
        });
        
        // Observar cambios en el contenedor de datos de recursos
        if (resourceData) {
          observer.observe(resourceData, { childList: true });
        }
      });
      
