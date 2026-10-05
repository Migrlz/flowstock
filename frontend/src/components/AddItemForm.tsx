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
  const [saveError, setSaveError] = useState<string | null>(null)

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
      setSaveError(null)
      await onAdd(newItem)
    } catch {
      setSaveError(
        'Item could not be saved. Check the required fields and make sure the barcode is unique.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="add-form admin-panel"
      id="add-item-form"
      role="region"
      aria-labelledby="add-form-title"
    >
      <div className="section-titlebar add-form-titlebar">
        <div>
          <h2 id="add-form-title">Add New Item</h2>
          <p>Enter the item details for the inventory register.</p>
        </div>
      </div>

      <div className="form-fields">
        <label className="form-field">
          Product name
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
        </label>

        <label className="form-field">
          Barcode
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
        </label>

        <label className="form-field">
          Location
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
        </label>

        <label className="form-field">
          Status
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
        </label>

        <label className="form-field">
          Quantity
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
        </label>
      </div>

      {saveError && (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      )}

      <div className="form-actions">
        <button
          className="form-submit"
          type="button"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Adding...' : 'Add Item'}
        </button>

        <button
          className="form-cancel"
          type="button"
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
