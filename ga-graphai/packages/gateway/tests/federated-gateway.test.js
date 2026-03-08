"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const gateway_1 = require("../src/federation/gateway");
(0, vitest_1.describe)('FederatedGateway', () => {
    let gateway;
    const catalog = {
        'sku-1': {
            sku: 'sku-1',
            name: 'Nebula Drone',
            price: 1899,
            inStock: true,
        },
        'sku-2': {
            sku: 'sku-2',
            name: 'Lumen Tablet',
            price: 899,
            inStock: false,
        },
    };
    const discounts = {
        'sku-1': 200,
        'sku-2': 75,
    };
    const inventoryService = {
        name: 'inventory',
        typeDefs: `
      type Product @key(fields: "sku") {
        sku: ID!
        name: String!
        price: Int!
        inStock: Boolean!
        currency: String
        discount: Int
      }
      type Query {
        products: [Product!]!
        product(sku: ID!): Product
      }
    `,
        resolvers: {
            Query: {
                products: () => Object.values(catalog).map((product) => ({ ...product, __typename: 'Product' })),
                product: (_root, args) => {
                    const item = catalog[args.sku];
                    return item ? { ...item, __typename: 'Product' } : null;
                },
            },
            Product: {
                name: [
                    (product) => ({
                        ...product,
                        name: `${product.name} by Summit`,
                    }),
                    (product) => product.name.toUpperCase(),
                ],
                discount: (product, _args, context) => context.discounts[product.sku] ?? 0,
            },
        },
        entityResolvers: {
            Product: (reference) => {
                const record = catalog[reference.sku];
                if (!record)
                    return null;
                return { __typename: 'Product', ...record };
            },
        },
    };
    const pricingService = {
        name: 'pricing',
        typeDefs: `
      extend type Product @key(fields: "sku") {
        sku: ID!
        currency: String
        discount: Int
        netPrice: Int
      }
      extend type Query {
        priceBook: [Product!]!
      }
    `,
        resolvers: {
            Query: {
                priceBook: () => Object.values(catalog).map((product) => ({ ...product, __typename: 'Product' })),
            },
            Product: {
                currency: () => 'USD',
                netPrice: (product, _args, context) => product.price - (context.discounts[product.sku] ?? 0),
            },
        },
    };
    const reviewService = {
        name: 'reviews',
        typeDefs: `
      type Review {
        id: ID!
        sku: ID!
        rating: Int!
        product: Product!
      }
      extend type Query {
        reviews: [Review!]!
      }
    `,
        resolvers: {
            Query: {
                reviews: () => [
                    { id: 'r-1', sku: 'sku-1', rating: 5, __typename: 'Review' },
                    { id: 'r-2', sku: 'sku-2', rating: 4, __typename: 'Review' },
                ],
            },
            Review: {
                product: async (review, _args, _context, info) => gateway.resolveEntity({ __typename: 'Product', sku: review.sku }, { discounts }, info),
            },
        },
    };
    gateway = new gateway_1.FederatedGateway([
        inventoryService,
        pricingService,
        reviewService,
    ]);
    (0, vitest_1.it)('composes service SDL and exposes _service.sdl', async () => {
        const result = await gateway.execute(`query ServiceSDL { _service { sdl } }`);
        (0, vitest_1.expect)(result.errors).toBeUndefined();
        (0, vitest_1.expect)(result.data?._service.sdl).toContain('type Product');
        (0, vitest_1.expect)(result.data?._service.sdl).toContain('union _Entity');
        (0, vitest_1.expect)(gateway.composition.services).toEqual(['inventory', 'pricing', 'reviews']);
    });
    (0, vitest_1.it)('supports entity resolution and distributed resolver chains', async () => {
        const result = await gateway.execute(`query EntityLookup($refs: [_Any!]!) {
        _entities(representations: $refs) {
          ... on Product {
            sku
            name
            price
            discount
          }
        }
      }`, {
            refs: [{ __typename: 'Product', sku: 'sku-1' }],
        }, { discounts });
        (0, vitest_1.expect)(result.errors).toBeUndefined();
        const product = result.data
            ._entities[0];
        (0, vitest_1.expect)(product.sku).toBe('sku-1');
        (0, vitest_1.expect)(product.name).toBe('NEBULA DRONE BY SUMMIT');
        (0, vitest_1.expect)(product.discount).toBe(200);
    });
    (0, vitest_1.it)('executes cross-service joins through federated resolvers', async () => {
        const result = await gateway.execute(`query Reviews {
        reviews {
          id
          rating
          product {
            sku
            netPrice
            currency
          }
        }
      }`, undefined, { discounts });
        (0, vitest_1.expect)(result.errors).toBeUndefined();
        const reviews = result.data.reviews;
        (0, vitest_1.expect)(reviews).toHaveLength(2);
        (0, vitest_1.expect)(reviews[0].product.netPrice).toBe(1699);
        (0, vitest_1.expect)(reviews[0].product.currency).toBe('USD');
    });
});
