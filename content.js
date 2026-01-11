//extension\content.js

let isTranslationEnabled = false;
let observer = null;
let translationWindow = null;
let chatContainer = null;
let isProcessing = false;
const translationQueue = [];
let isTranslating = false;

const debounce = (func, wait = 50) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Función para mostrar un estado en pantalla
function showStatus(message) {
  const status = document.createElement("div");
  status.className = "translation-status";
  status.textContent = message;
  document.body.appendChild(status);
  setTimeout(() => status.remove(), 2000);
}

// Crea una ventana para mostrar las traducciones
function createTranslationWindow() {
  if (translationWindow) {
    if (observer) {
      observer.disconnect();
      startObserver();
    }
    return;
  }

  translationWindow = document.createElement("div");
  translationWindow.className = "translation-window";
  translationWindow.innerHTML = `
    <div class="translation-header">
      <span>Traducciones</span>
      <button class="tab-button" id="controls-tab">Controles</button>
      <button class="tab-button" id="commands-tab">Comandos</button>
      <button class="translation-close">×</button>
    </div>
    <div class="translation-tabs">
      <div class="translation-controls hidden" id="controls-section">
        <button class="control-button" id="pause-translation">Pausar</button>
        <button class="control-button" id="resume-translation">Reanudar</button>
        <button class="control-button" id="reset-observer">Reiniciar</button>
      </div>
      <div class="translation-commands hidden" id="commands-section">
        <p><strong>Shift + T:</strong> Activar/Desactivar traducción y ventana</p>
        <p><strong>Shift + S:</strong> Pausar traducción</p>
        <p><strong>Shift + R:</strong> Reanudar traducción</p>
        <p><strong>Shift + O:</strong> Reiniciar observador</p>
      </div>
    </div>T
    <div class="translation-content"></div>
  `;
  translationWindow.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px; /* Más ancho */
    max-height: 600px; /* Más Shifto */
    background: rgba(33, 33, 33, 0.95);
    color: white;
    border-radius: 8px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    cursor: move;
  `;

  translationWindow.addEventListener("mousedown", initiateDrag);
  document.body.appendChild(translationWindow);

  translationWindow
    .querySelector(".translation-close")
    .addEventListener("click", () => {
      isTranslationEnabled = false;
      if (observer) observer.disconnect();
      translationWindow.remove();
      translationWindow = null;
      console.clear();
    });

  // Botones de pestañas
  document.getElementById("controls-tab").addEventListener("click", () => {
    const controlsSection = document.getElementById("controls-section");
    const commandsSection = document.getElementById("commands-section");
    const controlsTab = document.getElementById("controls-tab");
    const commandsTab = document.getElementById("commands-tab");

    controlsSection.classList.toggle("hidden");

    if (!controlsSection.classList.contains("hidden")) {
      commandsSection.classList.add("hidden");
      controlsTab.classList.add("active");
      commandsTab.classList.remove("active");
    } else {
      controlsTab.classList.remove("active");
    }
  });

  document.getElementById("commands-tab").addEventListener("click", () => {
    const controlsSection = document.getElementById("controls-section");
    const commandsSection = document.getElementById("commands-section");
    const controlsTab = document.getElementById("controls-tab");
    const commandsTab = document.getElementById("commands-tab");

    commandsSection.classList.toggle("hidden");

    if (!commandsSection.classList.contains("hidden")) {
      controlsSection.classList.add("hidden");
      commandsTab.classList.add("active");
      controlsTab.classList.remove("active");
    } else {
      commandsTab.classList.remove("active");
    }
  });

  // Botones de control
  document.getElementById("pause-translation").addEventListener("click", () => {
    isTranslationEnabled = false;
    showStatus("Traducción pausada");
  });

  document
    .getElementById("resume-translation")
    .addEventListener("click", () => {
      if (translationWindow) {
        isTranslationEnabled = true;
        showStatus("Traducción reanudada");
      }
    });

  document.getElementById("reset-observer").addEventListener("click", () => {
    if (observer) {
      observer.disconnect();
      startObserver();
      showStatus("Observador reiniciado");
    }
  });
}

// Lógica para mover la ventana
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function initiateDrag(e) {
  isDragging = true;
  dragOffsetX = e.clientX - translationWindow.offsetLeft;
  dragOffsetY = e.clientY - translationWindow.offsetTop;
  document.addEventListener("mousemove", moveWindow);
  document.addEventListener("mouseup", stopDrag);
}

function moveWindow(e) {
  if (!isDragging) return;
  translationWindow.style.left = `${e.clientX - dragOffsetX}px`;
  translationWindow.style.top = `${e.clientY - dragOffsetY}px`;
}

function stopDrag() {
  isDragging = false;
  document.removeEventListener("mousemove", moveWindow);
  document.removeEventListener("mouseup", stopDrag);
}

// Añade traducción a la ventana
function addTranslation(username, originShiftext, translatedText, fromLang) {
  if (!translationWindow) return;

  const content = translationWindow.querySelector(".translation-content");
  const messageDiv = document.createElement("div");
  messageDiv.className = "translation-message";
  messageDiv.innerHTML = `
    <div class="translation-original">
      <strong>${username}:</strong> ${originShiftext}
    </div>
    <div class="translation-lang">[${fromLang} → ES]</div>
    <div class="translation-text">${translatedText}</div>
  `;


  content.appendChild(messageDiv);
  content.scrollTop = content.scrollHeight;
}

// Traduce texto con la API de Google Translate
async function translateText(text, targetLang = "es") {
  try {


    const detectLangUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&dt=ld&q=${encodeURIComponent(
      text
    )}`;
    const detectRes = await fetch(detectLangUrl);
    const detectData = await detectRes.json();

    const detectedLang = detectData[2] || "auto";


    if (detectedLang === "es") {

      return {
        translatedText: text,
        detectedSourceLang: "es",
        success: true,
      };
    }

    const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${detectedLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
      text
    )}`;
    const translateRes = await fetch(translateUrl);
    const translateData = await translateRes.json();

    const translatedText = translateData[0]?.[0]?.[0] || text;


    return {
      translatedText,
      detectedSourceLang: detectedLang,
      success: true,
    };
  } catch (err) {
    console.error("Error traduciendo texto:", text, err);
    return { success: false };
  }
}

// Procesa la cola de mensajes para traducir
async function processQueue() {
  if (translationQueue.length === 0 || isTranslating) return;
  isTranslating = true;

  const { node } = translationQueue.shift();

  try {
    const messageBody = node.querySelector(".message-body");
    const usernameElement = node.querySelector(".user-levels-username-text");

    if (!messageBody) {
      console.warn("No se encontró el cuerpo del mensaje en el nodo:", node);
      return;
    }

    const username = usernameElement
      ? usernameElement.textContent.trim()
      : "Desconocido";
    const originShiftext = messageBody.textContent
      .replace(username, "")
      .replace("ex", "")
      .trim();



    const translation = await translateText(originShiftext);

    if (isTranslationEnabled) {
      addTranslation(
        username,
        originShiftext,
        translation.translatedText,
        translation.detectedSourceLang
      );
    }
  } catch (err) {
    console.error("Error procesando mensaje:", node, err);
  } finally {
    isTranslating = false;
    requestAnimationFrame(processQueue);
  }
}

// Observa nuevos mensajes en el chat
function startObserver() {
  chatContainer = document.querySelector(
    ".model-chat-messages-wrapper .messages"
  );

  if (!chatContainer) {
    console.warn(
      "No se encontró el contenedor del chat. Intentando de nuevo..."
    );
    setTimeout(startObserver, 500);
    return;
  }

  if (observer) observer.disconnect();

  observer = new MutationObserver(
    debounce((mutations) => {
      try {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              node.classList.contains("message")
            ) {

              translationQueue.push({ node });
            }
          });
        });
        processQueue();
      } catch (err) {
        console.error("Error observando mutaciones:", err);
      }
    }, 50)
  );

  observer.observe(chatContainer, { childList: true, subtree: true });

}

// Evento para habilitar/deshabilitar la traducción
document.addEventListener("keydown", (e) => {
  if (e.ShiftKey) {
    switch (e.key.toLowerCase()) {
      case "t":
        if (observer) {
          observer.disconnect();
          startObserver();
          showStatus("Observador reiniciado");
        }
        isTranslationEnabled = !isTranslationEnabled;
        if (isTranslationEnabled) {
          createTranslationWindow();
          if (!observer) startObserver();
        } else if (translationWindow) {
          translationWindow.remove();
          translationWindow = null;
          if (observer) observer.disconnect();
          console.clear();
        }
        showStatus(`Traducción: ${isTranslationEnabled ? "ON" : "OFF"}`);
        break;
      case "s":
        isTranslationEnabled = false;
        showStatus("Traducción detenida");
        break;
      case "r":
        if (translationWindow) {
          isTranslationEnabled = true;
          showStatus("Traducción reanudada");
        }
        break;
      case "o":
        if (observer) {
          observer.disconnect();
          startObserver();
          showStatus("Observador reiniciado");
        }
        break;
    }
  }
});

// Inicia el observador al cargar la página
document.addEventListener("DOMContentLoaded", startObserver);
