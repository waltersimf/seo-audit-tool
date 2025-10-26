// ============================================
// GOOGLE-AUTH.JS - Google OAuth 2.0
// ============================================
// Версія: v0.7.0 (Підхід 2 - персональні credentials)
// Функції: OAuth авторізація, токени
// ============================================

const { google } = require('googleapis');
const { shell } = require('electron');
const http = require('http');
const url = require('url');
const fs = require('fs').promises;
const path = require('path');

// ============================================
// ШЛЯХИ ДО ФАЙЛІВ
// ============================================

const CONFIG_PATH = path.join(__dirname, '../../google-config.json');
const TOKEN_PATH = path.join(__dirname, '../../google-tokens.json');
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const SCOPES = [
  'https://www.googleapis.com/auth/docs',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

// ============================================
// GOOGLE AUTH CLASS
// ============================================

class GoogleAuth {
  constructor() {
    this.oauth2Client = null;
    this.authenticated = false;
    this.userEmail = null;
    this.credentials = null; // Client ID та Secret
  }

  // ============================================
  // Завантаження credentials з файлу
  // ============================================
  
  async loadCredentials() {
    try {
      const configData = await fs.readFile(CONFIG_PATH, 'utf8');
      this.credentials = JSON.parse(configData);
      
      if (!this.credentials.clientId || !this.credentials.clientSecret) {
        console.log('⚠️ Credentials не повні');
        return false;
      }
      
      console.log('✅ Google credentials завантажено');
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️ Файл google-config.json не знайдено');
      } else {
        console.error('❌ Помилка завантаження credentials:', error);
      }
      return false;
    }
  }

  // ============================================
  // Збереження credentials в файл
  // ============================================
  
  async saveCredentials(clientId, clientSecret) {
    try {
      const config = {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        redirectUri: REDIRECT_URI
      };
      
      await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
      this.credentials = config;
      
      console.log('💾 Google credentials збережено');
      return { success: true };
    } catch (error) {
      console.error('❌ Помилка збереження credentials:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ============================================
  // Перевірка чи налаштовані credentials
  // ============================================
  
  async checkCredentials() {
    const hasCredentials = await this.loadCredentials();
    return {
      configured: hasCredentials,
      clientId: hasCredentials ? this.credentials.clientId : null
    };
  }

  // ============================================
  // Ініціалізація OAuth клієнта
  // ============================================
  
  async initOAuthClient() {
    // Завантажуємо credentials якщо ще не завантажені
    if (!this.credentials) {
      const loaded = await this.loadCredentials();
      if (!loaded) {
        throw new Error('Google credentials не налаштовані. Будь ласка, введіть Client ID та Client Secret в налаштуваннях.');
      }
    }

    if (!this.oauth2Client) {
      this.oauth2Client = new google.auth.OAuth2(
        this.credentials.clientId,
        this.credentials.clientSecret,
        REDIRECT_URI
      );
    }
    
    return this.oauth2Client;
  }

  // ============================================
  // Перевірка чи є збережені токени
  // ============================================
  
  async loadSavedTokens() {
    try {
      // Спочатку завантажуємо credentials
      const hasCredentials = await this.loadCredentials();
      if (!hasCredentials) {
        return false;
      }

      // Потім токени
      const tokensData = await fs.readFile(TOKEN_PATH, 'utf8');
      const tokens = JSON.parse(tokensData);
      
      await this.initOAuthClient();
      this.oauth2Client.setCredentials(tokens);
      
      // Перевірити чи токен валідний
      const isValid = await this.validateToken();
      
      if (isValid) {
        this.authenticated = true;
        await this.getUserEmail();
        console.log('✅ Google токени завантажено');
        return true;
      } else {
        console.log('⚠️ Токени застарілі, потрібна реавторизація');
        return false;
      }
    } catch (error) {
      console.log('ℹ️ Збережених токенів немає');
      return false;
    }
  }

  // ============================================
  // Валідація токена
  // ============================================
  
  async validateToken() {
    try {
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2'
      });
      
      await oauth2.userinfo.get();
      return true;
    } catch (error) {
      console.error('❌ Токен невалідний:', error.message);
      return false;
    }
  }

  // ============================================
  // Отримання email користувача
  // ============================================
  
  async getUserEmail() {
    try {
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2'
      });
      
      const { data } = await oauth2.userinfo.get();
      this.userEmail = data.email;
      return data.email;
    } catch (error) {
      console.error('❌ Помилка отримання email:', error.message);
      return null;
    }
  }

  // ============================================
  // Авторизація (відкриття браузера)
  // ============================================
  
  async authorize() {
    return new Promise(async (resolve, reject) => {
      try {
        // Ініціалізуємо OAuth клієнта (завантажить credentials)
        await this.initOAuthClient();

        // Генеруємо URL для авторізації
        const authUrl = this.oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: SCOPES,
          prompt: 'consent'
        });

        console.log('🔐 Відкриваємо браузер для авторизації...');
        
        // Відкриваємо браузер
        shell.openExternal(authUrl);

        // Створюємо локальний сервер для отримання callback
        const server = http.createServer(async (req, res) => {
          try {
            const queryParams = url.parse(req.url, true).query;
            
            if (queryParams.code) {
              // Отримали код авторизації
              console.log('✅ Отримано код авторизації');

              // Відповідь браузеру
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`
                <html>
                  <head>
                    <meta charset="utf-8">
                    <title>SEO Audit Tool - Авторизація</title>
                    <style>
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      }
                      .container {
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                      }
                      h1 {
                        color: #667eea;
                        margin-bottom: 20px;
                      }
                      p {
                        color: #666;
                        font-size: 1.1rem;
                      }
                      .emoji {
                        font-size: 3rem;
                        margin-bottom: 20px;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="emoji">✅</div>
                      <h1>Авторизація успішна!</h1>
                      <p>Ви можете закрити це вікно та повернутися до програми.</p>
                    </div>
                  </body>
                </html>
              `);

              // Обмінюємо код на токени
              const { tokens } = await this.oauth2Client.getToken(queryParams.code);
              this.oauth2Client.setCredentials(tokens);

              // Зберігаємо токени
              await this.saveTokens(tokens);

              // Отримуємо email
              await this.getUserEmail();

              this.authenticated = true;
              server.close();

              resolve({
                success: true,
                email: this.userEmail
              });
            } else if (queryParams.error) {
              // Помилка авторизації
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`
                <html>
                  <head>
                    <meta charset="utf-8">
                    <title>SEO Audit Tool - Помилка</title>
                    <style>
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
                      }
                      .container {
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                      }
                      h1 {
                        color: #eb3349;
                        margin-bottom: 20px;
                      }
                      p {
                        color: #666;
                        font-size: 1.1rem;
                      }
                      .emoji {
                        font-size: 3rem;
                        margin-bottom: 20px;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="emoji">❌</div>
                      <h1>Помилка авторизації</h1>
                      <p>${queryParams.error}</p>
                      <p>Спробуйте ще раз.</p>
                    </div>
                  </body>
                </html>
              `);

              server.close();
              reject(new Error(queryParams.error));
            }
          } catch (error) {
            console.error('❌ Помилка обробки callback:', error);
            server.close();
            reject(error);
          }
        });

        // Запускаємо сервер на порту 3000
        server.listen(3000, () => {
          console.log('🌐 Локальний сервер запущено на http://localhost:3000');
        });

        // Таймаут 5 хвилин
        setTimeout(() => {
          server.close();
          reject(new Error('Час очікування авторизації вийшов (5 хв)'));
        }, 5 * 60 * 1000);

      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // Збереження токенів
  // ============================================
  
  async saveTokens(tokens) {
    try {
      await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log('💾 Токени збережено:', TOKEN_PATH);
    } catch (error) {
      console.error('❌ Помилка збереження токенів:', error);
      throw error;
    }
  }

  // ============================================
  // Видалення токенів (logout)
  // ============================================
  
  async logout() {
    try {
      await fs.unlink(TOKEN_PATH);
      this.authenticated = false;
      this.userEmail = null;
      this.oauth2Client = null;
      console.log('👋 Вихід з Google Account');
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.authenticated = false;
        this.userEmail = null;
        this.oauth2Client = null;
        return true;
      }
      console.error('❌ Помилка виходу:', error);
      throw error;
    }
  }

  // ============================================
  // Перевірка статусу
  // ============================================
  
  getStatus() {
    return {
      authenticated: this.authenticated,
      email: this.userEmail
    };
  }

  // ============================================
  // Отримання OAuth клієнта
  // ============================================
  
  getAuthClient() {
    if (!this.authenticated) {
      throw new Error('Потрібна авторизація Google');
    }
    return this.oauth2Client;
  }
}

// ============================================
// ЕКСПОРТ
// ============================================

module.exports = { GoogleAuth };