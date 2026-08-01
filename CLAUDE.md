# CLAUDE.md

# DataSieve

## Vision

DataSieve is an open-source, TypeScript-first backend data query engine.

Its mission is to become the standard abstraction layer between backend applications and data sources.

Applications should never implement filtering, sorting, pagination, searching, grouping, authorization-aware querying, or response formatting themselves.

Instead, applications describe the data they want.

DataSieve determines how to retrieve it.

The long-term objective is to provide one standardized query language capable of executing against many different storage technologies through modular adapters.

Prisma is only the first adapter.

It must never become the architecture.

---

# Core Philosophy

DataSieve is NOT:

- an ORM
- a database driver
- a SQL builder
- a Prisma wrapper
- a REST client

DataSieve IS:

A backend query engine.

Its responsibility is:

Input

↓

Validate

↓

Normalize

↓

Build an internal query representation

↓

Execute through an adapter

↓

Return a standardized response

Nothing more.

Nothing less.

---

# Golden Rules

## Rule #1

The Core must never know adapters exist.

Adapters depend on the Core.

The Core never depends on adapters.

Never import an adapter from the Core.

Ever.

---

## Rule #2

The Core owns the query language.

Adapters translate it.

Never expose:

Prisma types

SQL syntax

Mongo syntax

Elastic syntax

Driver-specific APIs

Applications interact only with DataSieve types.

---

## Rule #3

Features belong to DataSieve.

Not to databases.

Filtering belongs to DataSieve.

Sorting belongs to DataSieve.

Pagination belongs to DataSieve.

Searching belongs to DataSieve.

Grouping belongs to DataSieve.

Aggregation belongs to DataSieve.

Adapters merely implement those features.

---

## Rule #4

Everything should be replaceable.

Storage engine.

ORM.

Database.

Authentication.

Caching.

Authorization.

Serialization.

Validation.

Logging.

Metrics.

Nothing should be hardcoded.

---

# Architecture

DataSieve follows a layered architecture.

```

HTTP Request

↓

Core

↓

Validation

↓

Normalization

↓

Query AST

↓

Plugin Pipeline

↓

Adapter

↓

Database

↓

Raw Result

↓

Response Transformers

↓

Standard Response

```

Each layer has exactly one responsibility.

---

# Internal Query Language

DataSieve owns its own query language.

This language is represented internally as a Query AST.

The AST is the contract between the Core and adapters.

Adapters consume the AST.

Applications never manipulate adapter-specific queries.

---

# Query AST

The AST should be expressive enough to support every future adapter.

It should eventually represent concepts such as:

- filters
- sorting
- pagination
- cursor pagination
- searching
- grouping
- aggregations
- relations
- includes
- field selection
- distinct
- permissions
- computed fields

Design for expansion.

Avoid assumptions about SQL.

Avoid assumptions about Prisma.

---

# Standard Request

Every API endpoint using DataSieve should accept the same query format regardless of the underlying database.

Future adapters should require zero frontend changes.

The frontend should never know what database is being used.

---

# Standard Response

Every adapter returns the exact same response structure.

Example

```ts
interface DataSieveResponse<T> {

    data: T[]

    meta: {

        total: number

        page: number

        pageSize: number

        pageCount: number

        hasNext: boolean

        hasPrevious: boolean

        executionTime: number

    }

}
```

This response format belongs to the Core.

Never to adapters.

---

# Plugin Architecture

Everything beyond the Core should eventually become a plugin.

Possible plugins include:

Authorization

Caching

Soft Deletes

Tenancy

Metrics

Auditing

OpenAPI

Serialization

Validation

Tracing

Custom Operators

Custom Response Transformers

Plugins communicate through lifecycle hooks.

---

# Adapter Architecture

Adapters are independent packages.

Examples:

adapter-prisma

adapter-drizzle

adapter-kysely

adapter-typeorm

adapter-mongodb

adapter-elasticsearch

adapter-rest

adapter-memory

adapter-json

adapter-sql

Every adapter implements the same interface.

The adapter is responsible only for execution.

Business logic never belongs inside adapters.

---

# Feature Modules

Core functionality should also remain modular.

Possible feature packages:

feature-filtering

feature-pagination

feature-search

feature-sorting

feature-grouping

feature-aggregation

feature-relations

feature-cursor

Core orchestrates features.

Features implement behavior.

---

# Public API

The desired developer experience should feel similar to:

Prisma

Zod

TanStack Query

Vite

Simple.

Strongly typed.

Composable.

Minimal boilerplate.

Example:

```ts
const engine = createDataSieve({

adapter: prismaAdapter(),

plugins: [

cache(),

authorization(),

softDelete()

]

})

const result = await engine.query({

resource: prisma.user,

query: request.query

})
```

---

# Repository Structure

Use a monorepo from day one.

```

packages/

core/

types/

plugin-api/

response/

errors/

validation/

query-ast/

adapter-prisma/

feature-filtering/

feature-pagination/

feature-search/

feature-sorting/

feature-grouping/

examples/

benchmarks/

docs/

```

Do not optimize for today.

Optimize for the next ten adapters.

---

# TypeScript

Strict mode.

No "any".

No unnecessary type assertions.

Leverage generics aggressively.

Developer experience is a feature.

Autocomplete is a feature.

Inference is a feature.

---

# Validation

Runtime validation should be independent from the Core.

Zod may be the first implementation.

It should eventually become a plugin.

---

# Testing

Vitest.

Every feature has unit tests.

Every adapter has integration tests.

The Core should have almost no adapter-specific tests.

---

# Documentation

Every exported symbol must include TSDoc.

Generate documentation automatically.

README should focus on concepts first.

API second.

Implementation last.

---

# Performance

Performance matters.

Measure before optimizing.

Avoid unnecessary object allocations.

Avoid reflection.

Avoid runtime metadata.

Keep abstractions lightweight.

---

# Code Style

Prefer functions.

Avoid inheritance.

Prefer composition.

Small modules.

Pure functions whenever possible.

Single responsibility.

Readable code over clever code.

Design APIs that are difficult to misuse.

---

# Backwards Compatibility

Follow Semantic Versioning.

Breaking changes require explicit discussion.

Prefer extending APIs over replacing them.

---

# Development Strategy

Never build everything at once.

Deliver vertically.

Each phase must leave the project usable.

---

# Phase 1

Initialize the monorepo.

Configure:

- pnpm workspaces
- TypeScript
- tsup
- Vitest
- ESLint
- Prettier
- Changesets
- GitHub Actions
- Release workflow

Create the package structure.

No business logic yet.

---

# Phase 2

Implement:

Core

Types

Query AST

Plugin API

Response contracts

Error system

---

# Phase 3

Implement the Prisma adapter.

Only enough functionality to validate the architecture.

Do not overbuild.

---

# Phase 4

Implement:

Filtering

Sorting

Pagination

Searching

Response formatting

---

# Phase 5

Expand test coverage.

Improve documentation.

Benchmark performance.

Refactor where necessary.

---

# Long-Term Vision

DataSieve should eventually support:

Prisma

Drizzle

Kysely

TypeORM

MongoDB

PostgreSQL drivers

MySQL drivers

SQLite

REST APIs

GraphQL

Redis

Elasticsearch

In-memory collections

JSON files

CSV files

without requiring frontend changes.

The frontend should only speak the DataSieve query language.

Adapters are translators.

The Core is the engine.

---

# Your Role

You are the lead architect and engineer of DataSieve.

Protect the architecture.

Do not sacrifice long-term design for short-term convenience.

When facing a choice between a quick implementation and a scalable abstraction, choose the scalable abstraction if it does not introduce unnecessary complexity.

Think in years, not commits.

Build a foundation that future adapters, plugins, and contributors can extend confidently.