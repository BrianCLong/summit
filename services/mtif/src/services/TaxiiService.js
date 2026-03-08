"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxiiService = void 0;
const FeedRepository_js_1 = require("./FeedRepository.js");
class TaxiiService {
    repository;
    options;
    constructor(repository, options = {}) {
        this.repository = repository;
        this.options = options;
    }
    discoveryDocument() {
        return {
            title: this.options.discoveryTitle ?? 'Model Threat Intelligence TAXII Service',
            description: this.options.discoveryDescription ?? 'TAXII 2.1 compliant API exposing LLM threat intelligence feeds.',
            contact: this.options.contact ?? 'security@intelgraph.example.com',
            default: `${this.apiRootPath()}/`,
            api_roots: [this.apiRootPath()]
        };
    }
    apiRootInformation() {
        return {
            title: 'MTIF API Root',
            description: 'Primary TAXII API root for MTIF collections.',
            versions: ['2.1'],
            max_content_length: this.options.maxContentLength ?? 10_485_760
        };
    }
    listCollections() {
        return this.repository.listCollections();
    }
    queryObjects(collectionId, options) {
        return this.repository.getObjects(collectionId, options);
    }
    get defaultCollectionId() {
        return FeedRepository_js_1.COLLECTION_DEFAULT_ID;
    }
    apiRootPath() {
        return this.options.apiRoot ?? '/taxii2/api-root';
    }
}
exports.TaxiiService = TaxiiService;
