-- Initial FlowStock schema. Apply once to a newly created, empty database.
BEGIN;

CREATE TABLE items (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    barcode TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0)
);

CREATE TABLE inventory_movements (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items (id) ON DELETE CASCADE,
    old_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    movement_type TEXT NOT NULL DEFAULT 'adjustment',
    note TEXT
);

COMMIT;
