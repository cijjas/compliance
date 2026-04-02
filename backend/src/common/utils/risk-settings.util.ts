import { InternalServerErrorException } from '@nestjs/common';
import { RiskSetting, RiskSettingKey } from '../entities';

export function getRequiredRiskSetting(
  settings: RiskSetting[],
  key: RiskSettingKey,
): number {
  const match = settings.find((setting) => setting.key === key);

  if (!match) {
    throw new InternalServerErrorException(
      `Compliance risk setting "${key}" is missing.`,
    );
  }

  return match.numericValue;
}
