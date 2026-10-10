import { db } from '../index.js'
import dayjs from 'dayjs'
export const transactionRepo = {
  getAll: () => db.transactions.toArray(),
  getToday: () => db.transactions.where('date').aboveOrEqual(dayjs().startOf('day').toISOString()).toArray(),
  create: (data) => db.transactions.add(data),
}