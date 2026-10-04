import type { Movement } from '../types'

const API_URL = 'http://localhost:8080/api/movements'

export async function getMovements(): Promise<Movement[]> {
  const response = await fetch(API_URL)

  if (!response.ok) {
    throw new Error('Could not load movement history')
  }

  const movements: Movement[] | null = await response.json()
  return movements ?? []
}
