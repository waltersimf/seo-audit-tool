# 📖 Інструкція: Налаштування Google Cloud для SEO Audit Tool

## 🎯 Що це дає?

Після налаштування ви зможете:
- ✅ Експортувати звіти в **Google Docs** (структурований документ)
- ✅ Експортувати дані в **Google Sheets** (таблиця для аналізу)
- ✅ Зберігати звіти в своєму Google Drive
- ✅ Ділитися звітами з клієнтами одним кліком

---

## ⏱️ Час налаштування: **10-15 хвилин**

---

## 📋 Покрокова інструкція:

### Крок 1: Створити Google Cloud проект (2 хв)

1. Перейдіть на [Google Cloud Console](https://console.cloud.google.com/)
   
2. Натисніть **"Select a project"** (вгорі зліва)

3. Натисніть **"NEW PROJECT"**

4. Введіть назву проекту: **"SEO Audit Tool"**

5. Натисніть **"CREATE"**

6. Дочекайтесь створення проекту (~10 секунд)

---

### Крок 2: Увімкнути необхідні APIs (3 хв)

1. В меню зліва виберіть **"APIs & Services"** → **"Library"**

2. Знайдіть та увімкніть наступні APIs:

   **a) Google Docs API:**
   - Введіть в пошук: `Google Docs API`
   - Клікніть на результат
   - Натисніть **"ENABLE"**
   - Дочекайтесь активації (~5 сек)

   **b) Google Sheets API:**
   - Поверніться до Library
   - Введіть в пошук: `Google Sheets API`
   - Клікніть на результат
   - Натисніть **"ENABLE"**
   - Дочекайтесь активації (~5 сек)

   **c) Google Drive API:**
   - Поверніться до Library
   - Введіть в пошук: `Google Drive API`
   - Клікніть на результат
   - Натисніть **"ENABLE"**
   - Дочекайтесь активації (~5 сек)

✅ Тепер ви маєте 3 активовані APIs!

---

### Крок 3: Налаштувати OAuth Consent Screen (3 хв)

1. В меню зліва виберіть **"APIs & Services"** → **"OAuth consent screen"**

2. Оберіть тип користувача:
   - ✅ **External** (для особистого використання)
   - Натисніть **"CREATE"**

3. Заповніть форму:
   - **App name:** `SEO Audit Tool`
   - **User support email:** [ваш email]
   - **Developer contact information:** [ваш email]
   - Натисніть **"SAVE AND CONTINUE"**

4. **Scopes** (область доступу):
   - Натисніть **"ADD OR REMOVE SCOPES"**
   - Знайдіть та виберіть наступні scopes:
     - ✅ `.../auth/docs` (Google Docs)
     - ✅ `.../auth/spreadsheets` (Google Sheets)
     - ✅ `.../auth/drive.file` (Google Drive)
   - Натисніть **"UPDATE"**
   - Натисніть **"SAVE AND CONTINUE"**

5. **Test users** (тестові користувачі):
   - Натисніть **"+ ADD USERS"**
   - Введіть свій email
   - Натисніть **"ADD"**
   - Натисніть **"SAVE AND CONTINUE"**

6. **Summary:**
   - Перегляньте налаштування
   - Натисніть **"BACK TO DASHBOARD"**

✅ OAuth Consent Screen налаштовано!

---

### Крок 4: Створити OAuth 2.0 Credentials (2 хв)

1. В меню зліва виберіть **"APIs & Services"** → **"Credentials"**

2. Натисніть **"+ CREATE CREDENTIALS"** (вгорі)

3. Оберіть **"OAuth client ID"**

4. Налаштування:
   - **Application type:** `Desktop app`
   - **Name:** `SEO Audit Tool Desktop`
   - Натисніть **"CREATE"**

5. **Важливо!** З'явиться вікно з вашими credentials:

   ```
   ✅ Client ID: 123456789-abc...apps.googleusercontent.com
   ✅ Client Secret: GOCSPX-xyz...
   ```

6. **Скопіюйте обидва значення!** Вони знадобляться в програмі.

   💡 Ви також можете завантажити JSON файл (кнопка "DOWNLOAD JSON")

---

### Крок 5: Додати credentials в SEO Audit Tool (1 хв)

1. Відкрийте **SEO Audit Tool**

2. Знайдіть секцію **"Google Account"**

3. Натисніть кнопку **"⚙️ Налаштувати"**

4. Вставте ваші credentials:
   - **Client ID:** `123456789-abc...apps.googleusercontent.com`
   - **Client Secret:** `GOCSPX-xyz...`

5. Натисніть **"💾 Зберегти налаштування"**

6. Натисніть **"🔐 Підключити"**

7. Відкриється браузер з запитом доступу:
   - Оберіть свій Google аккаунт
   - Натисніть **"Continue"** (якщо з'являється попередження про тестовий додаток)
   - Натисніть **"Allow"** для надання доступу

8. Побачите повідомлення: **"✅ Авторизація успішна!"**

9. Поверніться до програми - тепер ви підключені! ☁️

---

## ✅ Готово!

Тепер ви можете:
- 📄 Експортувати звіти в Google Docs
- 📊 Експортувати дані в Google Sheets
- ☁️ Всі файли автоматично зберігаються в вашому Google Drive

---

## ❓ Часті питання

### Q: Чи безпечно це?
**A:** Так! Ваші credentials зберігаються **локально** на вашому комп'ютері в файлі `google-config.json`. Ніхто інший не має до них доступу.

### Q: Чи можу я видалити доступ?
**A:** Так! Просто натисніть кнопку **"🚪 Вийти"** в програмі або видаліть доступ в [Google Account Settings](https://myaccount.google.com/permissions).

### Q: Чи працює це для кількох користувачів?
**A:** Так! Кожен користувач налаштовує свої власні credentials. Це робить програму більш безпечною і гнучкою.

### Q: Скільки коштує Google Cloud?
**A:** Для особистого використання - **безкоштовно**! Google дає 10,000+ безкоштовних запитів до API на місяць. Для SEO аудитів цього більш ніж достатньо.

### Q: Що робити якщо забув credentials?
**A:** Ви завжди можете подивитися їх в [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.

### Q: Можу я використовувати один проект для кількох програм?
**A:** Так, але краще створити окремий проект для кожної програми для кращої організації.

---

## 🛟 Потрібна допомога?

Якщо щось не виходить:

1. **Перевірте чи всі APIs увімкнені:**
   - Google Docs API ✅
   - Google Sheets API ✅
   - Google Drive API ✅

2. **Перевірте OAuth Consent Screen:**
   - Ваш email додано як Test User ✅
   - Scopes налаштовані ✅

3. **Перевірте Credentials:**
   - Application type = Desktop app ✅
   - Client ID і Secret правильно скопійовані ✅

4. **Все ще не працює?**
   - Перезапустіть програму
   - Спробуйте вийти і увійти знову
   - Створіть новий OAuth Client ID

---

**Успіхів! 🚀**

**SEO Audit Tool Team**