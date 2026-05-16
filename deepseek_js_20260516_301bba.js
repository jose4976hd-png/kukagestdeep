let notificationPermission = false;
let alertInterval = null;

async function initNotifications() {
  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones');
    return false;
  }
  
  const permission = await Notification.requestPermission();
  notificationPermission = permission === 'granted';
  
  if (notificationPermission) {
    // Programar verificación diaria de alertas
    checkExpiringProducts();
    startAlertScheduler();
  }
  
  return notificationPermission;
}

function startAlertScheduler() {
  if (alertInterval) clearInterval(alertInterval);
  
  // Verificar cada 12 horas
  alertInterval = setInterval(() => {
    checkExpiringProducts();
  }, 12 * 60 * 60 * 1000);
  
  // También verificar al cargar la página y cada hora durante el día
  setInterval(() => {
    checkLowStock();
  }, 60 * 60 * 1000);
}

function checkExpiringProducts() {
  if (!notificationPermission) return;
  
  const today = new Date();
  const warnDays = CONFIG.warnDays;
  
  products.forEach(product => {
    if (!product.exp) return;
    
    const expDate = new Date(product.exp);
    const daysUntil = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
    
    // Notificar a los warnDays días, 7 días, 3 días, 1 día y el día de caducidad
    const notifyDays = [warnDays, 7, 3, 1, 0];
    
    if (notifyDays.includes(daysUntil)) {
      const lastNotifyKey = `notified_${product.id}_${daysUntil}`;
      const lastNotify = localStorage.getItem(lastNotifyKey);
      const todayStr = today.toDateString();
      
      if (lastNotify !== todayStr) {
        let message = '';
        if (daysUntil === 0) message = `🔴 ${product.name} CADUCA HOY`;
        else if (daysUntil === 1) message = `⚠ ${product.name} caduca MAÑANA`;
        else message = `⚠ ${product.name} caduca en ${daysUntil} días`;
        
        new Notification('KUKADES - Alerta de caducidad', {
          body: message,
          icon: '/assets/logo.png',
          tag: `exp-${product.id}`,
          requireInteraction: daysUntil <= 3
        });
        
        localStorage.setItem(lastNotifyKey, todayStr);
      }
    }
  });
}

function checkLowStock() {
  if (!notificationPermission) return;
  
  const lowStockProducts = products.filter(p => p.minQty && parseFloat(p.qty) < parseFloat(p.minQty));
  const todayStr = new Date().toDateString();
  
  lowStockProducts.forEach(product => {
    const lastNotifyKey = `notified_stock_${product.id}`;
    const lastNotify = localStorage.getItem(lastNotifyKey);
    
    if (lastNotify !== todayStr) {
      new Notification('KUKADES - Stock bajo', {
        body: `📦 ${product.name}: tienes ${product.qty} ${product.unit} (mínimo ${product.minQty})`,
        icon: '/assets/logo.png',
        tag: `stock-${product.id}`
      });
      localStorage.setItem(lastNotifyKey, todayStr);
    }
  });
}

function scheduleBackupReminder() {
  // Recordatorio semanal de hacer backup
  const lastBackup = localStorage.getItem('last_backup_date');
  const today = new Date().toDateString();
  
  if (!lastBackup || new Date(lastBackup) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
    if (notificationPermission) {
      new Notification('KUKADES - Recordatorio de backup', {
        body: 'Hace más de una semana que no exportas tus datos. ¿Quieres hacer una copia de seguridad?',
        icon: '/assets/logo.png',
        tag: 'backup-reminder'
      });
    }
  }
}

// Actualizar última fecha de backup
function markBackupDone() {
  localStorage.setItem('last_backup_date', new Date().toISOString());
}

window.initNotifications = initNotifications;
window.checkExpiringProducts = checkExpiringProducts;
window.markBackupDone = markBackupDone;