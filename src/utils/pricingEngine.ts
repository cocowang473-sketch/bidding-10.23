import { BoqItem, GlobalPricingParams } from '../types/pricing';

/**
 * 海外工程投标智能组价计算引擎
 * 完全对齐《组价模板（自用）.xlsx》中的公式逻辑
 *
 * 公式说明：
 * 1. 综合单价 = 人工费 + 材料费(主材+辅材) + 机械费 + 综合取费(10%)
 * 2. 人工费 = 人工含量 * 人工基数(6500 DZD/工日)
 * 3. 辅材费 = 辅材含量 * 35 * 1.1
 * 4. 机械费 = 机械含量 * 35
 * 5. 主材外采折算流程：
 *    原币(EUR/USD/CNY) → 到埠金额(含出口港杂2%+运输7%+代理6%) → 到现场(含关税+团结税2%+进口杂费5%+采购平台1%+运费2%)
 */
export function calculateItemCost(
  item: BoqItem,
  globalParams: GlobalPricingParams
): BoqItem {
  // 1. 人工费定额价计算
  // 公式: =ROUND($R$1*O4*1,2) 其中R1=6500(人工基数)
  const laborBase = item.customLaborBase ?? globalParams.laborBaseRate;
  const laborCostDzd = Math.round(item.laborDays * laborBase * 100) / 100;

  // 2. 辅材费计算
  // 公式: =ROUND(P4*35*1.1*1,2) 其中P4=辅材含量, 35=基础数值, 1.1=系数
  const auxCoeff = item.customAuxCoeff ?? globalParams.auxCoefficient;
  const auxCostDzd = Math.round(item.auxContent * globalParams.auxBaseValue * auxCoeff * 100) / 100;

  // 3. 机械费计算
  // 公式: =ROUND(Q4*35*1,2) 其中Q4=机械含量, 35=基础数值
  const machCoeff = item.customMachCoeff ?? globalParams.machineryCoefficient;
  const machCostDzd = Math.round(item.machContent * globalParams.machineryBaseValue * machCoeff * 100) / 100;

  // 安装费小计 (不包含主材)
  const installationCostDzd = laborCostDzd + auxCostDzd + machCostDzd;

  // 4. 主材费与汇率折算规则（对齐Excel复杂公式）
  // Excel公式说明：
  // - 到埠费率: 出口港杂2% + 运输7% (AE列=0.07) + 代理6% (AF列=0.06)
  // - 进口费率: 关税(AG列，CNY=0.30,其他=0) + 团结税2%(AH列=0.02) + 进口杂费5%(AI列=0.05) + 采购平台1%(AJ列=0.01)
  // - 到现场运费: 2% (AM1单元格)
  // 公式: =SUM(AA:AC)*(1+(AE+AF))*(1+(AG+AH+AI+AJ)) + 运费

  let materialCostDzd = 0;
  const origPrice = item.materialPriceOriginal;

  if (origPrice > 0) {
    let priceInDzd = 0;

    // 第一步：原币折算为DA
    if (item.materialCurrency === 'EUR') {
      priceInDzd = origPrice * globalParams.exchangeRates.EUR_TO_DZD; // 155
    } else if (item.materialCurrency === 'USD') {
      priceInDzd = origPrice * globalParams.exchangeRates.USD_TO_DZD; // 135
    } else if (item.materialCurrency === 'CNY') {
      priceInDzd = origPrice * globalParams.exchangeRates.CNY_TO_DZD; // 20
    } else {
      // DZD 本地采购：直接使用原价，无外贸费用
      materialCostDzd = origPrice;
      priceInDzd = origPrice;
    }

    // 外采材料需要计算国际贸易费用
    if (item.materialCurrency !== 'DZD') {
      // 第二步：到埠费用 = 原币折DA * (1 + 出口港杂2% + 运输7%) * (1 + 代理6%)
      // 对应Excel: =X4*$AA$3*(1+(AE4+AF4))
      const exportPortRate = 0.02; // 出口港杂
      const transportRate = 0.07; // 运输费
      const agentRate = 0.06; // 代理费
      const toDockPrice = priceInDzd * (1 + exportPortRate + transportRate) * (1 + agentRate);

      // 第三步：到现场费用 = 到埠金额 * (1 + 关税 + 团结税2% + 进口杂费5% + 采购平台1%)
      // 对应Excel: =SUM(AA:AC)*(1+(AE+AF))*(1+(AG+AH+AI+AJ))
      const tariffRate = (item.materialCurrency === 'CNY' && item.applyTariff) ? 0.30 : 0.0;
      const solidarityTaxRate = 0.02; // 团结税 (原Excel中AG列显示0.03，但说明是2%)
      const importMiscRate = 0.05; // 进口杂费
      const procurementPlatformRate = 0.01; // 采购平台费

      const toSitePrice = toDockPrice * (1 + tariffRate + solidarityTaxRate + importMiscRate + procurementPlatformRate);

      // 第四步：加上到项目现场运费 2%
      // 对应Excel: =SUM(AK:AL)*$AM$1 其中AM1=0.02
      const siteTransportRate = 0.02;
      materialCostDzd = toSitePrice * (1 + siteTransportRate);
    }
  }

  // 5. 人材机直接费小计
  const directCostDzd = installationCostDzd + materialCostDzd;

  // 6. 综合取费（管理费）
  // 只对人材机计费，按10%计算
  // 公式: =SUM(G:I)*10% 其中G=人工费,H=材料费(主材+辅材),I=机械费
  const managementCostDzd = directCostDzd * globalParams.managementRate;

  // 7. 综合单价与综合合价
  // 综合单价 = 人工费 + 材料费 + 机械费 + 综合取费
  // 公式: =SUM(G:J) 其中J=综合取费
  const unitPriceDzd = directCostDzd + managementCostDzd;

  // 综合合价 = 综合单价 * 工程量
  // 公式: =E4*F4 其中E4=数量,F4=综合单价
  const totalPriceDzd = unitPriceDzd * item.quantity;

  // 8. 外汇需求测算
  // 劳务外汇需求 = 人工费 * 60%
  // 材料外汇需求 = 材料费(如果是外采)
  const laborForexDemand = laborCostDzd * 0.60;
  const materialForexDemand = item.materialCurrency !== 'DZD' ? materialCostDzd : 0;

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
