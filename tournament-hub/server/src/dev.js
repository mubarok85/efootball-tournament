import 'dotenv/config'
import app from './app.js'

const PORT = 3001
const HOST = '0.0.0.0'

app.listen(PORT, HOST, () => {
  console.log(`Tournament API running at http://localhost:${PORT}`)
})
