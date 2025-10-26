// ============================================
// PRELOAD.JS - Безпечний міст між процесами
// ============================================
// Версія: v0.7.0 - Google Docs/Sheets (Підхід 2)
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
  
  invoke: (channel, ...args) => {
    // Дозволені канали
    const validChannels = [
      'start-audit',
      'stop-audit',
      'validate-url',
      'open-report',
      'open-reports-folder',
      'export-excel',
      'google-save-credentials',
      'google-check-credentials',
      'google-check-auth',
      'google-login',
      'google-logout',
      'export-google-docs',
      'export-google-sheets',
      'open-url',
      'test-connection',
      'get-version'
    ];
    
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
  },

  // ============================================
  // PROGRESS EVENTS
  // ============================================
  
  onProgress: (callback) => {
    ipcRenderer.on('audit-progress', (event, data) => {
      callback(event, data);
    });
  },

  onAuditComplete: (callback) => {
    ipcRenderer.on('audit-complete', (event, data) => {
      callback(event, data);
    });
  },

  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

console.log('✅ Preload script завантажено (v0.7.0 - Google with Credentials)');