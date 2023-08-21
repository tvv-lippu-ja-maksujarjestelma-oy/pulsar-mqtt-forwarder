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

  const processPulsarMessage = async (
    consumer: Pulsar.Consumer,
    message: Pulsar.Message
  ) => {
    const data = message.getData();
    const properties = message.getProperties();
    const fullTopic = topic + (properties["topicSuffix"] ?? "");
    await mqttClient.publish(fullTopic, data, publishOptions);
    nRecentMessages += 1;
    await consumer.acknowledge(message);
  };

  // Errors are handled on the main level.
  /* eslint-disable no-await-in-loop */
  for (;;) {
    const pulsarMessage = await pulsarConsumer.receive();
    // To utilize concurrency and to not limit throughput unnecessarily, we
    // should _not_ await processPulsarMessage. Instead, Promises are handled in
    // order by Node.js. The Promise will rely on the internal message queue in
    // mqtt.js and MQTT-over-TCP to ensure that first copies of each MQTT
    // message with QoS 1 stay in order and that Pulsar messages are
    // acknowledged in order. Therefore here we can receive the next Pulsar
    // message right away.
    //
    // In case of an error, exit via the listener on unhandledRejection.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    processPulsarMessage(pulsarConsumer, pulsarMessage);
  }
  /* eslint-enable no-await-in-loop */
};

export default keepProcessingMessages;
