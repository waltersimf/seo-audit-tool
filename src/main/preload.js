// ============================================
// PRELOAD.JS - Безпечний міст між процесами
// ============================================
// Версія: v0.7.0 - Google Docs/Sheets
// Призначення: Експонує безпечні API для renderer
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

// ============================================
// EXPOSE SAFE API TO RENDERER
// ============================================

contextBridge.exposeInMainWorld('electronAPI', {
  
  // ============================================
  // AUDIT OPERATIONS
  // ============================================
  
  startAudit: (url, options) => {
    return ipcRenderer.invoke('start-audit', url, options);
  },

  stopAudit: () => {
    return ipcRenderer.invoke('stop-audit');
  },

  validateUrl: (url) => {
    return ipcRenderer.invoke('validate-url', url);
  },

  // ============================================
  // PROGRESS EVENTS
  // ============================================
  
  onProgress: (callback) => {
    ipcRenderer.on('audit-progress', (event, data) => {
      callback(data);
    });
  },

  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('audit-progress');
  },

  // ============================================
  // REPORT OPERATIONS
  // ============================================
  
  openReport: (filename) => {
    return ipcRenderer.invoke('open-report', filename);
  },

  openReportsFolder: () => {
    return ipcRenderer.invoke('open-reports-folder');
  },

  exportToExcel: (auditData, filename) => {
    return ipcRenderer.invoke('export-to-excel', auditData, filename);
  },

  openExcelReport: (filename) => {
    return ipcRenderer.invoke('open-report', filename);
  },

  // ============================================
  // ✅ НОВИЙ: GOOGLE AUTH
  // ============================================
  
  googleAuthStatus: () => {
    return ipcRenderer.invoke('google-auth-status');
  },

  googleAuthLogin: () => {
    return ipcRenderer.invoke('google-auth-login');
  },

  googleAuthLogout: () => {
    return ipcRenderer.invoke('google-auth-logout');
  },

  // ============================================
  // ✅ НОВИЙ: GOOGLE EXPORT
  // ============================================
  
  exportGoogleSheets: (auditData) => {
    return ipcRenderer.invoke('export-google-sheets', auditData);
  },

  exportGoogleDocs: (auditData) => {
    return ipcRenderer.invoke('export-google-docs', auditData);
  },

  // ============================================
  // TESTING & INFO
  // ============================================
  
  testConnection: () => {
    return ipcRenderer.invoke('test-connection');
  },

  getVersion: () => {
    return ipcRenderer.invoke('get-version');
  }
});

console.log('✅ Preload script завантажено (v0.7.0 - Google Docs/Sheets)');