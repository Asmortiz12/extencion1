/**
 * Módulo para compartir productos en WhatsApp
 * Permite crear una imagen con la información del producto y compartirla
 */

checkPendingWhatsAppMessage = function () {
    // Verificar si hay mensajes pendientes de WhatsApp
    chrome.runtime.sendMessage({ action: 'checkPendingWhatsAppMessage' }, function (response) {
        if (response && response.message) {
            alert(response.message);
        } else {
            console.log('No hay mensajes pendientes de WhatsApp');
        }
    });
};

/**
 * Inicializa la funcionalidad de compartir
 */
function initCompartir() {
    addShareButtonsToCards();
    addDetailsButtonsToCards();
    window.addEventListener('focus', checkPendingWhatsAppMessage);
}

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
 * Añade botones de detalles a todas las tarjetas de productos
 */
function addDetailsButtonsToCards() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const detailsButton = document.createElement('button');
        detailsButton.textContent = 'Ver Detalles';
        detailsButton.style.marginTop = '10px';
        detailsButton.addEventListener('click', () => showProductModal(card));
        card.appendChild(detailsButton);
    });
}

/**
 * Comparte la información de una tarjeta en WhatsApp (sin incluir el Base64)
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

    // Generar el mensaje
    let message = `*${title}*\n\n`;
    if (properties.referencia) message += `📋 Referencia: ${properties.referencia}\n`;
    if (properties.precio) message += `💰 Precio: ${properties.precio}\n`;
    if (properties.descripcion) message += `📝 Descripción: ${properties.descripcion}\n`;
    if (properties.id) message += `🆔 ID: ${properties.id}\n`;
    message += `\n✅ Producto disponible en nuestro catálogo.`;

    // Codificar el mensaje para evitar problemas con caracteres especiales
    const encodedMessage = encodeURIComponent(message);

    // Generar la URL de WhatsApp
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    // Abrir WhatsApp Web con el mensaje prellenado
    window.open(whatsappUrl, '_blank');
}

/**
 * Muestra un modal con la información del producto y el Base64 de la imagen
 * @param {HTMLElement} card - Tarjeta del producto
 */
async function showProductModal(card) {
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
    const imageUrl = img ? img.src : ''; // URL de la imagen en localhost

    // Generar la información del producto
    let productInfo = `<strong>${title}</strong><br>`;
    if (properties.referencia) productInfo += `📋 Referencia: ${properties.referencia}<br>`;
    if (properties.precio) productInfo += `💰 Precio: ${properties.precio}<br>`;
    if (properties.descripcion) productInfo += `📝 Descripción: ${properties.descripcion}<br>`;
    if (properties.id) productInfo += `🆔 ID: ${properties.id}<br>`;

    try {
        // Convertir la imagen a un Data URL
        const imageDataUrl = await convertImageToDataUrl(imageUrl);

        // Crear el contenido del modal
        const modalContent = `
            <div style="padding: 20px; font-family: Arial, sans-serif;">
                <h2>Información del Producto</h2>
                <p>${productInfo}</p>
                <h3>Imagen en Base64</h3>
                <textarea style="width: 100%; height: 150px;" readonly>${imageDataUrl}</textarea>
                <button id="closeModal" style="margin-top: 10px; padding: 10px 20px; background-color: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer;">Cerrar</button>
            </div>
        `;

        // Crear el modal
        const modal = document.createElement('div');
        modal.id = 'productModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';

        // Agregar el contenido al modal
        modal.innerHTML = `
            <div style="background: white; border-radius: 10px; max-width: 500px; width: 90%; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
                ${modalContent}
            </div>
        `;

        // Agregar el modal al documento
        document.body.appendChild(modal);

        // Cerrar el modal al hacer clic en el botón
        document.getElementById('closeModal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    } catch (error) {
        console.error('Error al mostrar el modal:', error);
        alert('No se pudo cargar la información del producto. Por favor, intenta de nuevo.');
    }
}

/**
 * Convierte una imagen en un Data URL (base64)
 * @param {string} imageUrl - URL de la imagen local
 * @returns {Promise<string>} - Data URL de la imagen
 */
async function convertImageToDataUrl(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error al convertir la imagen a Data URL:', error);
        throw error;
    }
}
