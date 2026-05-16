let barcodeScanner = null;

async function initBarcodeScanner() {
  // Verificar soporte de cámara
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('❌ Tu dispositivo no soporta escáner de código de barras');
    return false;
  }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    stream.getTracks().forEach(track => track.stop()); // Solo permisos
    
    // Cargar librería QuaggaJS (CDN)
    await loadScript('https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js');
    return true;
  } catch(e) {
    showToast('❌ Permiso de cámara denegado');
    return false;
  }
}

async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function startBarcodeScanner(callback) {
  const scannerContainer = document.createElement('div');
  scannerContainer.id = 'barcode-scanner';
  scannerContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: black;
    z-index: 10000;
    display: flex;
    flex-direction: column;
  `;
  
  const videoContainer = document.createElement('div');
  videoContainer.id = 'interactive';
  videoContainer.style.cssText = `
    flex: 1;
    position: relative;
    overflow: hidden;
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ CERRAR';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 10001;
    background: rgba(0,0,0,0.7);
    color: white;
    border: 1px solid var(--green);
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
  `;
  
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    height: 200px;
    border: 2px solid var(--green);
    border-radius: 10px;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
    pointer-events: none;
  `;
  
  scannerContainer.appendChild(closeBtn);
  scannerContainer.appendChild(videoContainer);
  videoContainer.appendChild(overlay);
  document.body.appendChild(scannerContainer);
  
  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: videoContainer,
      constraints: {
        facingMode: "environment"
      }
    },
    decoder: {
      readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader", "code_128_reader"]
    }
  }, (err) => {
    if (err) {
      showToast('❌ Error al iniciar escáner');
      document.body.removeChild(scannerContainer);
      return;
    }
    Quagga.start();
  });
  
  Quagga.onDetected((result) => {
    const code = result.codeResult.code;
    Quagga.stop();
    document.body.removeChild(scannerContainer);
    callback(code);
  });
  
  closeBtn.onclick = () => {
    Quagga.stop();
    document.body.removeChild(scannerContainer);
  };
}

// Base de datos de productos por código de barras (offline)
const BARCODE_DB = {
  // Ejemplos reales
  '8412345678901': { name: 'Atún en aceite de oliva', cat: 'ALIMENTOS', unit: 'latas', netWeight: 150, kcal: 184, protein: 23, fat: 10, carbs: 0 },
  '8423456789012': { name: 'Arroz redondo', cat: 'ALIMENTOS', unit: 'kg', netWeight: 1000, kcal: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  '8434567890123': { name: 'Leche entera UHT', cat: 'ALIMENTOS', unit: 'L', netWeight: 1000, kcal: 64, protein: 3.2, fat: 3.6, carbs: 4.8 },
  // Más productos...
};

async function lookupBarcode(code) {
  // Buscar en caché local
  let product = BARCODE_DB[code];
  
  // Buscar en productos guardados por código
  const savedBarcodes = JSON.parse(localStorage.getItem('kukades_barcodes') || '{}');
  if (savedBarcodes[code]) {
    product = savedBarcodes[code];
  }
  
  // Simular búsqueda online (opcional, con API pública)
  // Se puede implementar con Open Food Facts API
  if (!product) {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data = await response.json();
      if (data.status === 1) {
        product = {
          name: data.product.product_name || data.product.generic_name || 'Producto desconocido',
          cat: 'ALIMENTOS',
          unit: 'uds',
          netWeight: data.product.product_quantity || 100,
          kcal: data.product.nutriments?.['energy-kcal'] || 0,
          protein: data.product.nutriments?.proteins || 0,
          fat: data.product.nutriments?.fat || 0,
          carbs: data.product.nutriments?.carbohydrates || 0
        };
        // Guardar para futuros usos
        savedBarcodes[code] = product;
        localStorage.setItem('kukades_barcodes', JSON.stringify(savedBarcodes));
      }
    } catch(e) {
      console.log('Error buscando en Open Food Facts:', e);
    }
  }
  
  return product;
}

async function scanBarcode() {
  const ready = await initBarcodeScanner();
  if (!ready) return;
  
  startBarcodeScanner(async (code) => {
    showToast('🔍 Buscando producto...');
    const product = await lookupBarcode(code);
    
    if (product) {
      document.getElementById('fName').value = product.name;
      document.getElementById('fCat').value = product.cat || 'ALIMENTOS';
      document.getElementById('fNetWeight').value = product.netWeight || 100;
      if (product.kcal) {
        document.getElementById('fKcal').value = product.kcal;
        document.getElementById('fProtein').value = product.protein || 0;
        document.getElementById('fFat').value = product.fat || 0;
        document.getElementById('fCarbs').value = product.carbs || 0;
      }
      showToast('✅ Producto encontrado y cargado');
    } else {
      showToast('⚠ Producto no encontrado. Puedes añadirlo manualmente');
    }
  });
}

window.scanBarcode = scanBarcode;