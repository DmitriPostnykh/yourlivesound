const translations = {};

function loadTranslations(lang) {
    fetch(`${lang}.json`)
        .then(response => {
            console.log(`Fetching ${lang}.json`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log(`Loaded translations for ${lang}:`, data);
            translations[lang] = data;
            updateContent(lang);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}

function updateContent(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = translations[lang][key];
    });
    console.log(`Content updated to ${lang}`);
}

function setLanguage(lang) {
    console.log(`Setting language to ${lang}`);
    if (translations[lang]) {
        updateContent(lang);
    } else {
        loadTranslations(lang);
    }
}

function detectLanguage() {
    // Определение языка браузера
    const userLang = navigator.language || navigator.userLanguage;
    console.log(`Browser language detected: ${userLang}`);

    if (userLang.includes('ru')) {
        setLanguage('ru');
        return;
    }

    // Использование API геолокации для определения страны пользователя
    fetch('https://ipapi.co/json/')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log(`Geolocation data: ${JSON.stringify(data)}`);
            if (data.country_code === 'RU') {
                setLanguage('ru');
            } else {
                setLanguage('en');
            }
        })
        .catch(error => {
            console.error('Geolocation error:', error);
            setLanguage('en');  // Используем английский по умолчанию в случае ошибки
        });
}

// Инициализация с автоматическим определением языка
detectLanguage();                   