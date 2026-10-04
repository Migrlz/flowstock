type SummaryCardsProps = {
  totalProducts: number
  totalUnits: number
  damagedItems: number
  lowStockItems: number
}

function SummaryCards({
  totalProducts,
  totalUnits,
  damagedItems,
  lowStockItems,
}: SummaryCardsProps) {
  return (
    <div className="summary-cards">
      <div className="summary-card">
        <span>Total Products</span>
        <strong>{totalProducts}</strong>
      </div>

      <div className="summary-card">
        <span>Total Units</span>
        <strong>{totalUnits}</strong>
      </div>

      <div className="summary-card">
        <span>Damaged</span>
        <strong>{damagedItems}</strong>
      </div>

      <div className="summary-card">
        <span>Low Stock</span>
        <strong>{lowStockItems}</strong>
      </div>
    </div>
  )
}

export default SummaryCards