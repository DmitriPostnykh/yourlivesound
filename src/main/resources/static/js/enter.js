window.onload = function() {
    setTimeout(function() {
        const enterContainer = document.querySelector('.enter-container');
        enterContainer.style.display = 'flex'; // Отображаем блок
        setTimeout(function() {
            enterContainer.style.opacity = '1'; // Плавное появление
        }, 50); // Небольшая задержка, чтобы анимация сработала корректно
    }, 3000); // Задержка 3 секунды перед стартом
};
