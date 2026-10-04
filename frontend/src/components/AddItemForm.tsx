import { useState } from 'react'
import type { Item } from '../types'

type AddItemFormProps = {
  onAdd: (item: Item) => Promise<void>
  onCancel: () => void
}

function AddItemForm({
  onAdd,
  onCancel,
}: AddItemFormProps) {
  const [newItem, setNewItem] = useState<Item>({
    Name: '',
    Barcode: '',
    Location: '',
    Status: 'available',
    Quantity: 0,
  })

  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (
      !newItem.Name.trim() ||
      !newItem.Barcode.trim() ||
      !newItem.Location.trim() ||
      !newItem.Status.trim()
    ) {
      alert('Please fill in all fields')
      return
    }

    if (newItem.Quantity < 0) {
      alert('Quantity cannot be negative')
      return
    }

    try {
      setSaving(true)
      await onAdd(newItem)
    } catch {
      alert('Could not create item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="add-form">
      <h2>Add New Item</h2>

      <input
        placeholder="Product name"
        value={newItem.Name}
        onChange={e =>
          setNewItem({
            ...newItem,
            Name: e.target.value,
          })
        }
      />

      <input
        placeholder="Barcode"
        value={newItem.Barcode}
        onChange={e =>
          setNewItem({
            ...newItem,
            Barcode: e.target.value,
          })
        }
      />

      <input
        placeholder="Location"
        value={newItem.Location}
        onChange={e =>
          setNewItem({
            ...newItem,
            Location: e.target.value,
          })
        }
      />

      <select
        value={newItem.Status}
        onChange={e =>
          setNewItem({
            ...newItem,
            Status: e.target.value,
          })
        }
      >
        <option value="available">Available</option>
        <option value="processing">Processing</option>
        <option value="damaged">Damaged</option>
        <option value="shipped">Shipped</option>
      </select>

      <input
        type="number"
        min="0"
        value={newItem.Quantity}
        onChange={e =>
          setNewItem({
            ...newItem,
            Quantity: Number(e.target.value),
          })
        }
      />

      <div>
        <button
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Adding...' : 'Add Item'}
        </button>

        <button
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default AddItemForm