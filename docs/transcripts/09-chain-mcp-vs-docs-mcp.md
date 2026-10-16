# Transcript 09-chain-mcp-vs-docs-mcp

- **Captured:** 2026-10-16T14:16:40.663Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 55.9s
- **Session / request ids:** redacted

## Query

```text
What is the difference between the Pharos Chain MCP and the Pharos Docs MCP according to the documentation? Give the exact endpoints documented for each. If only one of them is documented, say which one is missing from the docs.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
According to the official Pharos documentation:

## What is documented

**The Pharos MCP (Chain MCP)** is documented at [Pharos MCP](https://docs.pharos.xyz/tooling-and-infrastructure/mcp) with:
- **Endpoint:** `https://mcp.pharos.xyz/mcp`
- **Transport:** Streamable HTTP
- **Authentication:** None — public
- **Purpose:** Brings Pharos chain data and on-chain operations into MCP-compatible AI clients (query blocks, balances, transactions, deploy contracts, etc.)

## What is NOT documented

**The Pharos Docs MCP is not documented in the official Pharos documentation.**

The GitBook MCP server at `https://docs.pharos.xyz/~gitbook/mcp` exists and is functional (I've been using it throughout this conversation to query the docs), but:
- It is not mentioned anywhere in the Pharos documentation
- It is not listed as a Pharos product or service
- It is a GitBook-provided service that powers the documentation site's AI features, not a Pharos-documented tool

The documentation only mentions one MCP server: the Pharos Chain MCP for on-chain operations. There is no documentation page, endpoint listing, or description of a "Pharos Docs MCP" as a separate service for developers to use.
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `1190`
