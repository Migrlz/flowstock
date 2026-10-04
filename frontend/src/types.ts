export type Item = {
  Barcode: string
  Name: string
  Location: string
  Status: string
  Quantity: number
}

export type Movement = {
  ID: number
  Barcode: string
  Name: string
  OldQuantity: number
  NewQuantity: number
  QuantityChange: number
  MovementType: string
  Note: string
  CreatedAt: string
}
