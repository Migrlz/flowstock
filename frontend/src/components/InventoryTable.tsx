import type { Item } from '../types'

type InventoryTableProps = {
  items: Item[]
  updateStatus: (barcode: string, status: string) => Promise<void>
  updateQuantity: (barcode: string, quantity: number) => Promise<void>
  deleteItem: (barcode: string) => Promise<void>
  setItems: React.Dispatch<React.SetStateAction<Item[]>>
}

function InventoryTable({
  items,
  updateStatus,
  updateQuantity,
  deleteItem,
  setItems,
}: InventoryTableProps) {
  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Barcode</th>
            <th>Location</th>
            <th>Status</th>
            <th>Quantity</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.map(item => (
            <tr key={item.Barcode}>
              <td>{item.Name}</td>
              <td>{item.Barcode}</td>
              <td>{item.Location}</td>

              <td>
                <select
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

              <td>
                <input
                  type="number"
                  min="0"
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
                  <span className="low-stock">
                    ⚠ Low stock
                  </span>
                )}
              </td>

              <td>
                <button onClick={() => deleteItem(item.Barcode)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && (
        <p>No inventory items found.</p>
      )}
    </>
  )
}

export default InventoryTable