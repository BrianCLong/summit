import { regionalConfigService } from './RegionalConfigService.js';

export interface SupportInfo {
  hours: string;
  email: string;
  language: string;
  slaMs: number;
}

export class SupportRouter {
  private static instance: SupportRouter;

  private constructor() {}

  public static getInstance(): SupportRouter {
    if (!SupportRouter.instance) {
      SupportRouter.instance = new SupportRouter();
    }
    return SupportRouter.instance;
  }

  public getSupportInfo(countryCode: string): SupportInfo {
    const config = regionalConfigService.getConfig(countryCode);
    return {
      hours: config.support.hours,
      email: config.support.escalationEmail,
      language: config.support.language,
      slaMs: config.sla.maxResponseTimeMs
    };
  }

  /**
   * Determines if a request is within support hours.
   * Note: This is a simplified implementation parsing strings like "09:00-17:00 CET".
   */
  public isWithinSupportHours(countryCode: string, timestamp: Date = new Date()): boolean {
    const config = regionalConfigService.getConfig(countryCode);
    if (config.support.hours === '24/7') {
      return true;
    }

    // Parse "09:00-17:00 CET"
    // For MVP/Simulation, we'll just implement a simple check or return true if parsing fails
    // A real implementation would use a library like Luxon/moment-timezone
    const match = config.support.hours.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})\s+(\w+)/);
    if (!match) {return true;} // Fallback or 24/7

    const [, startH, startM, endH, endM, tz] = match;
    // Mocking timezone check: assuming server time matches required TZ for simplicity in this sprint
    const currentH = timestamp.getHours();
    const currentM = timestamp.getMinutes();

    const start = parseInt(startH) * 60 + parseInt(startM);
    const end = parseInt(endH) * 60 + parseInt(endM);
    const current = currentH * 60 + currentM;

    return current >= start && current <= end;
  }
}

export const supportRouter = SupportRouter.getInstance();
