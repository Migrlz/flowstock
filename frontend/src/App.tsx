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
  const [isLoadingItems, setIsLoadingItems] = useState(true)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [isLoadingMovements, setIsLoadingMovements] = useState(true)
  const [movementError, setMovementError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeSection, setActiveSection] = useState('dashboard')

  // Load inventory when the page opens
  useEffect(() => {
    async function loadItems() {
      try {
        const data = await getItems()
        setItems(data)
        setInventoryError(null)
      } catch {
        setInventoryError(
          'Inventory could not be loaded. Check your connection and refresh the page to try again.'
        )
      } finally {
        setIsLoadingItems(false)
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

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(
      '#dashboard, #inventory, #movement-history'
    )
    const observer = new IntersectionObserver(
      entries => {
        const visibleSection = entries
          .filter(entry => entry.isIntersecting)
          .sort(
            (first, second) =>
              first.boundingClientRect.top - second.boundingClientRect.top
          )[0]

        if (visibleSection) {
          setActiveSection(visibleSection.target.id)
        }
      },
      { rootMargin: '-56px 0px -112px 0px', threshold: 0 }
    )

    sections.forEach(section => observer.observe(section))

    return () => observer.disconnect()
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
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Application navigation">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark" aria-hidden="true">FS</span>
          <span className="sidebar-brand-copy">
            <strong>FlowStock</strong>
            <small>Warehouse system</small>
          </span>
        </div>

        <p className="sidebar-caption">WORKSPACE</p>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <a
            className={`sidebar-link ${activeSection === 'dashboard' ? 'is-active' : ''}`}
            href="#dashboard"
            aria-current={activeSection === 'dashboard' ? 'location' : undefined}
            onClick={() => setActiveSection('dashboard')}
          >
            <span className="sidebar-code" aria-hidden="true">DB</span>
            <span>Dashboard</span>
          </a>
          <a
            className={`sidebar-link ${activeSection === 'inventory' ? 'is-active' : ''}`}
            href="#inventory"
            aria-current={activeSection === 'inventory' ? 'location' : undefined}
            onClick={() => setActiveSection('inventory')}
          >
            <span className="sidebar-code" aria-hidden="true">IN</span>
            <span>Inventory</span>
          </a>
          <a
            className={`sidebar-link ${activeSection === 'movement-history' ? 'is-active' : ''}`}
            href="#movement-history"
            aria-current={activeSection === 'movement-history' ? 'location' : undefined}
            onClick={() => setActiveSection('movement-history')}
          >
            <span className="sidebar-code" aria-hidden="true">MV</span>
            <span>Movement History</span>
          </a>
          <div className="sidebar-link sidebar-link--planned" aria-disabled="true">
            <span className="sidebar-code" aria-hidden="true">RP</span>
            <span>Reports</span>
            <small className="planned-label">Planned</small>
          </div>
          <div className="sidebar-link sidebar-link--planned" aria-disabled="true">
            <span className="sidebar-code" aria-hidden="true">ST</span>
            <span>Settings</span>
            <small className="planned-label">Planned</small>
          </div>
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-status-mark" aria-hidden="true" />
          Local workspace
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header" id="dashboard">
          <div className="app-header-inner">
            <div className="brand-lockup">
              <div className="brand-mark" aria-hidden="true">
                FS
              </div>
              <div>
                <p className="brand-kicker">WAREHOUSE OPERATIONS</p>
                <h1>FlowStock</h1>
                <p className="brand-subtitle">Inventory Management System</p>
              </div>
            </div>

            <button
              className="primary-action"
              type="button"
              aria-expanded={showForm}
              aria-controls={showForm ? 'add-item-form' : undefined}
              onClick={() => setShowForm(true)}
            >
              + Add Item
            </button>
          </div>
        </header>

      <main className="page-content" id="main-content">
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

        <section
          className="inventory-section admin-panel"
          id="inventory"
          aria-labelledby="inventory-heading"
        >
          <div className="section-titlebar">
            <h2 id="inventory-heading">Inventory</h2>
            {!isLoadingItems && !inventoryError && (
              <span className="record-count" aria-live="polite">
                {filteredItems.length}{' '}
                {filteredItems.length === 1 ? 'record' : 'records'}
              </span>
            )}
          </div>

          <div className="inventory-toolbar">
            <label className="toolbar-search" htmlFor="inventory-search">
              Search inventory
              <input
                id="inventory-search"
                className="search-input"
                type="search"
                placeholder="Product, barcode, location or status"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </label>

            <label className="toolbar-filter" htmlFor="status-filter">
              Status
              <select
                id="status-filter"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="available">Available</option>
                <option value="processing">Processing</option>
                <option value="damaged">Damaged</option>
                <option value="shipped">Shipped</option>
              </select>
            </label>
          </div>

          {isLoadingItems ? (
            <p className="inventory-state" role="status">
              Loading inventory...
            </p>
          ) : inventoryError ? (
            <p className="inventory-state inventory-state--error" role="alert">
              {inventoryError}
            </p>
          ) : (
            <InventoryTable
              items={filteredItems}
              emptyMessage={
                items.length > 0
                  ? 'No items match the current search and status filter.'
                  : 'No inventory items yet. Select Add Item to create the first record.'
              }
              updateStatus={updateStatus}
              updateQuantity={updateQuantity}
              deleteItem={deleteItem}
              setItems={setItems}
            />
          )}
        </section>

        <MovementHistory
          movements={movements}
          isLoading={isLoadingMovements}
          error={movementError}
        />
      </main>
      </div>
    </div>
  )
}

export default App
