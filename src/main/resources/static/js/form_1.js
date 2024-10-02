document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById('contactForm');

    form.addEventListener('submit', function(event) {
        event.preventDefault(); // Останавливаем отправку формы

        // Здесь можно добавить логику для отправки данных формы на сервер
        alert('Форма отправлена! Спасибо за сообщение.');
    });
});
