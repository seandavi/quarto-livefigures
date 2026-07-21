// Minimal MCP server core: JSON-RPC dispatch shared by the stdio and Worker
// transports (ADR 0015).
// ponytail: hand-rolled instead of @modelcontextprotocol/sdk so the stdio
// server ships inside the extension with zero runtime deps; swap in the SDK
// if the protocol surface grows (sessions, sampling, elicitation).
const PROTOCOL_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18'];

function rpcError(code, message) {
  const e = new Error(message);
  e.rpcCode = code;
  return e;
}

export function createMcp({ name, version, instructions, tools, resources }) {
  async function dispatch(method, params) {
    switch (method) {
      case 'initialize':
        return {
          protocolVersion: PROTOCOL_VERSIONS.includes(params?.protocolVersion)
            ? params.protocolVersion : PROTOCOL_VERSIONS.at(-1),
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name, version },
          instructions,
        };
      case 'ping':
        return {};
      case 'tools/list':
        return { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) };
      case 'tools/call': {
        const tool = tools.find((t) => t.name === params?.name);
        if (!tool) throw rpcError(-32602, `unknown tool: ${params?.name}`);
        try {
          return { content: await tool.run(params?.arguments ?? {}) };
        } catch (e) {
          // tool execution errors are results, not protocol errors (MCP spec)
          return { content: [{ type: 'text', text: String(e?.message ?? e) }], isError: true };
        }
      }
      case 'resources/list':
        return { resources: resources.map(({ uri, name, description, mimeType }) => ({ uri, name, description, mimeType })) };
      case 'resources/read': {
        const r = resources.find((x) => x.uri === params?.uri);
        if (!r) throw rpcError(-32002, `unknown resource: ${params?.uri}`);
        return { contents: [{ uri: r.uri, mimeType: r.mimeType, text: await r.text() }] };
      }
      default:
        throw rpcError(-32601, `method not found: ${method}`);
    }
  }

  // one JSON-RPC message in -> one response object out (null for notifications)
  return async function handle(msg) {
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
      return { jsonrpc: '2.0', id: msg?.id ?? null, error: { code: -32600, message: 'invalid request' } };
    }
    if (msg.id === undefined || msg.method.startsWith('notifications/')) return null;
    try {
      return { jsonrpc: '2.0', id: msg.id, result: await dispatch(msg.method, msg.params) };
    } catch (e) {
      return { jsonrpc: '2.0', id: msg.id, error: { code: e?.rpcCode ?? -32603, message: String(e?.message ?? e) } };
    }
  };
}
