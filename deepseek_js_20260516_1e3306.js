let emergencyModeActive = false;

function toggleEmergencyMode() {
  emergencyModeActive = !emergencyModeActive;
  
  if (emergencyModeActive) {
    activateEmergencyMode();
  } else {
    deactivateEmergencyMode();
  }
}

function activateEmergencyMode() {
  // Guardar modo normal
  const normalContent = document.querySelector('.app-content').innerHTML;
  sessionStorage.setItem('emergencyBackup', normalContent);
  
  // Crear interfaz de emergencia
  const emergencyHTML = `
    <div class="emergency-container" style="padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px;">🚨</div>
        <h1 style="color: var(--red); font-family: var(--font-display);">MODO EMERGENCIA</h1>
        <p>Información crítica de supervivencia</p>
      </div>
      
      <div class="emergency-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div class="stat-card">
          <div class="stat-value" id="emergencyWater" style="font-size: 1.2rem;">---</div>
          <div class="stat-label">AGUA (días)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="emergencyFood" style="font-size: 1.2rem;">---</div>
          <div class="stat-label">COMIDA (días)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="emergencyPersons" style="font-size: 1.2rem;">${CONFIG.personCount}</div>
          <div class="stat-label">PERSONAS</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="emergencyExpired" style="font-size: 1.2rem;">---</div>
          <div class="stat-label">CADUCADOS</div>
        </div>
      </div>
      
      <div class="emergency-section" style="margin-bottom: 24px;">
        <div style="font-family: var(--font-display); font-size: 0.8rem; margin-bottom: 12px; color: var(--green);">⚠ PRODUCTOS CRÍTICOS</div>
        <div id="emergencyCriticalProducts" class="product-list"></div>
      </div>
      
      <div class="emergency-section" style="margin-bottom: 24px;">
        <div style="font-family: var(--font-display); font-size: 0.8rem; margin-bottom: 12px; color: var(--green);">🔧 MATERIALES ESENCIALES</div>
        <div id="emergencyCriticalMaterials" class="product-list"></div>
      </div>
      
      <div class="emergency-section" style="margin-bottom: 24px;">
        <div style="font-family: var(--font-display); font-size: 0.8rem; margin-bottom: 12px; color: var(--green);">🥫 RACIONAMIENTO SUGERIDO</div>
        <div id="emergencyRationing" style="background: var(--panel); padding: 12px; border-radius: 6px; border-left: 3px solid var(--amber);">
          <p style="font-size: 0.65rem;">Consume alimentos no perecederos primero. Prioriza alimentos con mayor densidad calórica. Ración de agua: 2L por persona/día.</p>
        </div>
      </div>
      
      <button class="btn btn-primary" onclick="toggleEmergencyMode()" style="width: 100%; background: var(--red); border-color: var(--red);">
        🔴 SALIR DEL MODO EMERGENCIA
      </button>
    </div>
  `;
  
  document.querySelector('.app-content').innerHTML = emergencyHTML;
  updateEmergencyStats();
  
  // Actualizar cada 30 segundos
  if (window.emergencyInterval) clearInterval(window.emergencyInterval);
  window.emergencyInterval = setInterval(updateEmergencyStats, 30000);
}

function deactivateEmergencyMode() {
  if (window.emergencyInterval) clearInterval(window.emergencyInterval);
  const backup = sessionStorage.getItem('emergencyBackup');
  if (backup) {
    document.querySelector('.app-content').innerHTML = backup;
  }
  // Re-renderizar todo
  renderDashboard();
  renderProducts();
  renderMateriales();
}

function updateEmergencyStats() {
  // Calcular autonomía
  const persons = CONFIG.personCount;
  const waterL = products.filter(p => p.cat === 'AGUA').reduce((s, p) => {
    const q = parseFloat(p.qty) || 0;
    if (p.unit === 'L') return s + q;
    if (p.unit === 'ml') return s + q / 1000;
    return s + q;
  }, 0);
  const waterDays = Math.floor(waterL / (2 * persons));
  
  const foodItems = products.filter(p => p.cat === 'ALIMENTOS');
  const foodDays = Math.floor((foodItems.reduce((s, p) => s + (parseFloat(p.qty) || 0), 0) * 3) / persons);
  
  const expired = products.filter(p => getExpStatus(p.exp) === 'danger').length;
  
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('emergencyWater', waterDays > 0 ? `${waterDays}` : '---');
  setEl('emergencyFood', foodDays > 0 ? `${foodDays}` : '---');
  setEl('emergencyExpired', expired);
  
  // Productos críticos (caducados o bajo stock)
  const criticalProducts = products.filter(p => 
    getExpStatus(p.exp) === 'danger' || 
    (p.minQty && parseFloat(p.qty) < parseFloat(p.minQty))
  ).slice(0, 5);
  
  const criticalProductsEl = document.getElementById('emergencyCriticalProducts');
  if (criticalProductsEl) {
    criticalProductsEl.innerHTML = criticalProducts.map(p => `
      <div class="product-card status-${getExpStatus(p.exp)}" style="margin-bottom: 8px;">
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-qty">${p.qty} ${p.unit}</div>
          ${p.exp ? `<div class="exp-date ${getExpStatus(p.exp)}">${formatExpDate(p.exp)}</div>` : ''}
        </div>
      </div>
    `).join('');
    if (criticalProducts.length === 0) {
      criticalProductsEl.innerHTML = '<div class="empty-state"><div class="empty-text">✅ Sin productos críticos</div></div>';
    }
  }
  
  // Materiales esenciales con problemas
  const criticalMaterials = materials.filter(m => getMatStatus(m) === 'danger').slice(0, 5);
  const criticalMaterialsEl = document.getElementById('emergencyCriticalMaterials');
  if (criticalMaterialsEl) {
    criticalMaterialsEl.innerHTML = criticalMaterials.map(m => `
      <div class="product-card status-danger" style="margin-bottom: 8px;">
        <div class="product-info">
          <div class="product-name">${m.name}</div>
          <div class="product-qty">${MAT_CAT_ICONS[m.cat]} ${m.status}</div>
          ${m.instructions ? `<div class="product-note">📋 ${m.instructions.substring(0, 60)}</div>` : ''}
        </div>
      </div>
    `).join('');
    if (criticalMaterials.length === 0) {
      criticalMaterialsEl.innerHTML = '<div class="empty-state"><div class="empty-text">✅ Materiales operativos</div></div>';
    }
  }
}

window.toggleEmergencyMode = toggleEmergencyMode;