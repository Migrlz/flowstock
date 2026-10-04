# FlowStock database

The SQL migrations in `migrations/` define the PostgreSQL schema used by the
Go application. The current application does not run migrations automatically.

## Create a new local database

Create an empty database, then apply migrations in numerical order:

```sh
createdb flowstock
psql -d flowstock -f database/migrations/001_initial_schema.sql
psql -d flowstock -f database/migrations/002_add_movement_indexes.sql
```

## Existing manually-created database

The original manually-created database already has the schema represented by
`001_initial_schema.sql`. Apply only the index migration to it:

```sh
psql -d flowstock -f database/migrations/002_add_movement_indexes.sql
```

The index migration uses `CREATE INDEX IF NOT EXISTS`, so it can be applied
again safely if either index is already present. Do not run migration 001
against a database that already has the FlowStock tables.

## Future schema changes

Add a new, sequentially numbered SQL file for each schema change, for example
`003_add_item_category.sql`. Keep migrations in numerical order and do not edit
a migration that has already been applied elsewhere. Apply each new migration
once to the relevant database.
