import type mqtt from "async-mqtt";
import type pino from "pino";
import type Pulsar from "pulsar-client";
import type { MqttConfig } from "./config";
import transformUnknownToError from "./util";

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

  const onPublishFulfilled = (
    consumer: Pulsar.Consumer,
    message: Pulsar.Message
  ) => {
    return () => {
      nRecentMessages += 1;
      // In case of an error, exit via the listener on unhandledRejection.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      consumer.acknowledge(message);
    };
  };

  const onPublishRejected = () => {
    // any is the type for onRejected of then().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (reason: any) => {
      const err = transformUnknownToError(reason);
      logger.fatal({ err }, "Publishing to MQTT failed");
      // Aim to exit.
      throw reason;
    };
  };

  // Errors are handled on the main level.
  /* eslint-disable no-await-in-loop */
  for (;;) {
    const pulsarMessage = await pulsarConsumer.receive();
    const data = pulsarMessage.getData();
    const properties = pulsarMessage.getProperties();
    const fullTopic = topic + (properties["topicSuffix"] ?? "");
    mqttClient
      .publish(fullTopic, data, publishOptions)
      .then(
        onPublishFulfilled(pulsarConsumer, pulsarMessage),
        onPublishRejected()
      );
  }
  /* eslint-enable no-await-in-loop */
};

export default keepProcessingMessages;
