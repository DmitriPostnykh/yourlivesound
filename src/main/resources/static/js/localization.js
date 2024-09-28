function loadTranslations(lang) {
    fetch(`/static/json/${lang}.json`)
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = data[key];
            });
        })
        .catch(error => {
            console.error('Error loading translations:', error);
        });
}

// Устанавливаем язык по умолчанию (английский)
loadTranslations('en');

// Привязываем кнопки для переключения языков
function setLanguage(lang) {
    loadTranslations(lang);
}

