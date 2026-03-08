"use strict";
/**
 * NamedEntityGenerator - Generate realistic named entities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamedEntityGenerator = void 0;
class NamedEntityGenerator {
    personNames = {
        first: ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa'],
        last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
    };
    organizations = [
        'TechCorp', 'DataSystems Inc', 'Innovation Labs', 'Global Solutions',
        'Digital Ventures', 'NextGen Technologies', 'Cloud Services Ltd'
    ];
    locations = {
        cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'],
        countries: ['United States', 'Canada', 'United Kingdom', 'Germany', 'Japan', 'Australia']
    };
    products = [
        'Pro Suite', 'Enterprise Platform', 'Cloud Solution', 'Analytics Tool',
        'Data Manager', 'Business Intelligence System'
    ];
    /**
     * Generate person name
     */
    generatePerson() {
        const first = this.randomItem(this.personNames.first);
        const last = this.randomItem(this.personNames.last);
        return `${first} ${last}`;
    }
    /**
     * Generate organization name
     */
    generateOrganization() {
        return this.randomItem(this.organizations);
    }
    /**
     * Generate location
     */
    generateLocation(type = 'city') {
        return this.randomItem(this.locations[type === 'city' ? 'cities' : 'countries']);
    }
    /**
     * Generate date
     */
    generateDate(start, end) {
        const startTime = start ? start.getTime() : new Date(2020, 0, 1).getTime();
        const endTime = end ? end.getTime() : Date.now();
        const randomTime = startTime + Math.random() * (endTime - startTime);
        return new Date(randomTime);
    }
    /**
     * Generate money amount
     */
    generateMoney(min = 100, max = 1000000) {
        const amount = Math.floor(Math.random() * (max - min) + min);
        return `$${amount.toLocaleString()}`;
    }
    /**
     * Generate product name
     */
    generateProduct() {
        return this.randomItem(this.products);
    }
    /**
     * Generate event name
     */
    generateEvent() {
        const events = [
            'Annual Conference', 'Product Launch', 'Summit', 'Workshop',
            'Symposium', 'Exhibition', 'Forum', 'Meeting'
        ];
        return this.randomItem(events);
    }
    randomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}
exports.NamedEntityGenerator = NamedEntityGenerator;
exports.default = NamedEntityGenerator;
