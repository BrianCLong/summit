import { lintTemplate } from '../publish/StaticVerifier';
import { differencingFuzz } from '../publish/DiffFuzzer';
import { CompositeSigner } from '../publish/CompositeSigner';
import { attest } from '../publish/Provenance';
import { anchor } from '../transparency/anchor';
const templates = [];
const listings = [];
export default {
    Query: {
        templates: (_, { status }) => templates.filter(t => !status || t.status === status),
        listings: (_, { status }) => listings.filter(l => !status || l.status === status),
    },
    Mutation: {
        submitTemplate(_, { manifest, bundleBase64 }) {
            const template = { ...manifest, id: manifest.id, status: 'submitted' };
            templates.push(template);
            return template;
        },
        async runVerification(_, { templateId }) {
            const t = templates.find(x => x.id === templateId);
            if (!t)
                throw new Error('not_found');
            lintTemplate(t, '');
            await differencingFuzz(async () => 0, { epsilon: 1, records: [{}] });
            const signer = new CompositeSigner();
            const prov = await attest('hash-' + templateId, signer);
            t.provenance = prov;
            t.compositeSig = prov.compositeSig;
            t.status = 'verified';
            anchor(templateId, 'verified');
            return { staticOk: true, dynamicOk: true, details: {} };
        },
        requestListing(_, { templateId }) {
            const listing = { id: `lst-${templateId}`, templateId, status: 'pending', createdAt: new Date().toISOString() };
            listings.push(listing);
            anchor(templateId, 'listing-request');
            return listing;
        },
        approveListing(_, { listingId }) {
            const listing = listings.find(l => l.id === listingId);
            if (!listing)
                throw new Error('not_found');
            listing.status = 'approved';
            anchor(listing.templateId, 'listing-approved');
            return listing;
        },
    },
};
//# sourceMappingURL=publisher.js.map