/**
 * NamedEntityGenerator - Generate realistic named entities
 */

export class NamedEntityGenerator {
  private personNames = {
    first: ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa'],
    last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
  };

  private organizations = [
    'TechCorp', 'DataSystems Inc', 'Innovation Labs', 'Global Solutions',
    'Digital Ventures', 'NextGen Technologies', 'Cloud Services Ltd'
  ];

  private locations = {
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'],
    countries: ['United States', 'Canada', 'United Kingdom', 'Germany', 'Japan', 'Australia']
  };

  private products = [
    'Pro Suite', 'Enterprise Platform', 'Cloud Solution', 'Analytics Tool',
    'Data Manager', 'Business Intelligence System'
  ];

  /**
   * Generate person name
   */
  generatePerson(): string {
    const first = this.randomItem(this.personNames.first);
    const last = this.randomItem(this.personNames.last);
    return `${first} ${last}`;
  }

  /**
   * Generate organization name
   */
  generateOrganization(): string {
    return this.randomItem(this.organizations);
  }

  /**
   * Generate location
   */
  generateLocation(type: 'city' | 'country' = 'city'): string {
    return this.randomItem(this.locations[type === 'city' ? 'cities' : 'countries']);
  }

  /**
   * Generate date
   */
  generateDate(start?: Date, end?: Date): Date {
    const startTime = start ? start.getTime() : new Date(2020, 0, 1).getTime();
    const endTime = end ? end.getTime() : Date.now();
    const randomTime = startTime + Math.random() * (endTime - startTime);
    return new Date(randomTime);
  }

  /**
   * Generate money amount
   */
  generateMoney(min: number = 100, max: number = 1000000): string {
    const amount = Math.floor(Math.random() * (max - min) + min);
    return `$${amount.toLocaleString()}`;
  }

  /**
   * Generate product name
   */
  generateProduct(): string {
    return this.randomItem(this.products);
  }

  /**
   * Generate event name
   */
  generateEvent(): string {
    const events = [
      'Annual Conference', 'Product Launch', 'Summit', 'Workshop',
      'Symposium', 'Exhibition', 'Forum', 'Meeting'
    ];
    return this.randomItem(events);
  }

  private randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}

export default NamedEntityGenerator;
