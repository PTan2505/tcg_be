import 'dotenv/config'
import { Hono } from 'hono'
import { connectDB } from './db/db'
const app = new Hono()

await connectDB()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
