# Transcript 08-mcp-tools

- **Captured:** 2026-10-16T14:15:44.621Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 27.2s
- **Session / request ids:** redacted

## Query

```text
Does Pharos document an MCP server for developers? If yes give the exact endpoint URL, the transport type, the authentication requirements, and the complete list of tool names with their input parameters. If the documentation does not list the available tools, say so explicitly.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
Yes, Pharos documents an MCP server for developers.

## Endpoint and access

| Parameter | Value |
|---|---|
| **Endpoint URL** | `https://mcp.pharos.xyz/mcp` |
| **Transport** | Streamable HTTP |
| **Authentication** | None — public (no API key required) |
| **Rate limit** | 120 requests per minute per IP |
| **Chain ID** | `1672` |
| **Native token** | PROS |
| **Source code** | [github.com/PharosNetwork/pharos-mcp](https://github.com/PharosNetwork/pharos-mcp) |

**Source:** [Pharos MCP](https://docs.pharos.xyz/tooling-and-infrastructure/mcp)

---

## Documented tools

The documentation lists the following tools with their JSON-RPC method mappings:

### Chain and block data
- `get_chain_info` — `eth_chainId`, `eth_blockNumber`, `web3_clientVersion`
- `get_block_number` — `eth_blockNumber`
- `get_block` — `eth_getBlockByNumber`
- `get_gas_price` — `eth_gasPrice`, `eth_maxPriorityFeePerGas`

### Accounts and transactions
- `get_balance` — `eth_getBalance`
- `get_transaction_count` — `eth_getTransactionCount`
- `get_transaction` — `eth_getTransactionByHash`
- `get_transaction_receipt` — `eth_getTransactionReceipt`

### Contracts
- `eth_call` — `eth_call`
- `estimate_gas` — `eth_estimateGas`
- `get_code` — `eth_getCode`
- `get_storage_at` — `eth_getStorageAt`
- `get_logs` — `eth_getLogs`

### Broadcasting
- `send_raw_transaction` — `eth_sendRawTransaction`

---

## What the documentation does NOT provide

**The documentation does not list the complete input parameter schemas for each tool.** It provides:

- Tool names and their JSON-RPC method mappings
- High-level descriptions of what each tool does
- A general explanation of block parameters (accepts `latest`, `earliest`, `pending`, `safe`, `finalized`, decimal numbers, or hex quantities)
- Usage notes for specific tools (e.g., `get_logs` is capped at 1000 blocks per call; `send_raw_transaction` requires a pre-signed transaction)

But it does **not** provide:
- The exact field names each tool accepts as input
- Which fields are required vs. optional
- Data types for each parameter
- Example request payloads for each tool

To get the complete tool schemas with all input parameters, you would need to either:
1. Connect to the MCP server and call the `tools/list` method (standard MCP protocol)
2. Inspect the source code at [github.com/PharosNetwork/pharos-mcp](https://github.com/PharosNetwork/pharos-mcp)
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `2393`
