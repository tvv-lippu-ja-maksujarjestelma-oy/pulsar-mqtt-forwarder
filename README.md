# pulsar-mqtt-forwarder

Forward Apache Pulsar messages to an MQTT broker.

This repository has been created as part of the [Waltti APC](https://github.com/tvv-lippu-ja-maksujarjestelma-oy/waltti-apc) project.

## Development

1. Create a suitable `.env` file for configuration.
   Check below for the configuration reference.
1. Create any necessary secrets that the `.env` file points to.
1. Install dependencies:

   ```sh
   npm install
   ```

1. Run linters and tests and build:

   ```sh
   npm run check-and-build
   ```

1. Load the environment variables:

   ```sh
   set -a
   source .env
   set +a
   ```

1. Run the application:

   ```sh
   npm start
   ```

## Docker

You can use the Docker image `tvvlmj/pulsar-mqtt-forwarder:edge`.
Check out [the available tags](https://hub.docker.com/r/tvvlmj/pulsar-mqtt-forwarder/tags).

## Configuration

| Environment variable           | Required? | Default value | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------ | --------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HEALTH_CHECK_PORT`            | ❌ No     | `8080`        | Which port to use to respond to health checks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `MQTT_CLEAN_SESSION`           | ❌ No     | `false`       | Whether to clean the MQTT session on (re)connect. Setting `MQTT_CLEAN_SESSION` to `true` forces forgetting the context of messages received and sent, effectively dropping QoS 1 and QoS 2 messages that have not been acknowledged. Specific to Client Identifier.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `MQTT_CLIENT_ID_PREFIX`        | ✅ Yes    |               | The static part of the Client Identifier to use when connecting to the MQTT broker. Client Identifier must be unique on the broker or connecting will cause the broker to drop the existing connection of the other client with the identical Client Identifier and will cause this client to receive the uncleaned state of the other client, depending on the value of `MQTT_CLEAN_SESSION`. For uniqueness per instance, use `MQTT_CLIENT_ID_SUFFIX_LENGTH`.                                                                                                                                                                                                         |
| `MQTT_CLIENT_ID_SUFFIX_LENGTH` | ❌ No     |               | The length of a random UTF-8-encoded suffix to append to `MQTT_CLIENT_ID_PREFIX`. The length is measured in bytes. The suffix content will be random Base64-encoded bytes generated when the process starts. If `MQTT_CLIENT_ID_SUFFIX_LENGTH` is not set or its value is `0`, no suffix will be added. Negative values throw an exception. Positive integers will lead to appending that many bytes. MQTT brokers have limits on the length of the total Client Identifier. The MQTT standard version 3.1.1 requires brokers to tolerate at least 23 UTF-8-encoded bytes in total as the length for the Client Identifier. In practice, the size limit is much higher. |
| `MQTT_PASSWORD_PATH`           | ❌ No     |               | The path to the file containing the password to the MQTT broker. If `MQTT_USERNAME_PATH` is set, `MQTT_PASSWORD_PATH` must also be set.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `MQTT_QOS`                     | ❌ No     | 2             | The Quality of Service (QoS) of the MQTT messages. If set, must be either `0`, `1` or `2`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `MQTT_TOPIC`                   | ✅ Yes    |               | The MQTT topic to send the messages to. If the Pulsar message has a property called `topicSuffix`, that string will be appended to `MQTT_TOPIC` as such. If the Pulsar message does not have that property, `MQTT_TOPIC` is the full MQTT topic. Note that no forward slash is automatically added between `MQTT_TOPIC` and `topicSuffix`, unlike in [HSLdevcom/pulsar-mqtt-gateway](https://github.com/HSLdevcom/pulsar-mqtt-gateway).                                                                                                                                                                                                                                 |
| `MQTT_URL`                     | ✅ Yes    |               | The URL for the MQTT broker.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `MQTT_USERNAME_PATH`           | ❌ No     |               | The path to the file containing the username to the MQTT broker. If `MQTT_PASSWORD_PATH` is set, `MQTT_USERNAME_PATH` must also be set.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `PINO_LOG_LEVEL`               | ❌ No     | `info`        | The level of logging to use. One of "fatal", "error", "warn", "info", "debug", "trace" or "silent".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `PULSAR_TOPICS_PATTERN`        | ✅ Yes    |               | The Pulsar topics pattern to consume messages from.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `PULSAR_SUBSCRIPTION`          | ✅ Yes    |               | The name of the Pulsar subscription for reading messages from `PULSAR_TOPICS_PATTERN`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `PULSAR_OAUTH2_AUDIENCE`       | ✅ Yes    |               | The OAuth 2.0 audience for Pulsar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `PULSAR_OAUTH2_ISSUER_URL`     | ✅ Yes    |               | The OAuth 2.0 issuer URL for Pulsar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `PULSAR_OAUTH2_KEY_PATH`       | ✅ Yes    |               | The path to the OAuth 2.0 private key JSON file for Pulsar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `PULSAR_SERVICE_URL`           | ✅ Yes    |               | The service URL for Pulsar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `PULSAR_TLS_VALIDATE_HOSTNAME` | ❌ No     | `true`        | Whether to validate the Pulsar hostname on its TLS certificate. This option exists because some Apache Pulsar hosting providers cannot handle Apache Pulsar clients setting this to `true`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
