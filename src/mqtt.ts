import mqtt from "async-mqtt";
import type pino from "pino";
import type { MqttConfig } from "./config";

const createMqttClient = async (
  logger: pino.Logger,
  { url, clientOptions }: MqttConfig
) => {
  logger.info("Connect to MQTT broker");
  // There is a try-catch where this function is called.
  return await mqtt.connectAsync(url, clientOptions);
};

export default createMqttClient;
