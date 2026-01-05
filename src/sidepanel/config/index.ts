/**
 * Environment and configuration management
 */

interface AppConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  apiTimeout: number;
  maxLogLines: number;
  version: string;
}

const config: AppConfig = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  apiTimeout: 30000,
  maxLogLines: 50,
  version: '2.2.0',
};

export const getConfig = (): AppConfig => config;

/**
 * Get a specific config value
 */
export const getConfigValue = <K extends keyof AppConfig>(
  key: K
): AppConfig[K] => {
  return config[key];
};

/**
 * Update a config value at runtime
 */
export const updateConfig = <K extends keyof AppConfig>(
  key: K,
  value: AppConfig[K]
) => {
  config[key] = value;
};

export default config;
