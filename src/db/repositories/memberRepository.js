import { db } from '../index.js'
export const memberRepo = {
  getAll: () => db.members.toArray(),
  getById: (id) => db.members.get(id),
}