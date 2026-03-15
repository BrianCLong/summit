const fs = require('fs');
const content = fs.readFileSync('server/package.json', 'utf-8');

let cleaned = content;

// Fix block 1
cleaned = cleaned.replace(/<<<<<<< HEAD\n    @apollo\/server: "5\.4\.0",\n=======\n<<<<<<< HEAD\n    "@intelgraph\/outreach": "workspace:\*",\n    @apollo\/server: "5\.4\.0",\n=======\n<<<<<<< HEAD\n    "@apollo\/server": "5\.4\.0",\n=======\n    "@apollo\/server": "4\.11\.3",\n>>>>>>> origin\/main\n>>>>>>> origin\/main\n>>>>>>> origin\/main/, '"@intelgraph/outreach": "workspace:*",\n    "@apollo/server": "5.4.0",');

// Fix block 2
cleaned = cleaned.replace(/<<<<<<< HEAD\n\n    @node-saml\/node-saml: "5\.1\.0",\n=======\n<<<<<<< HEAD\n    @node-saml\/node-saml: "5\.1\.0",\n=======\n<<<<<<< HEAD\n    @node-saml\/node-saml: "5\.1\.0",\n=======\n<<<<<<< HEAD\n    @node-saml\/node-saml: "5\.1\.0",\n=======\n<<<<<<< HEAD\n    @node-saml\/node-saml: "5\.1\.0",\n=======\n<<<<<<< HEAD\n    @node-saml\/node-saml: "5\.1\.0",\n=======\n<<<<<<< HEAD\n    "@intelgraph\/context-shell": "workspace:\*",\n    "@node-saml\/node-saml": "5\.1\.0",\n=======\n    @node-saml\/node-saml: "5\.1\.0",\n>>>>>>> origin\/main\n>>>>>>> origin\/main\n>>>>>>> origin\/main\n>>>>>>> origin\/main\n>>>>>>> origin\/main\n>>>>>>> origin\/main\n>>>>>>> origin\/main/, '"@intelgraph/context-shell": "workspace:*",\n    "@node-saml/node-saml": "5.1.0",');

// Fix block 3
cleaned = cleaned.replace(/<<<<<<< HEAD\n    "csurf": "1\.11\.0",\n    "dataloader": "2\.2\.3",\n=======\n    csurf: "1\.11\.0",\n    dataloader: "2\.2\.3",\n    esbuild: "0\.24\.0",\n>>>>>>> origin\/main/, '"csurf": "1.11.0",\n    "dataloader": "2.2.3",\n    "esbuild": "0.24.0",');

// Fix block 4
cleaned = cleaned.replace(/<<<<<<< HEAD\n    "esbuild": "0\.24\.0",\n    "exif-reader": "2\.0\.3",\n    "fast-check": "4\.5\.3",\n    "globals": "16\.5\.0",\n    "graphql-depth-limit": "1\.1\.0",\n    "graphql-redis-subscriptions": "2\.7\.0",\n    "hpp": "0\.2\.3",\n=======\n    exif-reader: "2\.0\.3",\n    fast-check: "4\.5\.3",\n    globals: "16\.5\.0",\n    graphql-depth-limit: "1\.1\.0",\n    graphql-redis-subscriptions: "2\.7\.0",\n    hpp: "0\.2\.3",\n>>>>>>> origin\/main/, '"exif-reader": "2.0.3",\n    "fast-check": "4.5.3",\n    "globals": "16.5.0",\n    "graphql-depth-limit": "1.1.0",\n    "graphql-redis-subscriptions": "2.7.0",\n    "hpp": "0.2.3",');

fs.writeFileSync('server/package.json', cleaned);
