// ============================================
// GOOGLE-AUTH.JS - Google OAuth 2.0
// ============================================
// Версія: v0.7.0
// Призначення: Авторизація користувача в Google
// ============================================

const { google } = require('googleapis');
const open = require('open');
const http = require('http');
const url = require('url');
const fs = require('fs').promises;
const path = require('path');

// ============================================
// КОНСТАНТИ
// ============================================

const SCOPES = [
  'https://www.googleapis.com/auth/docs',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

const TOKEN_PATH = path.join(process.cwd(), 'google-token.json');
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

// ============================================
// GOOGLE AUTH КЛАС
// ============================================

class GoogleAuth {
  constructor() {
    this.oauth2Client = null;
    this.credentials = null;
  }

  /**
   * Ініціалізація OAuth2 клієнта
   */
  async initialize() {
    // TODO: Користувач має створити ці credentials в Google Cloud Console
    // Інструкції будуть в README.md
    this.credentials = {
      client_id: process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
      redirect_uris: [REDIRECT_URI]
    };

    const { client_id, client_secret, redirect_uris } = this.credentials;

    this.oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Спробувати завантажити збережений токен
    await this.loadSavedToken();
  }

  /**
   * Завантажити збережений токен
   */
  async loadSavedToken() {
    try {
      const token = await fs.readFile(TOKEN_PATH, 'utf8');
      this.oauth2Client.setCredentials(JSON.parse(token));
      console.log('✅ Токен завантажено з файлу');
      return true;
    } catch (error) {
      console.log('ℹ️ Токен не знайдено, потрібна авторизація');
      return false;
    }
  }

  /**
   * Зберегти токен
   */
  async saveToken(tokens) {
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    console.log('✅ Токен збережено');
  }

  /**
   * Перевірити чи є активний токен
   */
  isAuthorized() {
    if (!this.oauth2Client) {
      return false;
    }

    const credentials = this.oauth2Client.credentials;
    if (!credentials || !credentials.access_token) {
      return false;
    }

    // Перевірити чи токен не протермінований
    if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
      return false;
    }

    return true;
  }

  /**
   * Авторизувати користувача
   */
  async authorize() {
    if (!this.oauth2Client) {
      await this.initialize();
    }

    // Якщо вже авторизовані - повернути клієнта
    if (this.isAuthorized()) {
      console.log('✅ Вже авторизовані');
      return this.oauth2Client;
    }

    // Створити authorization URL
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // Завжди показувати consent screen для отримання refresh token
    });

    console.log('🔐 Авторизація Google...');
    console.log('📄 Відкриваю браузер для авторизації...');

    // Створити локальний сервер для отримання callback
    const code = await this.getAuthorizationCode(authUrl);

    // Обміняти код на токени
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Зберегти токени
    await this.saveToken(tokens);

    console.log('✅ Авторизація успішна!');
    return this.oauth2Client;
  }

  /**
   * Отримати код авторизації через локальний сервер
   */
  async getAuthorizationCode(authUrl) {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        try {
          const queryParams = url.parse(req.url, true).query;

          if (queryParams.code) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <title>Авторизація успішна</title>
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
                  .card {
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                    max-width: 400px;
                  }
                  h1 {
                    color: #4CAF50;
                    margin: 0 0 20px 0;
                  }
                  p {
                    color: #666;
                    margin: 10px 0;
                  }
                  .close-info {
                    margin-top: 20px;
                    font-size: 14px;
                    color: #999;
                  }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>✅ Авторизація успішна!</h1>
                  <p>Ви успішно авторизувалися в Google Account.</p>
                  <p>Тепер можете закрити це вікно і повернутися до програми.</p>
                  <div class="close-info">
                    Це вікно можна закрити
                  </div>
                </div>
                <script>
                  setTimeout(() => window.close(), 3000);
                </script>
              </body>
              </html>
            `);

            server.close();
            resolve(queryParams.code);
          } else if (queryParams.error) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <title>Помилка авторизації</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                  }
                  .card {
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                    max-width: 400px;
                  }
                  h1 {
                    color: #f44336;
                    margin: 0 0 20px 0;
                  }
                  p {
                    color: #666;
                    margin: 10px 0;
                  }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>❌ Помилка авторизації</h1>
                  <p>${queryParams.error}</p>
                  <p>Спробуйте ще раз в програмі.</p>
                </div>
              </body>
              </html>
            `);

            server.close();
            reject(new Error(queryParams.error));
          }
        } catch (error) {
          server.close();
          reject(error);
        }
      });

      server.listen(3000, () => {
        console.log('🌐 Локальний сервер запущено на http://localhost:3000');
        
        // Відкрити браузер
        open(authUrl).catch((error) => {
          console.error('❌ Не вдалося відкрити браузер:', error.message);
          console.log('📄 Відкрийте цей URL вручну:', authUrl);
        });
      });

      // Timeout через 5 хвилин
      setTimeout(() => {
        server.close();
        reject(new Error('Timeout: Авторизація не завершена за 5 хвилин'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Отримати OAuth2 клієнта
   */
  async getClient() {
    if (!this.isAuthorized()) {
      await this.authorize();
    }

    return this.oauth2Client;
  }

  /**
   * Вийти (видалити токен)
   */
  async logout() {
    try {
      await fs.unlink(TOKEN_PATH);
      this.oauth2Client = null;
      console.log('✅ Вийшли з Google Account');
      return true;
    } catch (error) {
      console.error('❌ Помилка виходу:', error.message);
      return false;
    }
  }

  /**
   * Отримати інформацію про користувача
   */
  async getUserInfo() {
    if (!this.isAuthorized()) {
      throw new Error('Не авторизовані. Спочатку викличте authorize()');
    }

    try {
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2'
      });

      const { data } = await oauth2.userinfo.get();

      return {
        email: data.email,
        name: data.name,
        picture: data.picture
      };
    } catch (error) {
      console.error('❌ Помилка отримання інформації:', error.message);
      throw error;
    }
  }
}

// ============================================
// ЕКСПОРТ
// ============================================

module.exports = { GoogleAuth };