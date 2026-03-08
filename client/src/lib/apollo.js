"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@apollo/client");
const subscriptions_1 = require("@apollo/client/link/subscriptions");
const graphql_ws_1 = require("graphql-ws");
const utilities_1 = require("@apollo/client/utilities");
const urls_1 = require("../config/urls");
const httpLink = new client_1.HttpLink({
    uri: (0, urls_1.getGraphqlHttpUrl)(),
});
const wsUrl = (0, urls_1.getGraphqlWsUrl)();
const wsLink = wsUrl.startsWith('ws')
    ? new subscriptions_1.GraphQLWsLink((0, graphql_ws_1.createClient)({
        url: wsUrl,
    }))
    : null;
const splitLink = wsLink
    ? (0, client_1.split)(({ query }) => {
        const definition = (0, utilities_1.getMainDefinition)(query);
        return (definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription');
    }, wsLink, httpLink)
    : httpLink;
const client = new client_1.ApolloClient({
    link: splitLink,
    cache: new client_1.InMemoryCache(),
});
exports.default = client;
