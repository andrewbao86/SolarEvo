// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { SharedCalculation, DeviceInput, TimeRange, CalculationResults } = initSchema(schema);

export {
  SharedCalculation,
  DeviceInput,
  TimeRange,
  CalculationResults
};