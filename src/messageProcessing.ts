import type mqtt from "async-mqtt";
import type pino from "pino";
import type Pulsar from "pulsar-client";
import type { MqttConfig } from "./config";

const keepProcessingMessages = async (
  logger: pino.Logger,
  pulsarConsumer: Pulsar.Consumer,
  mqttClient: mqtt.AsyncMqttClient,
  { topic, publishOptions }: MqttConfig
): Promise<void> => {
  const logIntervalInSeconds = 60;
  let nRecentMessages = 0;

  setInterval(() => {
    logger.info({ nRecentMessages }, "Messages forwarded to MQTT.");
    nRecentMessages = 0;
  }, 1_000 * logIntervalInSeconds);

  const processPulsarMessage = (
    consumer: Pulsar.Consumer,
    message: Pulsar.Message
  ) => {
    const data = message.getData();
    const properties = message.getProperties();
    const fullTopic = topic + (properties["topicSuffix"] ?? "");
    // In case of an error, exit via the listener on unhandledRejection.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    mqttClient.publish(fullTopic, data, publishOptions).then(() => {
      nRecentMessages += 1;
      // In case of an error, exit via the listener on unhandledRejection.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      consumer.acknowledge(message).then(() => {});
    });
  };

  // Errors are handled on the main level.
  /* eslint-disable no-await-in-loop */
  for (;;) {
    const pulsarMessage = await pulsarConsumer.receive();
    processPulsarMessage(pulsarConsumer, pulsarMessage);
  }
  /* eslint-enable no-await-in-loop */
};

export default keepProcessingMessages;
