-- Add indexes used by movement-history ordering and item-based lookups.
BEGIN;

CREATE INDEX IF NOT EXISTS inventory_movements_created_at_idx
    ON inventory_movements (created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_item_id_idx
    ON inventory_movements (item_id);

COMMIT;
