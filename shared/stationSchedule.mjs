const EASTERN_TIME_ZONE = 'America/New_York';
const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const easternDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function getStationOperatingStatus(stationTimes, now = new Date()) {
  if (!hasUsableSchedule(stationTimes)) {
    return unavailableStationOperatingStatus();
  }

  const currentDate = getEasternDateParts(now);
  const currentMinute = toSerialMinute(currentDate);
  const isOpen = [-1, 0].some((dayOffset) => {
    const serviceDate = offsetDate(currentDate, dayOffset);
    const schedule = getSchedule(stationTimes, serviceDate.weekday);
    const openingMinute = parseTime(schedule?.OpeningTime);
    const closingMinutes = validTimes(schedule?.LastTrains);

    if (openingMinute === null || closingMinutes.length === 0) {
      return false;
    }

    const closingMinute = Math.max(
      ...closingMinutes.map((minute) => minute < 12 * 60 ? minute + 24 * 60 : minute),
    );
    const serviceDayStart = toSerialMinute(serviceDate);
    return (
      currentMinute >= serviceDayStart + openingMinute
      && currentMinute <= serviceDayStart + closingMinute
    );
  });

  return {
    isClosed: !isOpen,
    nextTrain: isOpen ? null : findNextTrain(stationTimes, currentDate, currentMinute),
  };
}

export function unavailableStationOperatingStatus() {
  return {
    isClosed: null,
    nextTrain: null,
  };
}

function findNextTrain(stationTimes, currentDate, currentMinute) {
  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const serviceDate = offsetDate(currentDate, dayOffset);
    const serviceDayStart = toSerialMinute(serviceDate);
    const nextMinute = validTimes(getSchedule(stationTimes, serviceDate.weekday)?.FirstTrains)
      .sort((left, right) => left - right)
      .find((minute) => serviceDayStart + minute > currentMinute);

    if (nextMinute !== undefined) {
      return {
        localDate: [
          serviceDate.year.toString().padStart(4, '0'),
          serviceDate.month.toString().padStart(2, '0'),
          serviceDate.day.toString().padStart(2, '0'),
        ].join('-'),
        time: `${Math.floor(nextMinute / 60).toString().padStart(2, '0')}:${(nextMinute % 60).toString().padStart(2, '0')}`,
        displayTime: formatDisplayTime(nextMinute),
      };
    }
  }

  return null;
}

function getEasternDateParts(date) {
  const parts = Object.fromEntries(
    easternDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number.parseInt(part.value, 10)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    weekday: new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay(),
  };
}

function offsetDate(date, dayOffset) {
  const offset = new Date(Date.UTC(date.year, date.month - 1, date.day + dayOffset));
  return {
    year: offset.getUTCFullYear(),
    month: offset.getUTCMonth() + 1,
    day: offset.getUTCDate(),
    hour: 0,
    minute: 0,
    weekday: offset.getUTCDay(),
  };
}

function getSchedule(stationTimes, weekday) {
  return stationTimes[DAY_NAMES[weekday]];
}

function hasUsableSchedule(stationTimes) {
  return DAY_NAMES.some((day) => {
    const schedule = stationTimes[day];
    return (
      parseTime(schedule?.OpeningTime) !== null
      && validTimes(schedule?.FirstTrains).length > 0
      && validTimes(schedule?.LastTrains).length > 0
    );
  });
}

function validTimes(trains = []) {
  if (!Array.isArray(trains)) return [];

  return trains
    .map((train) => parseTime(train.Time))
    .filter((minute) => minute !== null);
}

function parseTime(value) {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?$/i);
  if (!match) return null;

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (minute > 59 || hour > (meridiem ? 12 : 23)) return null;
  if (meridiem === 'AM') hour %= 12;
  if (meridiem === 'PM') hour = (hour % 12) + 12;
  return hour * 60 + minute;
}

function toSerialMinute(date) {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 60000)
    + date.hour * 60
    + date.minute;
}

function formatDisplayTime(minutes) {
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${(minutes % 60).toString().padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}
