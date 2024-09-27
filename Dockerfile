# 1. Используем официальный образ OpenJDK
FROM openjdk:17-jdk-alpine

# 2. Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# 3. Копируем собранный .jar файл в контейнер (заранее должен быть собран с помощью Gradle/Maven)
COPY target/yourlivesound-0.0.1-SNAPSHOT.jar app.jar

# 4. Указываем команду для запуска приложения внутри контейнера
ENTRYPOINT ["java", "-jar", "app.jar"]
