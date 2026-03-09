# Connectors Documentation

The Summit platform uses Connectors to ingest data from various external sources such as APIs, CSVs, webhooks, and object storage like S3.

## Overview

Connectors act as adapters translating raw input formats into structured representations that can be pushed to the IntelGraph and Vector Databases.

*Note: Out-of-the-box functional connectors (like CSV parsers and generalized Webhooks) are currently under development. To ingest sample datasets located in `GOLDEN/datasets/`, manual mapping or temporary import scripts may be required.*

## Available Connectors

Currently, standard ingestion workflows are still evolving, and users might need to create their own handlers using standard node/python libraries until official ones are shipped.

## Future Plans

We plan to support a wide range of standard data sources in upcoming releases.
