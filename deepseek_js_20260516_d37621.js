async function generatePDFReport() {
  showToast('📄 Generando informe...');
  
  // Usar librería jsPDF (CDN)
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(20);
  doc.setTextColor(57, 255, 20);
  doc.text('KUKADES - INFORME DE PREPARACIÓN', 20, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(168, 232, 156);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 20, 30);
  
  // Resumen
  const persons = CONFIG.personCount;
  const totalProducts = products.length;
  const totalMaterials = materials.length;
  const expired = products.filter(p => getExpStatus(p.exp) === 'danger').length;
  
  doc.text(`Personas: ${persons}`, 20, 45);
  doc.text(`Productos: ${totalProducts}`, 20, 52);
  doc.text(`Materiales: ${totalMaterials}`, 20, 59);
  doc.text(`Productos caducados: ${expired}`, 20, 66);
  
  // Calorías totales
  const totals = getTotalNutrition();
  doc.text(`Calorías totales: ${Math.round(totals.kcal).toLocaleString()} kcal`, 20, 73);
  doc.text(`Autonomía estimada: ${Math.floor(totals.kcal / (2000 * persons))} días`, 20, 80);
  
  // Lista de productos por categoría
  let yPos = 95;
  const categories = ['ALIMENTOS', 'AGUA', 'MEDICINAS', 'HIGIENE', 'OTROS'];
  
  doc.setFontSize(14);
  doc.setTextColor(57, 255, 20);
  doc.text('PRODUCTOS POR CATEGORÍA', 20, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setTextColor(168, 232, 156);
  
  for (const cat of categories) {
    const catProducts = products.filter(p => p.cat === cat);
    if (catProducts.length > 0) {
      doc.text(`${cat} (${catProducts.length})`, 25, yPos);
      yPos += 5;
      for (const p of catProducts.slice(0, 5)) { // Límite de 5 por categoría
        doc.text(`  • ${p.name} x${p.qty} ${p.unit}`, 30, yPos);
        yPos += 4;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      }
      yPos += 3;
    }
  }
  
  // Materiales con problemas
  const problemMaterials = materials.filter(m => getMatStatus(m) === 'danger' || getMatStatus(m) === 'warn');
  if (problemMaterials.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(255, 34, 34);
    doc.text('MATERIALES CON PROBLEMAS', 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(168, 232, 156);
    
    let y = 30;
    for (const m of problemMaterials) {
      const status = getMatStatus(m);
      const statusText = status === 'danger' ? '⚠ AVERÍA' : '⚠ REVISAR';
      doc.text(`${statusText}: ${m.name}`, 25, y);
      y += 5;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    }
  }
  
  // Guardar PDF
  doc.save(`kukades-informe-${new Date().toISOString().split('T')[0]}.pdf`);
  showToast('✅ Informe PDF generado');
}

function exportToCSV() {
  // Exportar productos a CSV
  const productHeaders = ['ID', 'Nombre', 'Categoría', 'Cantidad', 'Unidad', 'Stock Mínimo', 'Caducidad', 'Ubicación', 'Notas'];
  const productRows = products.map(p => [
    p.id,
    p.name,
    p.cat,
    p.qty,
    p.unit,
    p.minQty || '',
    p.exp || '',
    p.loc || '',
    p.notes || ''
  ]);
  
  const productCSV = [productHeaders, ...productRows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  
  // Exportar materiales a CSV
  const materialHeaders = ['ID', 'Nombre', 'Categoría', 'Estado', 'Cantidad', 'Ubicación', 'Instrucciones'];
  const materialRows = materials.map(m => [
    m.id,
    m.name,
    m.cat,
    m.status,
    m.qty || 1,
    m.loc || '',
    (m.instructions || '').substring(0, 100)
  ]);
  
  const materialCSV = [materialHeaders, ...materialRows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  
  // Descargar productos
  const productBlob = new Blob(["\uFEFF" + productCSV], { type: 'text/csv;charset=utf-8;' });
  const productUrl = URL.createObjectURL(productBlob);
  const productLink = document.createElement('a');
  productLink.href = productUrl;
  productLink.download = `kukades-productos-${new Date().toISOString().split('T')[0]}.csv`;
  productLink.click();
  URL.revokeObjectURL(productUrl);
  
  // Descargar materiales
  const materialBlob = new Blob(["\uFEFF" + materialCSV], { type: 'text/csv;charset=utf-8;' });
  const materialUrl = URL.createObjectURL(materialBlob);
  const materialLink = document.createElement('a');
  materialLink.href = materialUrl;
  materialLink.download = `kukades-materiales-${new Date().toISOString().split('T')[0]}.csv`;
  materialLink.click();
  URL.revokeObjectURL(materialUrl);
  
  showToast('📊 CSV exportado correctamente');
}

window.generatePDFReport = generatePDFReport;
window.exportToCSV = exportToCSV;