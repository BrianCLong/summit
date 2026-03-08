"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenewalCalendar = void 0;
const date_fns_1 = require("date-fns");
class RenewalCalendar {
    events = [];
    addEvent(event) {
        this.events.push(event);
    }
    dueWithin(days, reference = new Date()) {
        const deadline = (0, date_fns_1.addDays)(reference, days);
        return this.events.filter((event) => (0, date_fns_1.isBefore)(event.noticeDate, deadline));
    }
    negotiationWindows(reference = new Date()) {
        return this.events.filter((event) => (0, date_fns_1.isAfter)(reference, event.negotiationWindowStart) && (0, date_fns_1.isBefore)(reference, event.renewalDate));
    }
}
exports.RenewalCalendar = RenewalCalendar;
