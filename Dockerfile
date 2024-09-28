# Используем официальный образ OpenJDK 17 с Alpine
FROM openjdk:17-jdk-alpine

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем JAR файл из сборки Maven в контейнер
COPY target/yourlivesound-0.0.1-SNAPSHOT.jar app.jar

# Устанавливаем переменную окружения для JVM
ENV JAVA_OPTS=""

# Указываем команду для запуска приложения
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

# Открываем новый порт 8082
EXPOSE 8082
