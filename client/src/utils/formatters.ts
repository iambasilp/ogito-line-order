export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatBoxPcs = (totalQty: number) => {
  const boxes = Math.floor(totalQty / 30);
  const pcs = totalQty % 30;
  if (boxes === 0) return `${pcs} Pkt`;
  if (pcs === 0) return `${boxes} Box`;
  return `${boxes} Box • ${pcs} Pkt`;
};
