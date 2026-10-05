import type { Item } from '../types'

type InventoryTableProps = {
  items: Item[]
  emptyMessage: string
  updateStatus: (barcode: string, status: string) => Promise<void>
  updateQuantity: (barcode: string, quantity: number) => Promise<void>
  deleteItem: (barcode: string) => Promise<void>
  setItems: React.Dispatch<React.SetStateAction<Item[]>>
}

function InventoryTable({
  items,
  emptyMessage,
  updateStatus,
  updateQuantity,
  deleteItem,
  setItems,
}: InventoryTableProps) {
  return (
    <>
      <div
        className="inventory-table-wrap"
        role="region"
        aria-label="Inventory table. Scroll horizontally to view all columns."
        tabIndex={0}
      >
        <table className="inventory-table">
          <caption className="visually-hidden">
            Inventory records with editable status and quantity.
          </caption>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Barcode</th>
              <th scope="col">Location</th>
              <th scope="col">Status</th>
              <th scope="col">Quantity</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map(item => (
              <tr key={item.Barcode}>
                <th className="inventory-product" scope="row">
                  {item.Name}
                </th>
                <td>{item.Barcode}</td>
                <td>{item.Location}</td>

                <td>
                  <select
                    className="table-control status-control"
                    aria-label={`Status for ${item.Name} (${item.Barcode})`}
                    value={item.Status}
                    onChange={e =>
                      updateStatus(item.Barcode, e.target.value)
                    }
                  >
                    <option value="available">available</option>
                    <option value="processing">processing</option>
                    <option value="damaged">damaged</option>
                    <option value="shipped">shipped</option>
                  </select>
                </td>

                <td className="quantity-cell">
                  <div className="quantity-inline">
                    <input
                      className="table-control quantity-control"
                      type="number"
                      min="0"
                      aria-label={`Quantity for ${item.Name} (${item.Barcode})`}
                      value={item.Quantity}
                      onChange={e => {
                        const quantity = Number(e.target.value)

                        setItems(currentItems =>
                          currentItems.map(currentItem =>
                            currentItem.Barcode === item.Barcode
                              ? { ...currentItem, Quantity: quantity }
                              : currentItem
                          )
                        )
                      }}
                      onBlur={e =>
                        updateQuantity(
                          item.Barcode,
                          Number(e.target.value)
                        )
                      }
                    />

                    {item.Quantity <= 3 && (
                      <span className="low-stock" role="note">
                        ⚠ Low stock
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  <button
                    className="delete-action"
                    type="button"
                    aria-label={`Delete ${item.Name} (${item.Barcode})`}
                    onClick={() => deleteItem(item.Barcode)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <p className="inventory-empty" role="status" aria-live="polite">
          {emptyMessage}
        </p>
      )}
    </>
  )
}

export default InventoryTable
