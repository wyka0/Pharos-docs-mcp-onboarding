# Transcript 07-docs-mcp-access

- **Captured:** 2026-10-16T14:15:17.374Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 96.5s
- **Session / request ids:** redacted

## Query

```text
What is the Pharos Developer Docs MCP? Describe it precisely using only official documentation: what it is, how a developer accesses it programmatically (exact endpoint URL, transport, authentication requirements), how it authenticates, and what its tools and parameters are. If the official docs do not document programmatic access, answer exactly: 'not documented'.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
## What is the Pharos MCP?

The Pharos MCP (Model Context Protocol) server is a public, hosted service that brings Pharos chain data and on-chain operations into any MCP-compatible AI client — Claude Desktop, Cursor, Windsurf, Codex, and custom agent runners. Instead of writing RPC plumbing, developers ask their AI assistant in plain language (e.g., "what's the latest Pharos block?" or "check the PROS balance of 0x…") and the server calls the appropriate chain method.

**Source:** [Pharos MCP](https://docs.pharos.xyz/tooling-and-infrastructure/mcp)

---

## Programmatic access

| Parameter | Value |
|---|---|
| **Hosted endpoint** | `https://mcp.pharos.xyz/mcp` |
| **Transport** | Streamable HTTP |
| **Authentication** | None — public (no API key required) |
| **Rate limit** | 120 requests per minute per IP |
| **Chain ID** | `1672` (`0x688`) |
| **Native token** | PROS |
| **Source code** | [github.com/PharosNetwork/pharos-mcp](https://github.com/PharosNetwork/pharos-mcp) |

### Client configuration (HTTP transport)

```json
{
  "mcpServers": {
    "pharos": {
      "type": "http",
      "url": "https://mcp.pharos.xyz/mcp"
    }
  }
}
```

### Client configuration (stdio bridge for clients that don't support remote MCP)

```json
{
  "mcpServers": {
    "pharos": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.pharos.xyz/mcp"]
    }
  }
}
```

### Health check

```bash
curl https://mcp.pharos.xyz/health
```

Response:
```json
{"status":"ok","chain":"Pharos","chainId":1672,"rpcUrl":"https://rpc.pharos.xyz"}
```

---

## Available tools and parameters

### Chain and block data

| Tool | JSON-RPC method | Description |
|---|---|---|
| `get_chain_info` | `eth_chainId`, `eth_blockNumber`, `web3_clientVersion` | Chain ID, client version and latest block |
| `get_block_number` | `eth_blockNumber` | Latest block height |
| `get_block` | `eth_getBlockByNumber` | Block by tag or number |
| `get_gas_price` | `eth_gasPrice`, `eth_maxPriorityFeePerGas` | Current gas price and priority fee |

### Accounts and transactions

| Tool | JSON-RPC method | Description |
|---|---|---|
| `get_balance` | `eth_getBalance` | Native PROS balance of an address |
| `get_transaction_count` | `eth_getTransactionCount` | Address nonce |
| `get_transaction` | `eth_getTransactionByHash` | Transaction by hash |
| `get_transaction_receipt` | `eth_getTransactionReceipt` | Transaction receipt |

### Contracts

| Tool | JSON-RPC method | Description |
|---|---|---|
| `eth_call` | `eth_call` | Read-only contract call |
| `estimate_gas` | `eth_estimateGas` | Estimate gas without sending |
| `get_code` | `eth_getCode` | Contract bytecode |
| `get_storage_at` | `eth_getStorageAt` | Read a contract storage slot |
| `get_logs` | `eth_getLogs` | Event logs (max 1000 blocks per call) |

### Broadcasting

| Tool | JSON-RPC method | Description |
|---|---|---|
| `send_raw_transaction` | `eth_sendRawTransaction` | Broadcast an already-signed transaction |

---

## Block parameters

Tools that accept a `block` parameter take any of:
- A named tag: `latest`, `earliest`, `pending`, `safe`, `finalized`
- A decimal number: `13005874`
- A hex quantity: `0xc67432`

Omitting it defaults to `latest`.

---

## Querying event logs

`get_logs` is capped at **1000 blocks per call**, matching the upstream RPC limit. Requests spanning a wider range are rejected with a message telling you the requested size and the maximum, so page through larger ranges in 1000-block windows.

Narrow results with `address` and `topics` wherever possible — an unfiltered query over a wide range is slow for everyone.

---

## Sending transactions

The server is **non-custodial**: it never receives, stores, or asks for a private key. Signing happens entirely in your own wallet or script; the server only relays the resulting signed bytes to the network.

**Flow:**
1. Build and sign a transaction locally with your own tooling (viem, ethers, a wallet).
2. Pass the resulting `0x`-prefixed string to `send_raw_transaction`.
3. Use the returned transaction hash with `get_transaction_receipt` to confirm inclusion.

---

## Self-hosting

Run your own instance when you need a private RPC provider, a higher rate limit, or your own operational control. Requires Node.js 20 or newer.

```bash
git clone https://github.com/PharosNetwork/pharos-mcp.git
cd pharos-mcp
npm install
npm run build
npm start
```

### Configuration variables

| Variable | Default | Description |
|---|---|---|
| `PHAROS_RPC_URL` | `https://rpc.pharos.xyz` | Upstream JSON-RPC endpoint |
| `PHAROS_CHAIN_ID` | `1672` | Expected chain ID |
| `PHAROS_NATIVE_SYMBOL` | `PROS` | Native token symbol |
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `MCP_HOST` | `127.0.0.1` | Bind address; use `0.0.0.0` in containers |
| `MCP_PORT` | `3001` | HTTP port |
| `MCP_AUTH_TOKEN` | — | Bearer token; authentication is off when unset |
| `ENABLE_SEND_RAW_TRANSACTION` | `false` | Enable transaction broadcasting |
| `RATE_LIMIT_PER_MINUTE` | `120` | Per-IP request cap; `0` disables |
| `TRUST_PROXY` | `false` | Set `true` behind exactly one trusted proxy so rate limiting sees the real client IP |
| `MAX_SESSIONS` | `500` | Maximum concurrent sessions; further sessions get `503` |
| `SESSION_TIMEOUT_MINUTES` | `30` | Idle session eviction time |

---

## Security notes

- The server has no use for a private key or mnemonic — never pass one to it.
- `send_raw_transaction` is disabled by default in self-hosted deployments. If you enable it on a publicly reachable instance, put authentication in front of it first; an open broadcast endpoint lets anyone push transactions through your node.
- Set `MCP_AUTH_TOKEN` and terminate TLS in front of any instance you expose beyond localhost.
- `admin_*`, `debug_*`, `personal_*` and `txpool_*` methods are not exposed.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Unknown MCP session` | The session expired or the server restarted. Reconnect the client — a full client restart clears cached session state. |
| `429 Too Many Requests` | Rate limit reached. Back off and retry after the interval in the `Retry-After` header, or self-host for a higher limit. |
| `Block range too large` | `get_logs` was called with more than 1000 blocks. Page through the range in smaller windows. |
| `Connection failed` | The client may not support remote MCP servers. If it connects but lists no tools, this is the same cause. Bridge with `mcp-remote` as shown above. |
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `6501`
