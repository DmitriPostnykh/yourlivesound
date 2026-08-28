# Your Live Sound

Spring Boot and Thymeleaf site for [yourlivesound.com](https://yourlivesound.com).

## Учебник Harness для пользователя

Браузерный адрес единого HTML-учебника Harness:
<file:///Users/dev/.codex/deepseekhurnes/runtime/current/docs/harness-architecture.html>.
Учебник коротко и по-русски объясняет, как работают агенты, проверки, разрешения,
среды запуска, модели и способы подключения. Если пользователь просит «дай
ссылку на учебник Harness», агент возвращает эту кликабельную ссылку, а не
только пересказ. Учебник объясняет устройство, но не доказывает текущую квоту,
авторизацию или состояние рабочей среды.

## Local verification

```sh
npm test
./mvnw --batch-mode --no-transfer-progress verify
```

To run the packaged application locally, provide a non-production FormSubmit test endpoint:

```sh
APP_CONTACT_FORM_ACTION=https://formsubmit.co/test-recipient ./mvnw spring-boot:run
```

## Container

The image is built reproducibly from pinned Java 17.0.20 builder and runtime images. The runtime is non-root and includes a Docker healthcheck. `compose.yaml` binds the app only to `127.0.0.1:8082`, limits it to 384 MB RAM and one CPU, uses a read-only root filesystem, rotates JSON logs at 10 MB with three files, and versions CSS/JavaScript URLs with the image tag.

Create a private `.env` from `.env.example`, then:

```sh
YLS_IMAGE_TAG=$(git rev-parse --short=12 HEAD) docker compose build
YLS_IMAGE_TAG=$(git rev-parse --short=12 HEAD) docker compose up -d
```

This deployment manages only `yourlivesound-app`. It must not prune Docker globally, edit the shared Nginx configuration, or alter any neighboring VPS service.
