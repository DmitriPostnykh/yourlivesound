FROM eclipse-temurin:17-jdk-jammy@sha256:400014962ad7224461f945bb1cc3d7d5a1927ce15b8245b72d9cedcda554cd2a AS build

WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw --batch-mode --no-transfer-progress -DskipTests dependency:go-offline

COPY src src
RUN ./mvnw --batch-mode --no-transfer-progress -DskipTests package

FROM eclipse-temurin:17-jre-jammy@sha256:e17d77fb030dd4b642dc078d048a5fb9efcb3676ee20305d905949105a6ccd5a

ARG VCS_REF=unknown
LABEL org.opencontainers.image.source="https://github.com/DmitriPostnykh/yourlivesound" \
      org.opencontainers.image.revision="${VCS_REF}"

RUN groupadd --system app && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app
WORKDIR /app
COPY --from=build --chown=app:app /workspace/target/yourlivesound-0.0.1-SNAPSHOT.jar /app/app.jar

USER app
EXPOSE 8082

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8082/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:+UseSerialGC", "-XX:InitialRAMPercentage=10.0", "-XX:MaxRAMPercentage=65.0", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/app.jar"]
