import { defineBackend } from '@aws-amplify/backend';
import { data } from './backend/data';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  data,
});
