export type WmataScheduledTrain = {
  Time?: string;
};

export type WmataDaySchedule = {
  OpeningTime?: string;
  FirstTrains?: WmataScheduledTrain[];
  LastTrains?: WmataScheduledTrain[];
};

export type WmataStationTimes = Partial<Record<
  'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday',
  WmataDaySchedule
>> & {
  Code?: string;
};

export type NextTrainSchedule = {
  localDate: string;
  time: string;
  displayTime: string;
};

export type StationOperatingStatus = {
  isClosed: boolean | null;
  nextTrain: NextTrainSchedule | null;
};

export function getStationOperatingStatus(
  stationTimes: WmataStationTimes,
  now?: Date,
): StationOperatingStatus;

export function unavailableStationOperatingStatus(): StationOperatingStatus;
