import baseLogger from '../config/logger';
import {
  createNotification,
  getPreferenceForEvent,
  NotificationRecord,
  unreadNotificationCount,
  upsertNotificationPreference,
} from '../db/repositories/notifications';
import { notificationChannel, notificationPubSub } from '../notifications/pubsub';
import { ensureDefaultPreferences, listNotificationPreferences } from '../db/repositories/notifications';

const logger = baseLogger.child({ name: 'notification-dispatcher' });

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_SENDER = process.env.SENDGRID_SENDER || 'alerts@example.com';
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

let sendGridClient: any = null;
if (SENDGRID_API_KEY) {
  import('@sendgrid/mail')
    .then((module) => {
      sendGridClient = module.default ?? module;
      if (sendGridClient?.setApiKey) {
        sendGridClient.setApiKey(SENDGRID_API_KEY);
      }
    })
    .catch((error) => {
      logger.warn({ err: error }, 'Failed to initialize SendGrid client');
    });
}

let twilioClient: any = null;
if (TWILIO_SID && TWILIO_TOKEN) {
  import('twilio')
    .then((module) => {
      const factory = module.default ?? module;
      twilioClient = factory(TWILIO_SID, TWILIO_TOKEN);
    })
    .catch((error) => {
      logger.warn({ err: error }, 'Failed to initialize Twilio client');
    });
}

type ChannelOverrides = Partial<{ inApp: boolean; email: boolean; sms: boolean }>;

type NotificationInput = {
  userId: string;
  eventType: string;
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, unknown>;
  actionId?: string | null;
  investigationId?: string | null;
  expiresAt?: string | null;
  channelOverrides?: ChannelOverrides;
};

function resolveChannels(
  preference: {
    channel_in_app: boolean;
    channel_email: boolean;
    channel_sms: boolean;
    email_address: string | null;
    phone_number: string | null;
  } | null,
  overrides?: ChannelOverrides,
) {
  const base = {
    inApp: preference?.channel_in_app ?? true,
    email: preference?.channel_email ?? false,
    sms: preference?.channel_sms ?? false,
  };

  return {
    inApp: overrides?.inApp ?? base.inApp,
    email: overrides?.email ?? base.email,
    sms: overrides?.sms ?? base.sms,
    emailAddress: preference?.email_address ?? null,
    phoneNumber: preference?.phone_number ?? null,
  };
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!SENDGRID_API_KEY) {
    logger.debug({ to, subject }, 'SendGrid not configured; skipping email send');
    return;
  }
  if (!sendGridClient) {
    logger.debug({ to, subject }, 'SendGrid client unavailable; skipping email send');
    return;
  }
  try {
    await sendGridClient.send({ to, from: SENDGRID_SENDER, subject, text });
  } catch (error) {
    logger.error({ err: error, to, subject }, 'failed to send email notification');
  }
}

async function sendSms(to: string, body: string) {
  if (!twilioClient || !TWILIO_FROM) {
    logger.debug({ to }, 'Twilio not configured; skipping SMS send');
    return;
  }
  try {
    await twilioClient.messages.create({
      to,
      from: TWILIO_FROM,
      body,
    });
  } catch (error) {
    logger.error({ err: error, to }, 'failed to send SMS notification');
  }
}

export async function dispatchNotification(input: NotificationInput): Promise<NotificationRecord | null> {
  const userId = input.userId;
  await ensureDefaultPreferences(userId);
  const preference = await getPreferenceForEvent(userId, input.eventType);
  const channels = resolveChannels(preference, input.channelOverrides);

  const record = await createNotification({
    userId,
    eventType: input.eventType,
    title: input.title,
    message: input.message,
    severity: input.severity ?? 'info',
    metadata: input.metadata,
    actionId: input.actionId,
    investigationId: input.investigationId,
    expiresAt: input.expiresAt,
  });

  if (!record) {
    return null;
  }

  if (channels.inApp) {
    await notificationPubSub.publish(notificationChannel(userId), {
      notificationUpdates: mapNotification(record),
    });
  }

  if (channels.email && channels.emailAddress) {
    await sendEmail(
      channels.emailAddress,
      input.title,
      `${input.message}\n\nDetails: ${JSON.stringify(input.metadata ?? {}, null, 2)}`,
    );
  }

  if (channels.sms && channels.phoneNumber) {
    await sendSms(channels.phoneNumber, `${input.title}: ${input.message}`);
  }

  return record;
}

export function mapNotification(record: NotificationRecord) {
  return {
    id: record.id,
    type: record.event_type,
    title: record.title,
    message: record.message,
    severity: (record.severity || 'info').toLowerCase(),
    timestamp: record.created_at,
    actionId: record.action_id,
    investigationId: record.investigation_id,
    metadata: record.metadata,
    expiresAt: record.expires_at,
    readAt: record.read_at,
    status: record.status,
  };
}

export async function listPreferencesForUser(userId: string) {
  await ensureDefaultPreferences(userId);
  const rows = await listNotificationPreferences(userId);
  return rows.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    channels: {
      inApp: row.channel_in_app,
      email: row.channel_email,
      sms: row.channel_sms,
    },
    email: row.email_address,
    phoneNumber: row.phone_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function updatePreference(
  userId: string,
  eventType: string,
  channels: { inApp: boolean; email: boolean; sms: boolean },
  contact?: { email?: string | null; phoneNumber?: string | null },
) {
  const record = await upsertNotificationPreference(userId, eventType, channels, contact);
  if (!record) {
    throw new Error('Failed to update notification preference');
  }
  return {
    id: record.id,
    eventType: record.event_type,
    channels: {
      inApp: record.channel_in_app,
      email: record.channel_email,
      sms: record.channel_sms,
    },
    email: record.email_address,
    phoneNumber: record.phone_number,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function getUnreadCount(userId: string) {
  return unreadNotificationCount(userId);
}
