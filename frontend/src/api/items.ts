import type { Item } from '../types'

const API_URL = 'http://localhost:8080/api/items'

export async function getItems(): Promise<Item[]> {
  const response = await fetch(API_URL)

  if (!response.ok) {
    throw new Error('Could not load inventory')
  }

  return response.json()
}

export async function createItem(item: Item): Promise<Item> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  })

  if (!response.ok) {
    throw new Error('Could not create item')
  }

  return response.json()
}

export async function patchItem(
  barcode: string,
  update: {
    Status?: string
    Quantity?: number
  }
) {
  const response = await fetch(`${API_URL}/${barcode}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(update),
  })

  if (!response.ok) {
    throw new Error('Could not update item')
  }
}

export async function removeItem(barcode: string) {
  const response = await fetch(`${API_URL}/${barcode}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Could not delete item')
  }
}