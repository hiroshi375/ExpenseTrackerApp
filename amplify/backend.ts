import { defineBackend } from '@aws-amplify/backend';

import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { receiptRecognition } from './functions/receiptRecognition/resource';

defineBackend({
  auth,
  data,
  storage,
  receiptRecognition,
});
