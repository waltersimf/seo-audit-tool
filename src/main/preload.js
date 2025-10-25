// ============================================
// PRELOAD.JS - Безпечний міст між процесами
// ============================================
// Версія: v0.6.0 - Security Fix
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
  
  /**
   * Почати SEO аудит
   * @param {string} url - URL сайту
   * @param {object} options - Налаштування (depth, checks)
   * @returns {Promise<object>} Результат аудиту
   */
  startAudit: (url, options) => {
    return ipcRenderer.invoke('start-audit', url, options);
  },

  /**
   * Зупинити поточний аудит
   * @returns {Promise<object>} Статус зупинки
   */
  stopAudit: () => {
    return ipcRenderer.invoke('stop-audit');
  },

  /**
   * Валідувати URL перед аудитом
   * @param {string} url - URL для перевірки
   * @returns {Promise<object>} Результат валідації
   */
  validateUrl: (url) => {
    return ipcRenderer.invoke('validate-url', url);
  },

  // ============================================
  // PROGRESS EVENTS
  // ============================================
  
  /**
   * Підписатися на прогрес аудиту
   * @param {function} callback - Функція для обробки прогресу
   */
  onProgress: (callback) => {
    ipcRenderer.on('audit-progress', (event, data) => {
      callback(data);
    });
  },

  /**
   * Відписатися від прогресу
   */
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('audit-progress');
  },

  // ============================================
  // REPORT OPERATIONS
  // ============================================
  
  /**
   * Відкрити текстовий звіт в системному редакторі
   * @param {string} filename - Ім'я файлу звіту
   * @returns {Promise<object>} Результат відкриття
   */
  openReport: (filename) => {
    return ipcRenderer.invoke('open-report', filename);
  },

  /**
   * Відкрити папку зі звітами
   * @returns {Promise<object>} Результат відкриття
   */
  openReportsFolder: () => {
    return ipcRenderer.invoke('open-reports-folder');
  },

  /**
   * Експортувати звіт в Excel
   * @param {object} auditData - Дані аудиту
   * @param {string} filename - Ім'я файлу (опціонально)
   * @returns {Promise<object>} Результат експорту
   */
  exportToExcel: (auditData, filename) => {
    return ipcRenderer.invoke('export-to-excel', auditData, filename);
  },

  /**
   * Відкрити Excel файл
   * @param {string} filename - Ім'я файлу
   * @returns {Promise<object>} Результат відкриття
   */
  openExcelReport: (filename) => {
    return ipcRenderer.invoke('open-report', filename);
  },

  // ============================================
  // TESTING & INFO
  // ============================================
  
  /**
   * Тестове з'єднання з main process
   * @returns {Promise<object>} Інформація про з'єднання
   */
  testConnection: () => {
    return ipcRenderer.invoke('test-connection');
  },

  /**
   * Отримати версію програми
   * @returns {Promise<string>} Версія
   */
  getVersion: () => {
    return ipcRenderer.invoke('get-version');
  }
});

console.log('✅ Preload script завантажено (v0.6.0 - Security)');