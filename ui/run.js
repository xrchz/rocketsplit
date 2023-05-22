import 'dotenv/config'
import * as fs from 'node:fs'
import { ethers } from 'ethers'
import express from 'express'
import { fileURLToPath } from 'url'
import * as path from 'node:path'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

const app = express()
const dirname = path.dirname(fileURLToPath(import.meta.url))

app.get('/', (req, res) => {
  res.sendFile(`${dirname}/index.html`)
})
app.use(express.static(dirname))

const httpServer = createServer(app)
const io = new SocketIOServer(httpServer)

httpServer.listen(process.env.PORT || 8080)

const provider = new ethers.JsonRpcProvider(process.env.RPC)

const network = await provider.getNetwork()
console.log(`Connected to ${network.name} via ${provider._getConnection().url}`)

const factory = new ethers.Contract(process.env.ADDRESS,
  JSON.parse(fs.readFileSync(process.env.ABI || '../.build/RocketSplit.json', 'utf8')).abi,
  provider)
console.log(`Factory contract is ${await factory.getAddress()}`)

io.on('connection', async socket => {
})
