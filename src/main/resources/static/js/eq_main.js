// eq_main.js

const container = document.getElementById('volumeBars');
const reflectionContainer = document.getElementById('reflectionBars');
const maxHeight = 30 * window.innerHeight / 100; // Изначальная высота эквалайзера
const stepSize = 20;
const maxDirectionChanges = 5;

// Создаем массив для отслеживания состояния каждого столбика
const barsData = [];

for (let i = 0; i < 14; i++) {
    const barContainer = document.createElement('div');
    barContainer.classList.add('bar-container');

    const bar = document.createElement('div');
    bar.classList.add('bar');
    barContainer.appendChild(bar);
    container.appendChild(barContainer);

    // Создаем отражение для каждого столбика
    const reflectionBarContainer = document.createElement('div');
    reflectionBarContainer.classList.add('bar-container');

    const reflectionBar = document.createElement('div');
    reflectionBar.classList.add('bar');
    reflectionBarContainer.appendChild(reflectionBar);
    reflectionContainer.appendChild(reflectionBarContainer);

    // Инициализируем данные для каждого столбика и их отражений
    barsData.push({
        element: bar,
        reflectionElement: reflectionBar,
        currentHeight: Math.floor(Math.random() * maxHeight),
        direction: 1,
        directionChanges: 0
    });
}

function animateBars() {
    barsData.forEach(barData => {
        const { element, reflectionElement, currentHeight, direction, directionChanges } = barData;

        if (directionChanges >= maxDirectionChanges) {
            barData.direction = -direction;
            barData.directionChanges = 0;
        }

        let newHeight = currentHeight + (Math.floor(Math.random() * stepSize) * direction);

        if (newHeight >= maxHeight) {
            newHeight = maxHeight;
            barData.direction = -1;
            barData.directionChanges++;
        } else if (newHeight <= 0) {
            newHeight = 0;
            barData.direction = 1;
            barData.directionChanges++;
        }

        barData.currentHeight = newHeight;
        element.style.height = newHeight + 'px';
        reflectionElement.style.height = newHeight + 'px';
    });

    requestAnimationFrame(animateBars);
}

requestAnimationFrame(animateBars);
