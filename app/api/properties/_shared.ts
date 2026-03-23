interface PropertyMetricsShape {
  total_shares: number;
  shares_available: number;
  fraction_listed?: number | null;
}

function normalizeFractionListed(value: number | null | undefined): number {
  if (!Number.isFinite(value) || value == null) {
    return 100;
  }

  return Math.min(100, Math.max(1, Math.trunc(value)));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getListedShares(property: PropertyMetricsShape): number {
  return Math.floor(
    (property.total_shares * normalizeFractionListed(property.fraction_listed)) / 100
  );
}

export function getSharesSold(property: PropertyMetricsShape): number {
  return Math.max(0, getListedShares(property) - property.shares_available);
}

export function getPercentFunded(property: PropertyMetricsShape): number {
  const listedShares = getListedShares(property);

  if (listedShares <= 0) {
    return 0;
  }

  return roundToTwo((getSharesSold(property) / listedShares) * 100);
}

export function withComputedPropertyFields<T extends PropertyMetricsShape>(property: T) {
  const fractionListed = normalizeFractionListed(property.fraction_listed);
  const listedShares = getListedShares(property);
  const sharesSold = getSharesSold(property);

  return {
    ...property,
    fraction_listed: fractionListed,
    verification_status: (property as { status?: unknown }).status,
    listed_shares: listedShares,
    shares_sold: sharesSold,
    percent_funded: getPercentFunded(property),
    owner_retained_percent: 100 - fractionListed,
  };
}