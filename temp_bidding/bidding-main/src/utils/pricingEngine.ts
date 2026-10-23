import { BoqItem, GlobalPricingParams } from '../types/pricing';

/**
 * 海外工程投标智能组价计算引擎
 */
export function calculateItemCost(
  item: BoqItem,
  globalParams: GlobalPricingParams
): BoqItem {
  // 1. 人工费定额价计算
  // 人工费定额价根据人工含量乘以固定基数 6500 得出 (支持按项目单独修改)
  const laborBase = item.customLaborBase ?? globalParams.laborBaseRate;
  const laborCostDzd = item.laborDays * laborBase;

  // 2. 辅材费与机械费系数调整
  // 基础数值 (如 35) 及测算系数 (如 1.1)，支持人工修改和增加系数
  const auxCoeff = item.customAuxCoeff ?? globalParams.auxCoefficient;
  const auxCostDzd = item.auxContent * globalParams.auxBaseValue * auxCoeff;

  const machCoeff = item.customMachCoeff ?? globalParams.machineryCoefficient;
  const machCostDzd = item.machContent * globalParams.machineryBaseValue * machCoeff;

  // 安装费小计
  const installationCostDzd = laborCostDzd + auxCostDzd + machCostDzd;

  // 3. 主材费与汇率折算规则
  // 欧元和美元免关税，人民币需加收 30% 关税
  // 国际运杂：运费 2%、出口港杂 7%
  const freightAndPortMultiplier = 1 + globalParams.freightRate + globalParams.portMiscRate;
  
  let materialCostDzd = 0;
  const origPrice = item.materialPriceOriginal;

  if (item.materialCurrency === 'EUR') {
    // 欧元：免关税
    materialCostDzd = origPrice * globalParams.exchangeRates.EUR_TO_DZD * freightAndPortMultiplier;
  } else if (item.materialCurrency === 'USD') {
    // 美元：免关税
    materialCostDzd = origPrice * globalParams.exchangeRates.USD_TO_DZD * freightAndPortMultiplier;
  } else if (item.materialCurrency === 'CNY') {
    // 人民币：加收 30% 关税
    const tariffMultiplier = 1 + globalParams.cnyTariffRate;
    materialCostDzd = origPrice * globalParams.exchangeRates.CNY_TO_DZD * tariffMultiplier * freightAndPortMultiplier;
  } else {
    // DZD 本地采购：无国际运杂和关税
    materialCostDzd = origPrice;
  }

  // 4. 人材机直接费小计
  const directCostDzd = installationCostDzd + materialCostDzd;

  // 5. 综合取费与管理费
  // 综合取费基于人材机总和乘以管理费费率 (如 10%) 得出
  const managementCostDzd = directCostDzd * globalParams.managementRate;

  // 6. 综合单价与综合合价
  const unitPriceDzd = directCostDzd + managementCostDzd;
  const totalPriceDzd = unitPriceDzd * item.quantity;

  return {
    ...item,
    laborCostDzd: Math.round(laborCostDzd * 100) / 100,
    auxCostDzd: Math.round(auxCostDzd * 100) / 100,
    machCostDzd: Math.round(machCostDzd * 100) / 100,
    installationCostDzd: Math.round(installationCostDzd * 100) / 100,
    materialCostDzd: Math.round(materialCostDzd * 100) / 100,
    directCostDzd: Math.round(directCostDzd * 100) / 100,
    managementCostDzd: Math.round(managementCostDzd * 100) / 100,
    unitPriceDzd: Math.round(unitPriceDzd * 100) / 100,
    totalPriceDzd: Math.round(totalPriceDzd * 100) / 100,
  };
}

export function calculateAllBoqItems(
  items: BoqItem[],
  params: GlobalPricingParams
): BoqItem[] {
  return items.map((item) => calculateItemCost(item, params));
}
