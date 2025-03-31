let apiConnection;
let apiUrlInput, apiTokenInput; // Declarar aquí
let apiUrlError, tokenError, step1, step2, step3, step4, connectionStatus, resourceList, resourcesContainer, currentResource, resourceData;

document.addEventListener("DOMContentLoaded", () => {
    apiConnection = new ApiConnection();

    // Inicializar las referencias a los elementos del DOM
    apiUrlInput = document.getElementById("apiUrl");
    apiTokenInput = document.getElementById("apiToken");
    apiUrlError = document.getElementById("apiUrlError");
    tokenError = document.getElementById("tokenError");
    step1 = document.getElementById("step1");
    step2 = document.getElementById("step2");
    step3 = document.getElementById("step3");
    step4 = document.getElementById("step4");
    connectionStatus = document.getElementById("connectionStatus");
    resourceList = document.getElementById("resourceList");
    resourcesContainer = document.getElementById("resourcesContainer");
    currentResource = document.getElementById("currentResource");
    resourceData = document.getElementById("resourceData");

    // Configurar eventos directamente usando los IDs
    document.getElementById("nextToToken").addEventListener("click", () => goToTokenStep(apiUrlInput, apiUrlError));
    document.getElementById("connectApi").addEventListener("click", () => connectToApi(apiTokenInput, tokenError));
    document.getElementById("backToUrl").addEventListener("click", goToUrlStep);
    document.getElementById("backToToken").addEventListener("click", () => goToTokenStep(apiUrlInput, apiUrlError));
    document.getElementById("backToResources").addEventListener("click", goToResourcesStep);

    // Cargar configuración guardada
    loadSavedConfig(apiUrlInput, apiTokenInput);
});

/**
 * Función para cargar configuración guardada
 * @param {HTMLInputElement} urlInput - Input de URL
 * @param {HTMLInputElement} tokenInput - Input de token
 */
async function loadSavedConfig(urlInput, tokenInput) {
  try {
    const hasConfig = await apiConnection.loadConfig();
    if (hasConfig) {
      urlInput.value = apiConnection.baseUrl;
      tokenInput.value = apiConnection.token;
    }
  } catch (error) {
    console.error("Error al cargar la configuración:", error);
  }
}

/**
 * Función para ir al paso de token
 * @param {HTMLInputElement} urlInput - Input de URL
 * @param {HTMLElement} urlError - Elemento para mostrar errores
 */
function goToTokenStep(urlInput, urlError) {
  const isValidUrl = apiConnection.setBaseUrl(urlInput.value);

  if (!isValidUrl) {
    urlError.classList.remove("hidden");
    urlError.textContent = "Por favor ingresa una URL válida";
    return;
  }

  apiUrlError.classList.add("hidden");
  step1.classList.add("hidden");
  step2.classList.remove("hidden");
}

/**
 * Función para volver al paso de URL
 */
function goToUrlStep() {
  step2.classList.add("hidden");
  step1.classList.remove("hidden");
}

/**
 * Función para volver al paso de recursos
 */
function goToResourcesStep() {
  step4.classList.add("hidden");
  step3.classList.remove("hidden");
}

/**
 * Función para conectar a la API
 * @param {HTMLInputElement} tokenInput - Input de token
 * @param {HTMLElement} tokenErrorElement - Elemento para mostrar errores
 */
async function connectToApi(tokenInput, tokenErrorElement) {
  const isValidToken = apiConnection.setToken(tokenInput.value);

  if (!isValidToken) {
    tokenErrorElement.classList.remove("hidden");
    tokenErrorElement.textContent = "Por favor ingresa un token válido";
    return;
  }

  // Configurar el formato del token (sin Bearer)
  apiConnection.setTokenFormat(false);

  tokenErrorElement.classList.add("hidden");
  connectionStatus.innerHTML = "<p>Conectando a la API...</p>";
  step2.classList.add("hidden");
  step3.classList.remove("hidden");

  // Conectar directamente a la API
  attemptConnection();
}

/**
 * Función para intentar la conexión
 */
async function attemptConnection() {
  connectionStatus.innerHTML =
    "<p>Conectando a la API con el token en el encabezado personalizado...</p>";

  try {
    const result = await apiConnection.connect();

    if (result.success) {
      connectionStatus.innerHTML = `<p class="success">${result.message}</p>`;
      apiConnection.saveConfig();
      loadResources();
    } else {
      let errorMessage = result.message;

      // Si es un error 401, dar instrucciones más específicas
      if (errorMessage.includes("401")) {
        errorMessage +=
          "<br><br>Posibles soluciones:<br>" +
          "1. Verifica que el token sea correcto<br>" +
          "2. El token puede haber expirado, solicita uno nuevo<br>" +
          "3. Asegúrate de tener los permisos necesarios";
      }

      // Si es un error de rate limiting (429)
      if (
        errorMessage.includes("429") ||
        errorMessage.includes("demasiadas solicitudes")
      ) {
        errorMessage +=
          "<br><br>Has alcanzado el límite de solicitudes permitidas. Posibles soluciones:<br>" +
          "1. Espera unos minutos antes de intentar nuevamente<br>" +
          "2. Reduce la frecuencia de tus solicitudes<br>" +
          "3. Contacta al administrador de la API si necesitas un límite mayor";
      }

      connectionStatus.innerHTML = `<p class="error">${errorMessage}</p>`;

      // Agregar botón para volver a configurar
      const retryButton = document.createElement("button");
      retryButton.textContent = "Volver a configurar";
      retryButton.addEventListener("click", () => {
        step3.classList.add("hidden");
        step2.classList.remove("hidden");
      });
      connectionStatus.appendChild(retryButton);
    }
  } catch (error) {
    connectionStatus.innerHTML = `<p class="error">Error inesperado: ${error.message}</p>`;

    // Agregar botón para volver a intentar
    const retryButton = document.createElement("button");
    retryButton.textContent = "Volver a configurar";
    retryButton.addEventListener("click", () => {
      step3.classList.add("hidden");
      step2.classList.remove("hidden");
    });
    connectionStatus.appendChild(retryButton);
  }
}

/**
 * Función para cargar recursos disponibles
 */
function loadResources() {
  const resources = apiConnection.getResources();

  if (resources && resources.length > 0) {
    resourceList.innerHTML = "";

    resources.forEach((resource) => {
      const resourceItem = document.createElement("div");
      resourceItem.className = "resource-item";
      resourceItem.textContent = resource;
      resourceItem.addEventListener("click", () =>
        loadResourceData(resource)
      );
      resourceList.appendChild(resourceItem);
    });

    resourcesContainer.classList.remove("hidden");
  } else {
    connectionStatus.innerHTML +=
      "<p>No se encontraron recursos disponibles.</p>";
  }
}

/**
 * Función para cargar datos de un recurso específico
 * @param {string} resource - Nombre del recurso
 */
async function loadResourceData(resource) {
  currentResource.textContent = resource;
  resourceData.innerHTML = "<p>Cargando datos...</p>";

  step3.classList.add("hidden");
  step4.classList.remove("hidden");

  try {
    const result = await apiConnection.getResourceData(resource);

    if (result.success) {
      displayResourceData(result.data);
    } else {
      let errorMessage = result.message;

      // Si es un error 401, dar instrucciones más específicas
      if (errorMessage.includes("401")) {
        errorMessage +=
          "<br><br>Posibles soluciones:<br>" +
          "1. Verifica que el token sea correcto<br>" +
          "2. El token puede haber expirado, solicita uno nuevo<br>" +
          "3. Asegúrate de tener los permisos necesarios";
      }

      // Si es un error de rate limiting (429)
      if (
        errorMessage.includes("429") ||
        errorMessage.includes("demasiadas solicitudes")
      ) {
        errorMessage +=
          "<br><br>Has alcanzado el límite de solicitudes permitidas. Posibles soluciones:<br>" +
          "1. Espera unos minutos antes de intentar nuevamente<br>" +
          "2. Reduce la frecuencia de tus solicitudes";

        // Agregar botón para reintentar después de un tiempo
        resourceData.innerHTML = `<p class="error">${errorMessage}</p>`;

        const waitTime = 30; // 30 segundos
        const retryLaterButton = document.createElement("button");
        retryLaterButton.textContent = `Reintentar en ${waitTime} segundos`;
        retryLaterButton.disabled = true;

        let countdown = waitTime;
        const timer = setInterval(() => {
          countdown--;
          retryLaterButton.textContent = `Reintentar en ${countdown} segundos`;

          if (countdown <= 0) {
            clearInterval(timer);
            retryLaterButton.textContent = "Reintentar ahora";
            retryLaterButton.disabled = false;
          }
        }, 1000);

        retryLaterButton.addEventListener("click", () => {
          if (!retryLaterButton.disabled) {
            loadResourceData(resource);
          }
        });

        resourceData.appendChild(retryLaterButton);
        return;
      }

      resourceData.innerHTML = `<p class="error">${errorMessage}</p>`;

      // Si es un error de autenticación, mostrar un botón para volver a la configuración del token
      if (
        result.message.includes("401") ||
        result.message.toLowerCase().includes("autenticación")
      ) {
        const retryButton = document.createElement("button");
        retryButton.textContent = "Volver a configurar el token";
        retryButton.addEventListener("click", () => {
          step4.classList.add("hidden");
          step2.classList.remove("hidden");
        });
        resourceData.appendChild(retryButton);
      }
    }
  } catch (error) {
    resourceData.innerHTML = `<p class="error">Error inesperado: ${error.message}</p>`;

    // Agregar botón para volver a intentar
    const retryButton = document.createElement("button");
    retryButton.textContent = "Volver a intentar";
    retryButton.addEventListener("click", () => loadResourceData(resource));
    resourceData.appendChild(retryButton);
  }
}

/**
 * Función para añadir el token myft a una URL de imagen si no lo tiene
 * @param {string} url - URL de la imagen
 * @returns {string} - URL con token añadido si es necesario
 */
function addMyFilesTokenToUrl(url) {
  if (!url) return url;

  try {
    // Si la URL es relativa, construir una URL completa
    let fullUrl = url;
    if (url.startsWith("/")) {
      const baseUrlObj = new URL(apiConnection.baseUrl);
      fullUrl = `${baseUrlObj.origin}${url}`;
    }

    // Verificar si la URL ya tiene el parámetro myft
    const urlObj = new URL(fullUrl);
    if (!urlObj.searchParams.has("myft") && apiConnection.token) {
      // Añadir el token como parámetro myft
      urlObj.searchParams.set("myft", apiConnection.token);
      return urlObj.toString();
    }

    return fullUrl;
  } catch (e) {
    console.error("Error al procesar URL de imagen:", e);
    return url;
  }
}

/**
 * Función para mostrar datos del recurso en formato de tarjetas
 * @param {Array|Object} data - Datos del recurso
 */
function displayResourceData(data) {
  resourceData.innerHTML = "";

  // Función auxiliar para decodificar texto con caracteres especiales
  function decodeText(text) {
    if (typeof text !== "string") return text;

    try {
      // Intentar decodificar texto que podría estar mal codificado
      return decodeURIComponent(escape(text));
    } catch (e) {
      console.warn("Error al decodificar texto:", e);
      return text;
    }
  }

  // Decodificar todos los textos en los datos
  if (Array.isArray(data)) {
    data = data.map((item) => {
      const newItem = { ...item };
      Object.keys(newItem).forEach((key) => {
        if (typeof newItem[key] === "string") {
          newItem[key] = decodeText(newItem[key]);
        }
      });
      return newItem;
    });
  } else if (typeof data === "object" && data !== null) {
    const newData = { ...data };
    Object.keys(newData).forEach((key) => {
      if (typeof newData[key] === "string") {
        newData[key] = decodeText(newData[key]);
      }
    });
    data = newData;
  }

  if (Array.isArray(data) && data.length > 0) {
    // Crear contenedor para las tarjetas
    const cardsContainer = document.createElement("div");
    cardsContainer.className = "cards-container";
    cardsContainer.style.display = "grid";
    cardsContainer.style.gridTemplateColumns =
      "repeat(auto-fill, minmax(250px, 1fr))";
    cardsContainer.style.gap = "16px";
    cardsContainer.style.padding = "16px";

    // Crear una tarjeta para cada elemento
    data.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.border = "1px solid #ddd";
      card.style.borderRadius = "8px";
      card.style.padding = "16px";
      card.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
      card.style.backgroundColor = "#fff";
      card.style.transition = "transform 0.3s ease";
      card.style.overflow = "hidden";
      card.style.display = "flex";
      card.style.position = "relative"; // Para posicionamiento absoluto del botón de compartir

      // Efecto hover
      card.onmouseover = () => (card.style.transform = "translateY(-5px)");
      card.onmouseout = () => (card.style.transform = "translateY(0)");

            // Contenedor para la imagen (lado izquierdo)
            const imageContainer = document.createElement("div");
            imageContainer.style.flex = "0 0 40%";
            imageContainer.style.marginRight = "16px";
      
            // Contenedor para el contenido (lado derecho)
            const contentContainer = document.createElement("div");
            contentContainer.style.flex = "1";
      
            // Buscar imagen en el campo 'imagenes' si existe
            let imageUrl = null;
      
            // Verificar si hay un campo 'imagenes' que es un array
            if (
              item.imagenes &&
              Array.isArray(item.imagenes) &&
              item.imagenes.length > 0
            ) {
              // Tomar la primera imagen del array
              const firstImage = item.imagenes[0];
      
              // Verificar si la imagen tiene una URL
              if (firstImage && firstImage.url) {
                imageUrl = firstImage.url;
                console.log("URL de imagen encontrada:", imageUrl);
              }
            } else {
              // Buscar en otros campos comunes de imágenes
              const imageProperties = [
                "imagen",
                "image",
                "photo",
                "foto",
                "url",
                "thumbnail",
                "avatar",
              ];
              for (const prop of imageProperties) {
                if (
                  item[prop] &&
                  typeof item[prop] === "string" &&
                  (item[prop].startsWith("http") || item[prop].startsWith("/"))
                ) {
                  imageUrl = item[prop];
                  console.log(
                    "URL de imagen encontrada en propiedad:",
                    prop,
                    imageUrl
                  );
                  break;
                }
              }
            }
      
            // Si encontramos una imagen, crear un contenedor para verla
            if (imageUrl) {
              console.log("URL de imagen encontrada:", imageUrl);
      
              // Crear un contenedor para la imagen con un botón para abrirla en una nueva pestaña
              const imageViewContainer = document.createElement("div");
              imageViewContainer.style.width = "100%";
              imageViewContainer.style.height = "120px";
              imageViewContainer.style.backgroundColor = "#f0f0f0";
              imageViewContainer.style.borderRadius = "4px";
              imageViewContainer.style.display = "flex";
              imageViewContainer.style.flexDirection = "column";
              imageViewContainer.style.alignItems = "center";
              imageViewContainer.style.justifyContent = "center";
              imageViewContainer.style.cursor = "pointer";
              imageViewContainer.style.position = "relative";
              imageViewContainer.style.overflow = "hidden";
      
              // Intentar cargar la imagen directamente
              const img = document.createElement("img");
              img.alt = "Imagen del producto";
              img.style.width = "100%";
              img.style.height = "100%";
              img.style.objectFit = "cover";
              img.style.borderRadius = "4px";
              img.style.display = "none"; // Ocultar hasta que se cargue
      
              // Mostrar un mensaje mientras se carga
              const loadingContainer = document.createElement("div");
              loadingContainer.style.position = "absolute";
              loadingContainer.style.top = "0";
              loadingContainer.style.left = "0";
              loadingContainer.style.width = "100%";
              loadingContainer.style.height = "100%";
              loadingContainer.style.display = "flex";
              loadingContainer.style.flexDirection = "column";
              loadingContainer.style.alignItems = "center";
              loadingContainer.style.justifyContent = "center";
              loadingContainer.style.backgroundColor = "#f0f0f0";
      
              // Agregar un icono de imagen usando SVG
              const imgIcon = document.createElement("div");
              imgIcon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#666666" stroke-width="2"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="#666666"/>
        <path d="M6 16L8 14C8.5 13.5 9.5 13.5 10 14L14 18" stroke="#666666" stroke-width="2"/>
        <path d="M14 16L16 14C16.5 13.5 17.5 13.5 18 14L21 17" stroke="#666666" stroke-width="2"/>
      </svg>`;
              imgIcon.style.marginBottom = "8px";
      
              const loadingText = document.createElement("div");
              loadingText.textContent = "Cargando imagen...";
              loadingText.style.fontSize = "12px";
      
              loadingContainer.appendChild(imgIcon);
              loadingContainer.appendChild(loadingText);
      
              // Cuando la imagen se carga correctamente
              img.onload = function () {
                loadingContainer.style.display = "none";
                img.style.display = "block";
              };
      
              // Si hay error al cargar la imagen
              img.onerror = function () {
                loadingContainer.innerHTML = "";
      
                // Mostrar mensaje de error con SVG
                const errorIcon = document.createElement("div");
                errorIcon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#666666" stroke-width="2"/>
        <path d="M9 9L15 15" stroke="#666666" stroke-width="2"/>
        <path d="M15 9L9 15" stroke="#666666" stroke-width="2"/>
      </svg>`;
                errorIcon.style.marginBottom = "8px";
      
                const errorText = document.createElement("div");
                errorText.textContent = "Ver imagen";
                errorText.style.fontSize = "12px";
      
                loadingContainer.appendChild(errorIcon);
                loadingContainer.appendChild(errorText);
      
                // Hacer que el contenedor sea clickeable para abrir la imagen en una nueva pestaña
                imageViewContainer.onclick = function () {
                  window.open(imageUrl, "_blank");
                };
              };
      
              // Asignar la URL a la imagen
              img.src = imageUrl;
      
              // Agregar elementos al contenedor
              imageViewContainer.appendChild(img);
              imageViewContainer.appendChild(loadingContainer);
              imageContainer.appendChild(imageViewContainer);
            } else {
              // Si no hay imagen, mostrar un placeholder
              showImagePlaceholder(imageContainer);
            }
      
            // Agregar propiedades del item al contenido
            const title = document.createElement("h3");
            title.style.margin = "0 0 8px 0";
            title.style.fontSize = "16px";
            title.textContent =
              item.nombre || item.name || item.title || "Sin título";
            contentContainer.appendChild(title);
      
            // Mostrar otras propiedades relevantes
            const properties = ["referencia", "precio", "descripcion", "id"];
            properties.forEach((prop) => {
              if (item[prop] !== undefined) {
                const propElement = document.createElement("p");
                propElement.style.margin = "4px 0";
                propElement.style.fontSize = "14px";
      
                // Formatear precio si es necesario - CAMBIADO A DÓLARES
                if (prop === "precio" && !isNaN(parseFloat(item[prop]))) {
                  try {
                    // Usar Intl.NumberFormat para formatear correctamente el precio con el símbolo $
                    const formatter = new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    });
                    propElement.textContent = `${prop}: ${formatter.format(
                      parseFloat(item[prop])
                    )}`;
                  } catch (e) {
                    // Si hay un error en el formateo, mostrar el precio sin formato
                    propElement.textContent = `${prop}: ${parseFloat(
                      item[prop]
                    ).toFixed(2)}`;
                  }
                } else {
                  propElement.textContent = `${prop}: ${item[prop]}`;
                }
      
                contentContainer.appendChild(propElement);
              }
            });
      
            // Agregar botón de compartir en WhatsApp
            const shareButtonContainer = document.createElement("div");
            shareButtonContainer.style.position = "absolute";
            shareButtonContainer.style.top = "10px";
            shareButtonContainer.style.right = "10px";
            shareButtonContainer.style.zIndex = "10";
            
            const shareButton = document.createElement("button");
            shareButton.className = "share-button";
            shareButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
              </svg>
            `;
            shareButton.style.backgroundColor = "#25D366";
            shareButton.style.color = "white";
            shareButton.style.border = "none";
            shareButton.style.borderRadius = "50%";
            shareButton.style.width = "36px";
            shareButton.style.height = "36px";
            shareButton.style.display = "flex";
            shareButton.style.justifyContent = "center";
            shareButton.style.alignItems = "center";
            shareButton.style.cursor = "pointer";
            shareButton.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
            shareButton.title = "Compartir en WhatsApp";
            
            // Añadir efecto hover
            shareButton.onmouseover = function() {
              this.style.backgroundColor = "#128C7E";
            };
            shareButton.onmouseout = function() {
              this.style.backgroundColor = "#25D366";
            };
            
            // Añadir evento de clic para compartir
            shareButton.addEventListener("click", (e) => {
              e.stopPropagation(); // Evitar que el clic se propague a la tarjeta
              if (typeof shareOnWhatsApp === 'function') {
                shareOnWhatsApp(card);
              } else {
                alert("La funcionalidad de compartir no está disponible. Asegúrate de que el archivo compartir.js esté cargado.");
              }
            });
            
            shareButtonContainer.appendChild(shareButton);
            card.appendChild(shareButtonContainer);
      
            // Agregar contenedores a la tarjeta
            card.appendChild(imageContainer);
            card.appendChild(contentContainer);
      
            // Agregar tarjeta al contenedor
            cardsContainer.appendChild(card);
          });
      
          resourceData.appendChild(cardsContainer);
      
          // Agregar información sobre el número de registros
          const infoText = document.createElement("p");
          infoText.className = "info-text";
          infoText.textContent = `Se encontraron ${data.length} registros.`;
          infoText.style.textAlign = "center";
          infoText.style.marginTop = "16px";
          infoText.style.color = "#666";
          resourceData.appendChild(infoText);
      
          // Inicializar la funcionalidad de compartir si está disponible
          if (typeof initCompartir === 'function') {
            initCompartir();
          }
        } else if (typeof data === "object" && data !== null) {
          // Mostrar objeto individual como lista de propiedades
          const list = document.createElement("ul");
          list.className = "data-list";
          list.style.listStyle = "none";
          list.style.padding = "0";
      
          Object.entries(data).forEach(([key, value]) => {
            const item = document.createElement("li");
            item.style.padding = "8px 0";
            item.style.borderBottom = "1px solid #eee";
      
            if (value === null) {
              item.innerHTML = `<strong>${key}:</strong> null`;
            } else if (typeof value === "object") {
              item.innerHTML = `<strong>${key}:</strong> <pre>${JSON.stringify(
                value,
                null,
                2
              )}</pre>`;
            } else {
              item.innerHTML = `<strong>${key}:</strong> ${value}`;
            }
      
            list.appendChild(item);
          });
      
          resourceData.appendChild(list);
        } else {
          resourceData.innerHTML =
            "<p>No hay datos disponibles para este recurso o el formato no es reconocido.</p>";
        }
      }
      
      /**
       * Verifica si una URL ya contiene el token myft
       * @param {string} url - URL a verificar
       * @returns {boolean} - True si la URL ya contiene el token
       */
      function hasMyFilesToken(url) {
        try {
          const urlObj = new URL(url);
          return urlObj.searchParams.has("myft");
        } catch (e) {
          return false;
        }
      }
      
      /**
       * Muestra error de imagen con SVG
       * @param {HTMLElement} container - Contenedor donde mostrar el error
       * @param {string} errorMessage - Mensaje de error
       */
      function showImageError(container, errorMessage) {
        console.error("Error al cargar la imagen:", errorMessage);
      
        // Mostrar un placeholder con mensaje de error
        const errorContainer = document.createElement("div");
        errorContainer.style.backgroundColor = "#f8d7da";
        errorContainer.style.color = "#721c24";
        errorContainer.style.padding = "10px";
        errorContainer.style.borderRadius = "4px";
        errorContainer.style.textAlign = "center";
        errorContainer.style.height = "100px";
        errorContainer.style.display = "flex";
        errorContainer.style.flexDirection = "column";
        errorContainer.style.justifyContent = "center";
      
        // Usar SVG en lugar de emoji
        errorContainer.innerHTML = `
          <div style="margin-bottom: 10px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="#721c24" stroke-width="2"/>
        <path d="M9 9L15 15" stroke="#721c24" stroke-width="2"/>
        <path d="M15 9L9 15" stroke="#721c24" stroke-width="2"/>
      </svg>
    </div>
    <div>Error al cargar la imagen</div>
    <div style="font-size: 12px; margin-top: 5px;">${errorMessage}</div>
  `;

  container.innerHTML = ""; // Limpiar cualquier contenido previo
  container.appendChild(errorContainer);
}

/**
 * Muestra placeholder cuando no hay imagen con SVG
 * @param {HTMLElement} container - Contenedor donde mostrar el placeholder
 */
function showImagePlaceholder(container) {
  const placeholder = document.createElement("div");
  placeholder.style.backgroundColor = "#f0f0f0";
  placeholder.style.color = "#666";
  placeholder.style.padding = "10px";
  placeholder.style.borderRadius = "4px";
  placeholder.style.textAlign = "center";
  placeholder.style.height = "100px";
  placeholder.style.display = "flex";
  placeholder.style.flexDirection = "column";
  placeholder.style.justifyContent = "center";

  // Usar SVG en lugar de emoji
  placeholder.innerHTML = `
    <div style="margin-bottom: 10px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#666666" stroke-width="2"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="#666666"/>
        <path d="M6 16L8 14C8.5 13.5 9.5 13.5 10 14L14 18" stroke="#666666" stroke-width="2"/>
        <path d="M14 16L16 14C16.5 13.5 17.5 13.5 18 14L21 17" stroke="#666666" stroke-width="2"/>
      </svg>
    </div>
    <div>Sin imagen</div>
  `;

  container.appendChild(placeholder);
}

/**
 * Agrega botón para limpiar caché
 */
function addClearCacheButton() {
  if (!apiConnection) {
    console.error("apiConnection no está definido");
    return;
  }

  const clearCacheButton = document.createElement("button");
  clearCacheButton.textContent = "Limpiar caché";
  clearCacheButton.className = "clear-cache-button";
  clearCacheButton.style.marginTop = "20px";
  clearCacheButton.style.padding = "8px 16px";
  clearCacheButton.style.backgroundColor = "#f44336";
  clearCacheButton.style.color = "white";
  clearCacheButton.style.border = "none";
  clearCacheButton.style.borderRadius = "4px";
  clearCacheButton.style.cursor = "pointer";
  clearCacheButton.addEventListener("click", () => {
    apiConnection.clearCache();
    alert("Caché limpiada correctamente");
  });

  // Agregar el botón al final de la página
  const container = document.querySelector(".container");
  if (container) {
    container.appendChild(clearCacheButton);
  }
}

// Cargar configuración guardada al iniciar
document.addEventListener("DOMContentLoaded", async () => {
  // Asegurarse de que apiConnection esté definido
  if (!apiConnection) {
    apiConnection = new ApiConnection();
  }

  // Inicializar referencias a los elementos del DOM si no están definidas
  if (!apiUrlInput) {
    apiUrlInput = document.getElementById("apiUrl");
  }
  if (!apiTokenInput) {
    apiTokenInput = document.getElementById("apiToken");
  }

  // Verificar si los elementos del DOM existen
  if (!apiUrlInput || !apiTokenInput) {
    console.error("No se pudieron encontrar los elementos del DOM necesarios.");
    return;
  }

  // Cargar configuración guardada
  try {
    await loadSavedConfig(apiUrlInput, apiTokenInput);
  } catch (error) {
    console.error("Error al cargar la configuración guardada:", error);
  }

  // Agregar botón para limpiar caché
  try {
    addClearCacheButton();
  } catch (error) {
    console.error("Error al agregar el botón para limpiar caché:", error);
  }

  // Cargar script de compartir si no está cargado
  if (typeof initCompartir !== "function") {
    const script = document.createElement("script");
    script.src = "assets/js/compartir.js";
    script.onload = function () {
      console.log("Script de compartir cargado correctamente");
      if (typeof initCompartir === "function") {
        initCompartir();
      }
    };
    script.onerror = function () {
      console.error("Error al cargar el script de compartir");
    };
    document.head.appendChild(script);
  }
});
