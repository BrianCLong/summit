import { v4 as uuid } from 'uuid';
import type { CitizenProfile } from './types.js';

/**
 * Aggregates citizen data from all form submissions into a unified profile.
 * Enables "submit once, reuse everywhere" pattern.
 */
export class CitizenProfileAggregator {
  private profiles: Map<string, CitizenProfile> = new Map();

  /**
   * Creates or updates citizen profile from form submission
   */
  async aggregateFromSubmission(
    citizenId: string,
    formId: string,
    submissionData: Record<string, unknown>,
  ): Promise<CitizenProfile> {
    const existing = this.profiles.get(citizenId);
    const now = new Date().toISOString();

    const profile: CitizenProfile = existing || {
      id: citizenId,
      identifiers: {},
      personal: {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
      },
      contact: {
        email: '',
        phone: '',
      },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US',
      },
      documents: [],
      submissions: [],
      lastUpdated: now,
    };

    // Map common fields to profile
    this.mapFieldsToProfile(profile, submissionData);

    // Track submission
    profile.submissions.push({
      formId,
      submittedAt: now,
      status: 'completed',
    });

    profile.lastUpdated = now;
    this.profiles.set(citizenId, profile);

    return profile;
  }

  /**
   * Gets citizen profile by ID
   */
  async getProfile(citizenId: string): Promise<CitizenProfile | null> {
    return this.profiles.get(citizenId) || null;
  }

  /**
   * Finds citizen by identifier (SSN, email, etc.)
   */
  async findByIdentifier(type: string, value: string): Promise<CitizenProfile | null> {
    for (const profile of this.profiles.values()) {
      if (type === 'email' && profile.contact.email === value) return profile;
      if (type === 'ssn' && profile.identifiers.ssn === value) return profile;
      if (type === 'phone' && profile.contact.phone === value) return profile;
    }
    return null;
  }

  /**
   * Creates new citizen profile
   */
  async createProfile(data: Partial<CitizenProfile>): Promise<CitizenProfile> {
    const profile: CitizenProfile = {
      id: data.id || uuid(),
      identifiers: data.identifiers || {},
      personal: data.personal || { firstName: '', lastName: '', dateOfBirth: '' },
      contact: data.contact || { email: '', phone: '' },
      address: data.address || { street: '', city: '', state: '', zipCode: '', country: 'US' },
      employment: data.employment,
      household: data.household,
      documents: data.documents || [],
      submissions: data.submissions || [],
      lastUpdated: new Date().toISOString(),
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  private mapFieldsToProfile(profile: CitizenProfile, data: Record<string, unknown>): void {
    // Personal info mapping
    if (data.firstName) profile.personal.firstName = String(data.firstName);
    if (data.lastName) profile.personal.lastName = String(data.lastName);
    if (data.middleName) profile.personal.middleName = String(data.middleName);
    if (data.dateOfBirth) profile.personal.dateOfBirth = String(data.dateOfBirth);
    if (data.dob) profile.personal.dateOfBirth = String(data.dob);
    if (data.gender) profile.personal.gender = String(data.gender);

    // Contact mapping
    if (data.email) profile.contact.email = String(data.email);
    if (data.phone) profile.contact.phone = String(data.phone);
    if (data.phoneNumber) profile.contact.phone = String(data.phoneNumber);

    // Address mapping
    if (data.street) profile.address.street = String(data.street);
    if (data.address) profile.address.street = String(data.address);
    if (data.city) profile.address.city = String(data.city);
    if (data.state) profile.address.state = String(data.state);
    if (data.zipCode) profile.address.zipCode = String(data.zipCode);
    if (data.zip) profile.address.zipCode = String(data.zip);

    // Identifiers
    if (data.ssn) profile.identifiers.ssn = String(data.ssn);
    if (data.driverLicense) profile.identifiers.driverLicense = String(data.driverLicense);

    // Employment
    if (data.employer || data.income) {
      profile.employment = {
        employer: String(data.employer || ''),
        occupation: String(data.occupation || ''),
        income: Number(data.income || 0),
        employmentStatus: (data.employmentStatus as CitizenProfile['employment'] & { employmentStatus: string })?.employmentStatus || 'employed',
      };
    }
  }
}
