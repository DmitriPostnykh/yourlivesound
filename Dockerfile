# Используем стандартный OpenJDK 17 slim
FROM openjdk:17-jdk-slim

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем файл сборки (JAR-файл) из локальной системы в контейнер
COPY target/yourlivesound-0.0.1-SNAPSHOT.jar app.jar

# Устанавливаем переменную окружения для JVM
ENV JAVA_OPTS=""

# Указываем команду для запуска приложения
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

# Открываем порт (например, 8082)
EXPOSE 8082

