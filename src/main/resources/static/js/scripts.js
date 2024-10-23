document.addEventListener('DOMContentLoaded', function() {
    const fadeInElements = document.querySelectorAll('.fade-in');
    const serviceLeft = document.querySelectorAll('.service-left');
    const serviceRight = document.querySelectorAll('.service-right');

    function checkVisibility() {
        fadeInElements.forEach(function(element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= window.innerHeight && rect.bottom >= 0) {
                element.classList.add('show');
            }
        });

        // Обработка для блоков с боковым движением
        serviceLeft.forEach(function(element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= window.innerHeight && rect.bottom >= 0) {
                element.classList.add('show');
            }
        });

        serviceRight.forEach(function(element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= window.innerHeight && rect.bottom >= 0) {
                element.classList.add('show');
            }
        });
    }

    window.addEventListener('scroll', checkVisibility);
    checkVisibility(); // вызов при загрузке страницы
});
