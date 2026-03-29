// Check for equipment reaching 90 days before 36-month end of life
const equipment = {{ equipmentData.value }} || [];
const today = moment();

const approaching = equipment.filter((item) => {
  if (!item.acquiredDate) {
    return false;
  }

  const acquiredDate = moment(item.acquiredDate, 'YYYY-MM-DD', true);
  if (!acquiredDate.isValid()) {
    return false;
  }

  const endOfLife = acquiredDate.clone().add(36, 'months');
  const daysUntilEOL = endOfLife.diff(today, 'days');

  // Return items that are 90 days or less from end of life
  return daysUntilEOL <= 90 && daysUntilEOL >= 0;
});

return {
  count: approaching.length,
  items: approaching.map((item) => ({
    ...item,
    endOfLifeDate: moment(item.acquiredDate, 'YYYY-MM-DD', true).add(36, 'months').format('YYYY-MM-DD'),
    daysUntilEOL: moment(item.acquiredDate, 'YYYY-MM-DD', true).add(36, 'months').diff(today, 'days') })) };
