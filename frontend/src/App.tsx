import { useEffect, useState } from 'react'
import './App.css'

import SummaryCards from './components/SummaryCards'
import InventoryTable from './components/InventoryTable'
import AddItemForm from './components/AddItemForm'
import MovementHistory from './components/MovementHistory'

import type { Item, Movement } from './types'

import {
  getItems,
  createItem,
  patchItem,
  removeItem,
} from './api/items'
import { getMovements } from './api/movements'

function App() {
  const [items, setItems] = useState<Item[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [isLoadingMovements, setIsLoadingMovements] = useState(true)
  const [movementError, setMovementError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Load inventory when the page opens
  useEffect(() => {
    async function loadItems() {
      try {
        const data = await getItems()
        setItems(data)
      } catch {
        alert('Could not load inventory')
      }
    }

    loadItems()

    async function loadMovements() {
      try {
        const data = await getMovements()
        setMovements(data)
      } catch {
        setMovementError('Could not load movement history.')
      } finally {
        setIsLoadingMovements(false)
      }
    }

    loadMovements()
  }, [])

  // CREATE
  async function handleAddItem(item: Item) {
    const createdItem = await createItem(item)

    setItems(currentItems => [
      ...currentItems,
      createdItem,
    ])

    setShowForm(false)
  }

  // UPDATE STATUS
  async function updateStatus(
    barcode: string,
    status: string
  ) {
    try {
      await patchItem(barcode, {
        Status: status,
      })

      setItems(currentItems =>
        currentItems.map(item =>
          item.Barcode === barcode
            ? { ...item, Status: status }
            : item
        )
      )
    } catch {
      alert('Could not update status')
    }
  }

  // UPDATE QUANTITY
  async function updateQuantity(
    barcode: string,
    quantity: number
  ) {
    if (quantity < 0) {
      alert('Quantity cannot be negative')
      return
    }

    try {
      await patchItem(barcode, {
        Quantity: quantity,
      })

      try {
        const updatedMovements = await getMovements()
        setMovements(updatedMovements)
        setMovementError(null)
      } catch {
        setMovementError(
          'Quantity was saved, but movement history could not be refreshed.'
        )
      }
    } catch {
      try {
        const serverItems = await getItems()
        setItems(serverItems)
        alert(
          'Could not save the quantity. Inventory was refreshed from the server.'
        )
      } catch {
        alert(
          'Could not save the quantity or reload inventory. Please refresh the page to see the latest server values.'
        )
      }
    }
  }

  // DELETE
  async function deleteItem(barcode: string) {
    const confirmed = window.confirm(
      'Delete this item?'
    )

    if (!confirmed) {
      return
    }

    try {
      await removeItem(barcode)

      setItems(currentItems =>
        currentItems.filter(
          item => item.Barcode !== barcode
        )
      )
    } catch {
      alert('Could not delete item')
    }
  }

  // SEARCH + FILTER
  const filteredItems = items.filter(item => {
    const search = searchTerm.toLowerCase()

    const matchesSearch =
      item.Name.toLowerCase().includes(search) ||
      item.Barcode.toLowerCase().includes(search) ||
      item.Location.toLowerCase().includes(search) ||
      item.Status.toLowerCase().includes(search)

    const matchesStatus =
      statusFilter === 'all' ||
      item.Status === statusFilter

    return matchesSearch && matchesStatus
  })

  // DASHBOARD NUMBERS
  const totalProducts = items.length

  const totalUnits = items.reduce(
    (total, item) => total + item.Quantity,
    0
  )

  const damagedItems = items.filter(
    item => item.Status === 'damaged'
  ).length

  const lowStockItems = items.filter(
    item => item.Quantity <= 3
  ).length

  return (
    <main>
      <header>
        <div>
          <h1>FlowStock</h1>
          <p>Warehouse Inventory Management</p>
        </div>

        <button onClick={() => setShowForm(true)}>
          + Add Item
        </button>
      </header>

      <SummaryCards
        totalProducts={totalProducts}
        totalUnits={totalUnits}
        damagedItems={damagedItems}
        lowStockItems={lowStockItems}
      />

      {showForm && (
        <AddItemForm
          onAdd={handleAddItem}
          onCancel={() => setShowForm(false)}
        />
      )}

      <section>
        <h2>Inventory</h2>

        <input
          className="search-input"
          placeholder="Search by product, barcode, location or status..."
          value={searchTerm}
          onChange={e =>
            setSearchTerm(e.target.value)
          }
        />

        <select
          value={statusFilter}
          onChange={e =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="all">
            All statuses
          </option>
          <option value="available">
            Available
          </option>
          <option value="processing">
            Processing
          </option>
          <option value="damaged">
            Damaged
          </option>
          <option value="shipped">
            Shipped
          </option>
        </select>

        <InventoryTable
          items={filteredItems}
          updateStatus={updateStatus}
          updateQuantity={updateQuantity}
          deleteItem={deleteItem}
          setItems={setItems}
        />
      </section>

      <MovementHistory
        movements={movements}
        isLoading={isLoadingMovements}
        error={movementError}
      />
    </main>
  )
}

export default App
