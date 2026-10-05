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
    <section className="movement-section" aria-labelledby="movement-heading">
      <div className="movement-heading">
        <div>
          <h2 id="movement-heading">Movement History</h2>
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
        <div
          className="movement-table-wrap"
          role="region"
          aria-label="Movement history table. Scroll horizontally to view all columns."
          tabIndex={0}
        >
          <table className="movement-table">
            <caption className="visually-hidden">
              Inventory movements, newest first.
            </caption>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Barcode</th>
                <th scope="col">Old quantity</th>
                <th scope="col">New quantity</th>
                <th scope="col">Change</th>
                <th scope="col">Type</th>
                <th scope="col">Note</th>
                <th scope="col">Date / time</th>
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
                    <th className="movement-product" scope="row">
                      {movement.Name}
                    </th>
                    <td>{movement.Barcode}</td>
                    <td>{movement.OldQuantity}</td>
                    <td>{movement.NewQuantity}</td>
                    <td className={changeClass}>{signedChange}</td>
                    <td>{movement.MovementType}</td>
                    <td>{movement.Note || '—'}</td>
                    <td>
                      <time dateTime={movement.CreatedAt}>
                        {formatDate(movement.CreatedAt)}
                      </time>
                    </td>
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
