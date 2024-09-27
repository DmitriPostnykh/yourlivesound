const translations = {
    en: {
        welcome_message: "Welcome to our website!",
        description: "This is a sample website."
    },
    ru: {
        welcome_message: "Добро пожаловать на наш сайт!",
        description: "Это пример сайта."
    }
};

function setLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = translations[lang][key];
    });
}

// По умолчанию ставим английский язык
setLanguage('en');
