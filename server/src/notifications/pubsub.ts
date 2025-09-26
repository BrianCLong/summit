import { makePubSub } from '../subscriptions/pubsub';

export const NOTIFICATION_TOPIC = 'NOTIFICATION_UPDATES';

export const notificationPubSub = makePubSub();

export const notificationChannel = (userId: string) => `${NOTIFICATION_TOPIC}:${userId}`;
