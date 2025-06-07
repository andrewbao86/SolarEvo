import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource.js';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add other resources
 */
defineBackend({
  data,
}); 