import { ModelInit, MutableModel } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled } from "@aws-amplify/datastore";



type EagerSharedCalculation = {
  readonly id: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly creatorName: string;
  readonly creatorEmail: string;
  readonly creatorMobile: string;
  readonly devices: DeviceInput[];
  readonly calculations: CalculationResults;
  readonly isActive: boolean;
}

type LazySharedCalculation = {
  readonly id: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly creatorName: string;
  readonly creatorEmail: string;
  readonly creatorMobile: string;
  readonly devices: DeviceInput[];
  readonly calculations: CalculationResults;
  readonly isActive: boolean;
}

export declare type SharedCalculation = LazyLoading extends LazyLoadingDisabled ? EagerSharedCalculation : LazySharedCalculation

export declare const SharedCalculation: (new (init: ModelInit<SharedCalculation>) => SharedCalculation)

type EagerDeviceInput = {
  readonly name: string;
  readonly power: number;
  readonly quantity: number;
  readonly operatingHours: number;
  readonly batteryHours: number;
  readonly operatingRanges: TimeRange[];
  readonly batteryRanges: TimeRange[];
  readonly critical: boolean;
}

type LazyDeviceInput = {
  readonly name: string;
  readonly power: number;
  readonly quantity: number;
  readonly operatingHours: number;
  readonly batteryHours: number;
  readonly operatingRanges: TimeRange[];
  readonly batteryRanges: TimeRange[];
  readonly critical: boolean;
}

export declare type DeviceInput = LazyLoading extends LazyLoadingDisabled ? EagerDeviceInput : LazyDeviceInput

export declare const DeviceInput: (new (init: ModelInit<DeviceInput>) => DeviceInput)

type EagerTimeRange = {
  readonly start: number;
  readonly end: number;
}

type LazyTimeRange = {
  readonly start: number;
  readonly end: number;
}

export declare type TimeRange = LazyLoading extends LazyLoadingDisabled ? EagerTimeRange : LazyTimeRange

export declare const TimeRange: (new (init: ModelInit<TimeRange>) => TimeRange)

type EagerCalculationResults = {
  readonly totalEnergy: string;
  readonly batteryCapacity: string;
  readonly recommendedSize: string;
  readonly solarevoRecommendation: string;
}

type LazyCalculationResults = {
  readonly totalEnergy: string;
  readonly batteryCapacity: string;
  readonly recommendedSize: string;
  readonly solarevoRecommendation: string;
}

export declare type CalculationResults = LazyLoading extends LazyLoadingDisabled ? EagerCalculationResults : LazyCalculationResults

export declare const CalculationResults: (new (init: ModelInit<CalculationResults>) => CalculationResults)

