document.addEventListener("DOMContentLoaded", function () {
    const menuContainer = document.querySelector(".menu-container");

    // Проверяем, была ли анимация уже выполнена
    if (!sessionStorage.getItem('menuAnimationDone')) {
        // Задержка в 3 секунды перед началом анимации
        setTimeout(() => {
            menuContainer.style.opacity = '1'; // Плавное появление
            menuContainer.style.transition = 'opacity 3s ease'; // Анимация появления в течение 3 секунд

            // Сохраняем информацию, что анимация была выполнена
            sessionStorage.setItem('menuAnimationDone', 'true');
        }, 3000);
    } else {
        // Если анимация уже была выполнена, показываем меню сразу
        menuContainer.style.opacity = '1';
    }
});
