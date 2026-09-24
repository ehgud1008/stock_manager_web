const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export default function formatDateTime(value, fallback = '미제공') {
  if (!value) return fallback;

  const normalized = String(value).trim();
  if (DATE_ONLY_PATTERN.test(normalized)) return `${normalized} 00:00:00`;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((result, part) => ({
    ...result,
    [part.type]: part.value,
  }), {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
