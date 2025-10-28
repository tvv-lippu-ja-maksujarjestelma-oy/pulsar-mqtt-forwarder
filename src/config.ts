import crypto from "crypto";
import fs from "fs";
import type mqtt from "mqtt";
import type pino from "pino";
import Pulsar from "pulsar-client";

export interface MqttConfig {
  url: string;
  topic: string;
  clientOptions: mqtt.IClientOptions;
  publishOptions: mqtt.IClientPublishOptions;
}

export interface PulsarOauth2Config {
  // pulsar-client requires "type" but that seems unnecessary
  type: string;
  issuer_url: string;
  client_id?: string;
  client_secret?: string;
  private_key?: string;
  audience?: string;
  scope?: string;
}

export interface PulsarConfig {
  oauth2Config?: PulsarOauth2Config;
  clientConfig: Pulsar.ClientConfig;
  consumerConfig: Pulsar.ConsumerConfig;
}

export interface HealthCheckConfig {
  port: number;
}

export interface Config {
  mqtt: MqttConfig;
  pulsar: PulsarConfig;
  healthCheck: HealthCheckConfig;
}

const getRequired = (envVariable: string) => {
  const variable = process.env[envVariable];
  if (variable === undefined) {
    throw new Error(`${envVariable} must be defined`);
  }
  return variable;
};

const getOptional = (envVariable: string) => process.env[envVariable];

const getOptionalNonNegativeInteger = (
  envVariable: string
): number | undefined => {
  let result;
  const str = getOptional(envVariable);
  if (str !== undefined) {
    const num = parseInt(str, 10);
    if (Number.isNaN(num) || num < 0) {
      throw new Error(
        `If defined, ${envVariable} must be a non-negative integer.`
      );
    }
    result = num;
  }
  return result;
};

const getOptionalBooleanWithDefault = (
  envVariable: string,
  defaultValue: boolean
) => {
  let result = defaultValue;
  const str = getOptional(envVariable);
  if (str !== undefined) {
    if (!["false", "true"].includes(str)) {
      throw new Error(`${envVariable} must be either "false" or "true"`);
    }
    result = str === "true";
  }
  return result;
};

const getMqttQos = (): mqtt.QoS => {
  const qos = parseInt(process.env["MQTT_QOS"] ?? "2", 10);
  if (qos !== 0 && qos !== 1 && qos !== 2) {
    throw new Error("If defined, MQTT_QOS must be 0, 1 or 2. Default is 2.");
  }
  return qos;
};

const getMqttAuth = () => {
  let result;
  const usernamePath = process.env["MQTT_USERNAME_PATH"];
  const passwordPath = process.env["MQTT_PASSWORD_PATH"];
  const isUsernamePath = usernamePath !== undefined;
  const isPasswordPath = passwordPath !== undefined;
  if (isUsernamePath !== isPasswordPath) {
    throw new Error(
      "Either both or neither of MQTT_USERNAME_PATH and MQTT_PASSWORD_PATH " +
        "must be defined"
    );
  }
  if (isUsernamePath && isPasswordPath) {
    result = {
      username: fs.readFileSync(usernamePath, "utf8"),
      password: fs.readFileSync(passwordPath, "utf8"),
    };
  }
  return result;
};

const createMqttClientId = () => {
  const prefix = getRequired("MQTT_CLIENT_ID_PREFIX");
  const suffixLength =
    getOptionalNonNegativeInteger("MQTT_CLIENT_ID_SUFFIX_LENGTH") ?? 0;
  // n random bytes will always result in at least n characters.
  const suffix = crypto
    .randomBytes(suffixLength)
    .toString("base64")
    .slice(0, suffixLength);
  const clientId = prefix + suffix;
  return clientId;
};

const getMqttConfig = (): MqttConfig => {
  const url = getRequired("MQTT_URL");
  const usernameAndPassword = getMqttAuth();
  const clientId = createMqttClientId();
  const topic = getRequired("MQTT_TOPIC");
  const qos = getMqttQos();
  const clean = getOptionalBooleanWithDefault("MQTT_CLEAN_SESSION", false);
  return {
    url,
    topic,
    clientOptions: {
      clientId,
      clean,
      ...usernameAndPassword,
    },
    publishOptions: {
      qos,
    },
  };
};

const getPulsarOauth2Config = (): PulsarOauth2Config | undefined => {
  const issuerUrl = getOptional("PULSAR_OAUTH2_ISSUER_URL");
  const privateKey = getOptional("PULSAR_OAUTH2_KEY_PATH");
  const audience = getOptional("PULSAR_OAUTH2_AUDIENCE");

  const anyProvided =
    issuerUrl !== undefined ||
    privateKey !== undefined ||
    audience !== undefined;
  if (!anyProvided) {
    return undefined;
  }

  if (!issuerUrl || !privateKey || !audience) {
    throw new Error(
      "If any of PULSAR_OAUTH2_ISSUER_URL, PULSAR_OAUTH2_KEY_PATH, PULSAR_OAUTH2_AUDIENCE is defined, all must be defined."
    );
  }

  return {
    // pulsar-client requires "type" but that seems unnecessary
    type: "client_credentials",
    issuer_url: issuerUrl,
    private_key: privateKey,
    audience,
  };
};

const createPulsarLog =
  (logger: pino.Logger) =>
  (
    level: Pulsar.LogLevel,
    file: string,
    line: number,
    message: string
  ): void => {
    switch (level) {
      case Pulsar.LogLevel.DEBUG:
        logger.debug({ file, line }, message);
        break;
      case Pulsar.LogLevel.INFO:
        logger.info({ file, line }, message);
        break;
      case Pulsar.LogLevel.WARN:
        logger.warn({ file, line }, message);
        break;
      case Pulsar.LogLevel.ERROR:
        logger.error({ file, line }, message);
        break;
      default: {
        const exhaustiveCheck: never = level;
        throw new Error(String(exhaustiveCheck));
      }
    }
  };

const getPulsarConfig = (logger: pino.Logger) => {
  const oauth2Config = getPulsarOauth2Config();
  const serviceUrl = getRequired("PULSAR_SERVICE_URL");
  const tlsValidateHostname = getOptionalBooleanWithDefault(
    "PULSAR_TLS_VALIDATE_HOSTNAME",
    true
  );
  const log = createPulsarLog(logger);
  const topicsPattern = getRequired("PULSAR_TOPICS_PATTERN");
  const subscription = getRequired("PULSAR_SUBSCRIPTION");
  const subscriptionType: Pulsar.SubscriptionType = "Exclusive";
  const subscriptionInitialPosition: Pulsar.InitialPosition = "Earliest";

  const base = {
    clientConfig: {
      serviceUrl,
      tlsValidateHostname,
      log,
    },
    consumerConfig: {
      topicsPattern,
      subscription,
      subscriptionType,
      subscriptionInitialPosition,
    },
  } as const;

  const result = oauth2Config ? { ...base, oauth2Config } : base;

  return result;
};

const getHealthCheckConfig = () => {
  const port = parseInt(getOptional("HEALTH_CHECK_PORT") ?? "8080", 10);
  return { port };
};

export const getConfig = (logger: pino.Logger): Config => ({
  mqtt: getMqttConfig(),
  pulsar: getPulsarConfig(logger),
  healthCheck: getHealthCheckConfig(),
});
