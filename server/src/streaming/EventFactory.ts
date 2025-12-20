import { v4 as uuidv4 } from 'uuid';

export interface CloudEvent<T = any> {
  specversion: string;
  type: string;
  source: string;
  subject?: string;
  id: string;
  time: string;
  datacontenttype: string;
  data: T;
}

export class EventFactory {
  static createEvent<T>(
    type: string,
    source: string,
    data: T,
    subject?: string
  ): CloudEvent<T> {
    return {
      specversion: '1.0',
      type,
      source,
      subject,
      id: uuidv4(),
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data,
    };
  }
}
