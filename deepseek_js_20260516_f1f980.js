// Sincronización usando IndexedDB + exportación (sin servidor externo)
// Los usuarios pueden exportar/importar para compartir entre dispositivos

async function exportAllData() {
  const data = {
    version: CONFIG.version,
    timestamp: new Date().toISOString(),
    config: {
      personCount: CONFIG.personCount,
      memberNames: CONFIG.memberNames,
      warnDays: CONFIG.warnDays,
      rationLevel: CONFIG.rationLevel,
      theme: CONFIG.theme,
      fontSize: CONFIG.fontSize,
      colorAccent: CONFIG.colorAccent
    },
    products: products.map(p => {
      const { photo, ...rest } = p;
      return rest;
    }),
    materials: materials.map(m => {
      const { photo, ...rest } = m;
      return rest;
    }),
    learnedNutrition: JSON.parse(localStorage.getItem('kukades_nutrition_learned') || '{}'),
    learnedIA: JSON.parse(localStorage.getItem('kukades_ia_learned') || '{}'),
    barcodes: JSON.parse(localStorage.getItem('kukades_barcodes') || '{}')
  };
  
  // Crear archivo para descargar
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kukades-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('📦 Datos exportados correctamente');
}

async function importAllData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validar versión
        if (!data.version) throw new Error('Formato de archivo inválido');
        
        // Importar configuración
        if (data.config) {
          CONFIG.personCount = data.config.personCount || 1;
          CONFIG.memberNames = data.config.memberNames || [''];
          CONFIG.warnDays = data.config.warnDays || 60;
          CONFIG.rationLevel = data.config.rationLevel || 100;
          CONFIG.theme = data.config.theme || 'dark';
          CONFIG.fontSize = data.config.fontSize || 'medium';
          CONFIG.colorAccent = data.config.colorAccent || '#39ff14';
          await saveConfig();
          applyTheme();
        }
        
        // Importar productos (sin fotos)
        if (data.products) {
          products = data.products;
          await saveProducts();
        }
        
        // Importar materiales
        if (data.materials) {
          materials = data.materials;
          await saveMaterials();
        }
        
        // Importar datos aprendidos
        if (data.learnedNutrition) {
          localStorage.setItem('kukades_nutrition_learned', JSON.stringify(data.learnedNutrition));
        }
        if (data.learnedIA) {
          localStorage.setItem('kukades_ia_learned', JSON.stringify(data.learnedIA));
        }
        if (data.barcodes) {
          localStorage.setItem('kukades_barcodes', JSON.stringify(data.barcodes));
        }
        
        showToast('✅ Datos importados correctamente');
        resolve(true);
      } catch(e) {
        showToast('❌ Error al importar: archivo inválido');
        reject(e);
      }
    };
    reader.readAsText(file);
  });
}

// Sincronización entre dispositivos usando Web Share API (si está disponible)
async function shareData() {
  const data = {
    products: products.length,
    materials: materials.length,
    version: CONFIG.version
  };
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'KUKADES - Mis datos de preparación',
        text: `Tengo ${products.length} productos y ${materials.length} materiales gestionados con KUKADES`,
        url: window.location.href
      });
      showToast('📤 Compartido correctamente');
    } catch(e) {
      if (e.name !== 'AbortError') showToast('❌ Error al compartir');
    }
  } else {
    exportAllData();
  }
}

window.exportAllData = exportAllData;
window.importAllData = importAllData;
window.shareData = shareData;