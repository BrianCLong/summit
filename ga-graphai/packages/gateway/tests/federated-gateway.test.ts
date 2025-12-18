import { describe, expect, it } from 'vitest';
import { FederatedGateway } from '../src/federation/gateway';
import type { FederationServiceDefinition } from '../src/federation/types';

type Product = { sku: string; name: string; price: number; inStock: boolean };

describe('FederatedGateway', () => {
  let gateway: FederatedGateway<{ discounts: Record<string, number> }>;
  const catalog: Record<string, Product> = {
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
  } satisfies Record<string, number>;

  const inventoryService: FederationServiceDefinition<{ discounts: typeof discounts }> = {
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
        product: (_root, args: { sku: string }) => {
          const item = catalog[args.sku];
          return item ? { ...item, __typename: 'Product' } : null;
        },
      },
      Product: {
        name: [
          (product: Product & { discount?: number }) => ({
            ...product,
            name: `${product.name} by Summit`,
          }),
          (product: Product & { name: string }) => product.name.toUpperCase(),
        ],
        discount: (product: Product, _args: unknown, context: { discounts: Record<string, number> }) =>
          context.discounts[product.sku] ?? 0,
      },
    },
    entityResolvers: {
      Product: (reference: { sku: string }) => {
        const record = catalog[reference.sku];
        if (!record) return null;
        return { __typename: 'Product', ...record };
      },
    },
  };

  const pricingService: FederationServiceDefinition<{ discounts: typeof discounts }> = {
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
        netPrice: (product: Product, _args: unknown, context: { discounts: Record<string, number> }) =>
          product.price - (context.discounts[product.sku] ?? 0),
      },
    },
  };

  const reviewService: FederationServiceDefinition<{ discounts: typeof discounts }> = {
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
        product: async (review: { sku: string }, _args: unknown, _context: unknown, info) =>
          gateway.resolveEntity({ __typename: 'Product', sku: review.sku }, { discounts }, info),
      },
    },
  };

  gateway = new FederatedGateway<{ discounts: Record<string, number> }>([
    inventoryService,
    pricingService,
    reviewService,
  ]);

  it('composes service SDL and exposes _service.sdl', async () => {
    const result = await gateway.execute<{ _service: { sdl: string } }>(
      `query ServiceSDL { _service { sdl } }`,
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?._service.sdl).toContain('type Product');
    expect(result.data?._service.sdl).toContain('union _Entity');
    expect(gateway.composition.services).toEqual(['inventory', 'pricing', 'reviews']);
  });

  it('supports entity resolution and distributed resolver chains', async () => {
    const result = await gateway.execute(
      `query EntityLookup($refs: [_Any!]!) {
        _entities(representations: $refs) {
          ... on Product {
            sku
            name
            price
            discount
          }
        }
      }`,
      {
        refs: [{ __typename: 'Product', sku: 'sku-1' }],
      },
      { discounts },
    );

    expect(result.errors).toBeUndefined();
    const product = (result.data as { _entities: Array<{ sku: string; name: string; price: number; discount: number }> })
      ._entities[0];
    expect(product.sku).toBe('sku-1');
    expect(product.name).toBe('NEBULA DRONE BY SUMMIT');
    expect(product.discount).toBe(200);
  });

  it('executes cross-service joins through federated resolvers', async () => {
    const result = await gateway.execute(
      `query Reviews {
        reviews {
          id
          rating
          product {
            sku
            netPrice
            currency
          }
        }
      }`,
      undefined,
      { discounts },
    );

    expect(result.errors).toBeUndefined();
    const reviews = (result.data as {
      reviews: Array<{ id: string; rating: number; product: { sku: string; netPrice: number; currency: string } }>;
    }).reviews;

    expect(reviews).toHaveLength(2);
    expect(reviews[0].product.netPrice).toBe(1699);
    expect(reviews[0].product.currency).toBe('USD');
  });
});
