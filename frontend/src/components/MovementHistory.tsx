import type { Movement } from '../types'

type MovementHistoryProps = {
  movements: Movement[]
  isLoading: boolean
  error: string | null
}

function MovementHistory({
  movements,
  isLoading,
  error,
}: MovementHistoryProps) {
  const newestFirst = [...movements].sort(
    (first, second) =>
      new Date(second.CreatedAt).getTime() -
      new Date(first.CreatedAt).getTime()
  )

  function formatDate(createdAt: string) {
    const date = new Date(createdAt)

    if (Number.isNaN(date.getTime())) {
      return createdAt
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  return (
    <section className="movement-section">
      <div className="movement-heading">
        <div>
          <h2>Movement History</h2>
          <p>Recent inventory quantity changes</p>
        </div>
        {!isLoading && !error && (
          <span className="movement-count">
            {newestFirst.length}{' '}
            {newestFirst.length === 1 ? 'movement' : 'movements'}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="movement-message" role="status">
          Loading movement history...
        </p>
      ) : error ? (
        <p className="movement-message movement-error" role="alert">
          {error}
        </p>
      ) : newestFirst.length === 0 ? (
        <div className="movement-empty">
          <strong>No movement history yet</strong>
          <p>
            Quantity changes will appear here after an inventory item is
            adjusted.
          </p>
        </div>
      ) : (
        <div className="movement-table-wrap">
          <table className="movement-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th>Old quantity</th>
                <th>New quantity</th>
                <th>Change</th>
                <th>Type</th>
                <th>Note</th>
                <th>Date / time</th>
              </tr>
            </thead>
            <tbody>
              {newestFirst.map(movement => {
                const changeClass =
                  movement.QuantityChange > 0
                    ? 'movement-change movement-change--positive'
                    : movement.QuantityChange < 0
                      ? 'movement-change movement-change--negative'
                      : 'movement-change movement-change--neutral'
                const signedChange =
                  movement.QuantityChange > 0
                    ? `+${movement.QuantityChange}`
                    : String(movement.QuantityChange)

                return (
                  <tr key={movement.ID}>
                    <td className="movement-product">{movement.Name}</td>
                    <td>{movement.Barcode}</td>
                    <td>{movement.OldQuantity}</td>
                    <td>{movement.NewQuantity}</td>
                    <td className={changeClass}>{signedChange}</td>
                    <td>{movement.MovementType}</td>
                    <td>{movement.Note || '—'}</td>
                    <td>{formatDate(movement.CreatedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default MovementHistory
