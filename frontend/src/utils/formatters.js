export const formatSpotsRatio = (registered, total) => {
  const reg = Number(registered) || 0;
  const tot = Number(total) || 0;
  return `${reg} / ${tot}`;
};

export const calculatePercentage = (registered, total) => {
  const reg = Number(registered) || 0;
  const tot = Number(total) || 1;
  return Math.min(100, Math.max(0, Math.round((reg / tot) * 100)));
};
