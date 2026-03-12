#!/usr/bin/env node

import fs from 'fs/promises';

const SOURCE_PATH = '.repoos/economics/platform-economy-source.json';
const ECONOMICS_DIR = '.repoos/economics';
const EVIDENCE_DIR = '.repoos/evidence';

const DEFAULT_SOURCE = {
  currency: 'USD',
  developer_share_rate: 0.7,
  prior_period_marketplace_revenue: 96000,
  plugin_sales: [
    {
      plugin_id: 'obs-lens-pro',
      plugin_name: 'Observability Lens Pro',
      category: 'Observability',
      developer_id: 'dev-orion',
      transactions: 320,
      gross_revenue: 48000
    },
    {
      plugin_id: 'risk-atlas',
      plugin_name: 'Risk Atlas',
      category: 'Risk',
      developer_id: 'dev-atlas',
      transactions: 210,
      gross_revenue: 39000
    },
    {
      plugin_id: 'intel-brief-studio',
      plugin_name: 'Intel Brief Studio',
      category: 'Productivity',
      developer_id: 'dev-summit-labs',
      transactions: 180,
      gross_revenue: 22000
    },
    {
      plugin_id: 'trace-guard',
      plugin_name: 'Trace Guard',
      category: 'Security',
      developer_id: 'dev-orion',
      transactions: 96,
      gross_revenue: 15000
    }
  ],
  partner_integrations: [
    {
      partner_id: 'prt-acme-si',
      partner_name: 'Acme SI',
      adoption_count: 34,
      revenue_impact: 28000
    },
    {
      partner_id: 'prt-northstar',
      partner_name: 'Northstar DataOps',
      adoption_count: 26,
      revenue_impact: 21000
    },
    {
      partner_id: 'prt-orbit',
      partner_name: 'Orbit Federal',
      adoption_count: 12,
      revenue_impact: 9000
    }
  ]
};

function stableSort(items, key) {
  return [...items].sort((a, b) => {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;
    return 0;
  });
}

function formatCompactUSD(value) {
  const compact = value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`;
  return `$${compact}`;
}

function toFixedNumber(value, decimals = 4) {
  return Number(value.toFixed(decimals));
}

async function readSource() {
  try {
    const content = await fs.readFile(SOURCE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    await fs.mkdir(ECONOMICS_DIR, { recursive: true });
    await fs.writeFile(SOURCE_PATH, JSON.stringify(DEFAULT_SOURCE, null, 2));
    return DEFAULT_SOURCE;
  }
}

async function writeJson(filePath, payload) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  const source = await readSource();
  await fs.mkdir(ECONOMICS_DIR, { recursive: true });
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });

  const pluginSales = stableSort(source.plugin_sales, 'plugin_id');
  const partnerIntegrations = stableSort(source.partner_integrations, 'partner_id');
  const developerShareRate = source.developer_share_rate;

  const marketplaceRevenue = pluginSales.reduce((sum, sale) => sum + sale.gross_revenue, 0);
  const developerEarnings = toFixedNumber(
    pluginSales.reduce((sum, sale) => sum + sale.gross_revenue * developerShareRate, 0),
    2
  );
  const partnerRevenue = partnerIntegrations.reduce((sum, partner) => sum + partner.revenue_impact, 0);
  const transactionVolume = pluginSales.reduce((sum, sale) => sum + sale.transactions, 0);

  const pluginPurchases = pluginSales.map((sale) => ({
    plugin_id: sale.plugin_id,
    plugin_name: sale.plugin_name,
    category: sale.category,
    transactions: sale.transactions,
    gross_revenue: sale.gross_revenue
  }));

  const earningsByDeveloper = Object.entries(
    pluginSales.reduce((acc, sale) => {
      const developerEarning = sale.gross_revenue * developerShareRate;
      acc[sale.developer_id] = (acc[sale.developer_id] || 0) + developerEarning;
      return acc;
    }, {})
  )
    .map(([developer_id, earnings]) => ({ developer_id, earnings: toFixedNumber(earnings, 2) }))
    .sort((a, b) => b.earnings - a.earnings || a.developer_id.localeCompare(b.developer_id));

  const topPlugins = [...pluginSales]
    .sort((a, b) => b.gross_revenue - a.gross_revenue || a.plugin_id.localeCompare(b.plugin_id))
    .slice(0, 3)
    .map((sale) => ({
      plugin_id: sale.plugin_id,
      plugin_name: sale.plugin_name,
      category: sale.category,
      gross_revenue: sale.gross_revenue,
      developer_earnings: toFixedNumber(sale.gross_revenue * developerShareRate, 2)
    }));

  const categoryRevenue = Object.entries(
    pluginSales.reduce((acc, sale) => {
      acc[sale.category] = (acc[sale.category] || 0) + sale.gross_revenue;
      return acc;
    }, {})
  )
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue || a.category.localeCompare(b.category));

  const growthRate =
    source.prior_period_marketplace_revenue === 0
      ? 0
      : toFixedNumber(
          (marketplaceRevenue - source.prior_period_marketplace_revenue) /
            source.prior_period_marketplace_revenue,
          4
        );

  const economicSignals = {
    currency: source.currency,
    signals: {
      plugin_purchases: pluginPurchases,
      developer_earnings: earningsByDeveloper,
      marketplace_revenue: marketplaceRevenue,
      partner_integration_revenue: partnerRevenue
    }
  };

  const developerEconomy = {
    currency: source.currency,
    metrics: {
      total_developer_earnings: developerEarnings,
      average_plugin_revenue: toFixedNumber(marketplaceRevenue / pluginSales.length, 2),
      top_performing_plugins: topPlugins
    }
  };

  const marketplaceGrowth = {
    currency: source.currency,
    growth: {
      marketplace_transaction_volume: transactionVolume,
      revenue_growth_rate: growthRate,
      plugin_category_expansion: {
        category_count: categoryRevenue.length,
        categories_by_revenue: categoryRevenue
      }
    }
  };

  const ecosystemValue = {
    currency: source.currency,
    value_signals: {
      partner_ecosystem_revenue_impact: partnerRevenue,
      integration_adoption: partnerIntegrations.map((partner) => ({
        partner_id: partner.partner_id,
        partner_name: partner.partner_name,
        adoption_count: partner.adoption_count,
        revenue_impact: partner.revenue_impact
      })),
      plugin_economic_contribution: pluginSales.map((sale) => ({
        plugin_id: sale.plugin_id,
        plugin_name: sale.plugin_name,
        contribution_share: toFixedNumber(sale.gross_revenue / marketplaceRevenue, 4)
      }))
    }
  };

  const topCategory = categoryRevenue[0]?.category ?? 'N/A';
  const evidenceReport = {
    report_name: 'platform-economic-intelligence',
    deterministic: true,
    summary: {
      marketplace_revenue: marketplaceRevenue,
      developer_earnings: developerEarnings,
      partner_revenue_impact: partnerRevenue,
      top_plugin_category: topCategory,
      transaction_volume: transactionVolume,
      revenue_growth_rate: growthRate
    },
    artifacts: [
      '.repoos/economics/economic-signals.json',
      '.repoos/economics/developer-economy.json',
      '.repoos/economics/marketplace-growth.json',
      '.repoos/economics/ecosystem-value.json'
    ]
  };

  await writeJson('.repoos/economics/economic-signals.json', economicSignals);
  await writeJson('.repoos/economics/developer-economy.json', developerEconomy);
  await writeJson('.repoos/economics/marketplace-growth.json', marketplaceGrowth);
  await writeJson('.repoos/economics/ecosystem-value.json', ecosystemValue);
  await writeJson('.repoos/evidence/economic-intelligence-report.json', evidenceReport);

  console.log('Platform Economic Report');
  console.log('------------------------');
  console.log(`Marketplace Revenue: ${formatCompactUSD(marketplaceRevenue)}`);
  console.log(`Developer Earnings: ${formatCompactUSD(developerEarnings)}`);
  console.log(`Top Plugin Category: ${topCategory}`);
}

main().catch((error) => {
  console.error('Economic intelligence generation failed:', error);
  process.exit(1);
});
