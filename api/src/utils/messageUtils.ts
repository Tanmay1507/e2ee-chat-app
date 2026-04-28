export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const canModifyMessage = (timestamp: string | Date | number): boolean => {
  const messageTime = new Date(timestamp).getTime();
  const now = Date.now();
  return (now - messageTime) < TWENTY_FOUR_HOURS_MS;
};
