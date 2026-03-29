// Filter equipment data and calculate depreciation/current value
const equipment = {{ equipmentData.value }} || [];
const siteFilter = {{ siteSearchInput.value }}?.toLowerCase() || '';
const vendorFilter = {{ vendorFilterSelect.value }} || '';
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Filter by site and vendor
let filtered = equipment.filter((item) => {
  const matchesSite = !siteFilter || item.site?.toLowerCase().includes(siteFilter);
  const matchesVendor = !vendorFilter || item.vendor === vendorFilter;
  return matchesSite && matchesVendor;
});

// Calculate current value using depreciation formula: cost - (cost/1095 * days since acquired)
const today = moment();
const enriched = filtered.map((item) => {
  const acquiredDate = item.acquiredDate ? moment(item.acquiredDate, 'YYYY-MM-DD', true) : null;
  const hasAcquiredDate = acquiredDate?.isValid();
  const cost = toNumber(item.cost);
  const replacementCost = toNumber(item.replacementCost);
  let currentValue = cost || replacementCost;
  let endOfLife = null;

  if (hasAcquiredDate && cost > 0) {
    const daysSinceAcquired = today.diff(acquiredDate, 'days');
    const depreciationPerDay = cost / 1095; // 3 years = 1095 days
    const depreciation = depreciationPerDay * Math.max(daysSinceAcquired, 0);
    currentValue = Math.max(0, cost - depreciation);
    endOfLife = acquiredDate.clone().add(36, 'months').format('YYYY-MM-DD');
  }

  return {
    ...item,
    cost,
    replacementCost,
    currentValue,
    endOfLife };

});

return enriched;
