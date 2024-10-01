document.addEventListener("DOMContentLoaded", function() {
    // По умолчанию загружаем английскую локализацию
    loadLocalization('en');

    // События для переключения языка
    document.getElementById("lang-en").addEventListener("click", function() {
        loadLocalization('en');
    });

    document.getElementById("lang-ru").addEventListener("click", function() {
        loadLocalization('ru');
    });
});

function loadLocalization(language) {
    fetch(`/json/${language}.json`)
        .then(response => response.json())
        .then(data => updateContent(data))
        .catch(error => console.error("Ошибка загрузки локализации:", error));
}

function updateContent(data) {
    // Обновляем навигацию
    document.getElementById("nav-home").textContent = data.nav.home;
    document.getElementById("nav-about").textContent = data.nav.about;
    document.getElementById("nav-testimonials").textContent = data.nav.testimonials;
    document.getElementById("nav-contact").textContent = data.nav.contact;
    document.getElementById("nav-login").textContent = data.nav.login;
    document.getElementById("nav-register").textContent = data.nav.register;

    // Обновляем контент сайта
    document.getElementById("site-title").textContent = data.site.title;
    document.getElementById("site-description").textContent = data.site.description;
    document.getElementById("form-submit").textContent = data.form.submit;
}
