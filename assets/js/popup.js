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
      
      // Realizar la petición a la API usando el token en el header
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'Authorization': ` ${appState.apiToken}`,
          'Content-Type': 'application/json',
          'Accept': '*/*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Respuesta de la API:', data);
      
      // Procesar los datos
      processApiResponse(data);
      
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

// Mostrar detalles de un recurso
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
  closeBtn.innerHTML = '&times;';
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

// Función para mostrar un mensaje de notificación temporal
function showNotification(message, type = 'info', duration = 3000) {
  // Crear el elemento de notificación si no existe
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.className = 'notification';
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

