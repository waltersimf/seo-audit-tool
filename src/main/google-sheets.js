// ============================================
// GOOGLE-SHEETS.JS - Google Sheets Exporter
// ============================================
// Версія: v0.7.0
// Призначення: Експорт SEO аудиту в Google Sheets
// ============================================

const { google } = require('googleapis');

// ============================================
// GOOGLE SHEETS EXPORTER
// ============================================

class GoogleSheetsExporter {
  constructor(auth) {
    this.sheets = google.sheets({ version: 'v4', auth });
    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Створити аудит в Google Sheets
   */
  async createAuditSpreadsheet(auditData) {
    try {
      console.log('📊 Створення Google Sheets...');

      // Створити нову таблицю
      const spreadsheet = await this.createSpreadsheet(auditData);
      const spreadsheetId = spreadsheet.data.spreadsheetId;

      console.log('📋 Заповнення аркушів даними...');

      // Заповнити аркуші
      await this.populateGeneralReport(spreadsheetId, auditData);
      await this.populateStatistics(spreadsheetId, auditData);
      await this.populateIssueSheets(spreadsheetId, auditData);
      await this.populateAllPages(spreadsheetId, auditData);

      console.log('🎨 Форматування таблиці...');

      // Форматування
      await this.formatSpreadsheet(spreadsheetId, auditData);

      console.log('✅ Google Sheets створено!');

      return {
        success: true,
        url: spreadsheet.data.spreadsheetUrl,
        spreadsheetId: spreadsheetId
      };
    } catch (error) {
      console.error('❌ Помилка створення Google Sheets:', error.message);
      throw error;
    }
  }

  /**
   * Створити порожню таблицю
   */
  async createSpreadsheet(auditData) {
    const urlObj = new URL(auditData.url);
    const domain = urlObj.hostname;
    const date = new Date().toLocaleString('uk-UA', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });

    // Групувати issues за типом
    const issueTypes = this.groupIssuesByType(auditData.issues || []);

    // Створити аркуші
    const sheets = [
      { properties: { title: '📊 Загальний звіт', index: 0 } },
      { properties: { title: '📈 Статистика', index: 1 } }
    ];

    // Додати окремі аркуші для кожного типу проблем
    let index = 2;
    for (const [type, issues] of Object.entries(issueTypes)) {
      if (issues.length > 0) {
        sheets.push({
          properties: {
            title: this.getSheetTitle(type),
            index: index++
          }
        });
      }
    }

    // Додати аркуш всіх сторінок
    sheets.push({
      properties: {
        title: '📄 Всі сторінки',
        index: index
      }
    });

    return await this.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: `SEO Аудит - ${domain} - ${date}`
        },
        sheets: sheets
      }
    });
  }

  /**
   * Групувати issues за типом
   */
  groupIssuesByType(issues) {
    const grouped = {};

    for (const issue of issues) {
      const type = issue.type || 'other';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(issue);
    }

    return grouped;
  }

  /**
   * Отримати назву аркуша для типу проблеми
   */
  getSheetTitle(type) {
    const titles = {
      'status_codes': '🔴 Status Codes',
      'title_tags': '📝 Title Tags',
      'meta_description': '📋 Meta Description',
      'h1_tags': '🏷️ H1 Tags',
      'url_structure': '🔗 URL Structure',
      'canonical': '🔄 Canonical',
      'images': '🖼️ Images',
      'headings': '📑 Headings',
      'other': '❓ Інші проблеми'
    };

    return titles[type] || '❓ Інші проблеми';
  }

  /**
   * Заповнити загальний звіт
   */
  async populateGeneralReport(spreadsheetId, auditData) {
    const sheetName = '📊 Загальний звіт';

    // Заголовки
    const headers = [
      ['URL', 'Status', 'Title', 'H1', 'Проблеми', 'Пріоритет']
    ];

    // Дані сторінок
    const rows = (auditData.pages || []).map(page => {
      const pageIssues = (auditData.issues || []).filter(issue =>
        issue.urls && issue.urls.includes(page.url)
      );

      const maxPriority = this.getMaxPriority(pageIssues);

      return [
        page.url,
        page.statusCode || 'N/A',
        page.title || 'Без title',
        page.h1 || 'Без H1',
        pageIssues.length,
        maxPriority
      ];
    });

    // Вставити дані
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:F1`,
      valueInputOption: 'RAW',
      resource: {
        values: headers
      }
    });

    if (rows.length > 0) {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A2`,
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });
    }
  }

  /**
   * Заповнити статистику
   */
  async populateStatistics(spreadsheetId, auditData) {
    const sheetName = '📈 Статистика';

    const stats = [
      ['Метрика', 'Значення'],
      [''],
      ['🌐 URL сайту', auditData.url],
      ['📅 Дата аудиту', auditData.date],
      [''],
      ['📊 ЗАГАЛЬНИЙ БАЛ', `${auditData.score}/100`],
      [''],
      ['📄 Загальна кількість сторінок', auditData.totalPages || 0],
      ['✅ Пройдено перевірок', auditData.passedChecks || 0],
      [''],
      ['🎯 Критичні проблеми', auditData.criticalIssues || 0],
      ['⚠️ Високі проблеми', auditData.highIssues || 0],
      ['ℹ️ Середні проблеми', auditData.mediumIssues || 0],
      ['💡 Низькі проблеми', auditData.lowIssues || 0],
      [''],
      ['⏱️ Час сканування', this.formatDuration(auditData.duration)],
      ['🚀 Швидкість', `${auditData.speed || 0} стор/сек`]
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: {
        values: stats
      }
    });
  }

  /**
   * Заповнити аркуші з проблемами
   */
  async populateIssueSheets(spreadsheetId, auditData) {
    const issueTypes = this.groupIssuesByType(auditData.issues || []);

    for (const [type, issues] of Object.entries(issueTypes)) {
      if (issues.length === 0) continue;

      const sheetName = this.getSheetTitle(type);

      // Заголовки
      const headers = [
        ['Проблема', 'Severity', 'Кількість URL', 'Рекомендація']
      ];

      // Групувати однакові проблеми
      const groupedIssues = this.groupSimilarIssues(issues);

      // Дані
      const rows = groupedIssues.map(issue => [
        issue.message,
        issue.severity,
        issue.urls.length,
        issue.recommendation || 'Немає рекомендації'
      ]);

      // Вставити заголовки
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:D1`,
        valueInputOption: 'RAW',
        resource: {
          values: headers
        }
      });

      // Вставити дані
      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetName}!A2`,
          valueInputOption: 'RAW',
          resource: {
            values: rows
          }
        });
      }

      // Додати список URL для кожної проблеми
      let currentRow = 2;
      for (const issue of groupedIssues) {
        if (issue.urls.length > 0) {
          const urlsData = issue.urls.map(url => [url]);
          
          await this.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!E${currentRow}`,
            valueInputOption: 'RAW',
            resource: {
              values: urlsData
            }
          });
        }
        currentRow++;
      }
    }
  }

  /**
   * Заповнити аркуш всіх сторінок
   */
  async populateAllPages(spreadsheetId, auditData) {
    const sheetName = '📄 Всі сторінки';

    // Заголовки
    const headers = [
      ['URL', 'Status', 'Title', 'Description', 'H1', 'Canonical', 'Проблеми']
    ];

    // Дані
    const rows = (auditData.pages || []).map(page => {
      const pageIssues = (auditData.issues || []).filter(issue =>
        issue.urls && issue.urls.includes(page.url)
      );

      return [
        page.url,
        page.statusCode || 'N/A',
        page.title || '',
        page.description || '',
        page.h1 || '',
        page.canonical || '',
        pageIssues.length
      ];
    });

    // Вставити дані
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:G1`,
      valueInputOption: 'RAW',
      resource: {
        values: headers
      }
    });

    if (rows.length > 0) {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A2`,
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });
    }
  }

  /**
   * Форматувати таблицю
   */
  async formatSpreadsheet(spreadsheetId, auditData) {
    const requests = [];

    // Отримати інформацію про аркуші
    const spreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId
    });

    const sheets = spreadsheet.data.sheets;

    // Форматувати кожен аркуш
    for (const sheet of sheets) {
      const sheetId = sheet.properties.sheetId;

      // Жирний шрифт для заголовків (перший рядок)
      requests.push({
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.2, green: 0.5, blue: 0.8 },
              textFormat: {
                bold: true,
                foregroundColor: { red: 1, green: 1, blue: 1 }
              }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)'
        }
      });

      // Автофільтр
      requests.push({
        setBasicFilter: {
          filter: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0
            }
          }
        }
      });

      // Заморозити перший рядок
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheetId,
            gridProperties: {
              frozenRowCount: 1
            }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      });

      // Автоширина колонок
      requests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId: sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 10
          }
        }
      });
    }

    // Виконати всі запити
    if (requests.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests }
      });
    }
  }

  /**
   * Групувати схожі проблеми
   */
  groupSimilarIssues(issues) {
    const grouped = {};

    for (const issue of issues) {
      const key = `${issue.message}_${issue.severity}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          message: issue.message,
          severity: issue.severity,
          recommendation: issue.recommendation,
          urls: []
        };
      }

      if (issue.urls) {
        grouped[key].urls.push(...issue.urls);
      }
    }

    return Object.values(grouped);
  }

  /**
   * Отримати максимальний пріоритет з проблем
   */
  getMaxPriority(issues) {
    if (issues.length === 0) return 'OK';

    const priorities = issues.map(i => i.severity);
    
    if (priorities.includes('CRITICAL')) return 'CRITICAL';
    if (priorities.includes('HIGH')) return 'HIGH';
    if (priorities.includes('MEDIUM')) return 'MEDIUM';
    if (priorities.includes('LOW')) return 'LOW';
    
    return 'OK';
  }

  /**
   * Форматувати тривалість
   */
  formatDuration(ms) {
    if (!ms) return 'N/A';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}хв ${remainingSeconds}с`;
    }
    return `${seconds}с`;
  }
}

// ============================================
// ЕКСПОРТ
// ============================================

module.exports = { GoogleSheetsExporter };