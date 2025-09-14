#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFile, readdir } from "fs/promises";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEXT_DIR = join(__dirname, "..", "text");

async function loadShakespeareTexts() {
  const files = await readdir(TEXT_DIR);
  const txtFiles = files.filter(file => file.endsWith(".txt"));

  const texts: Map<string, { title: string; path: string }> = new Map();

  for (const file of txtFiles) {
    const name = basename(file, "_TXT_FolgerShakespeare.txt");
    const title = name
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    texts.set(name, {
      title,
      path: join(TEXT_DIR, file)
    });
  }

  return texts;
}

async function main() {
  const server = new McpServer({
    name: "shakespeare-dataset",
    version: "1.0.0"
  });

  const texts = await loadShakespeareTexts();

  // Register each Shakespeare text as a resource
  for (const [name, info] of texts) {
    server.registerResource(
      name,
      `shakespeare://${name}`,
      {
        title: info.title,
        description: `Full text of Shakespeare's ${info.title}`,
        mimeType: "text/plain"
      },
      async (uri) => {
        const content = await readFile(info.path, "utf-8");
        return {
          contents: [{
            uri: uri.href,
            text: content,
            mimeType: "text/plain"
          }]
        };
      }
    );
  }

  // Register a resource that lists all available texts
  server.registerResource(
    "index",
    "shakespeare://index",
    {
      title: "Shakespeare Works Index",
      description: "List of all available Shakespeare works",
      mimeType: "application/json"
    },
    async (uri) => {
      const index = Array.from(texts.entries()).map(([name, info]) => ({
        name,
        title: info.title,
        uri: `shakespeare://${name}`
      }));

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(index, null, 2),
          mimeType: "application/json"
        }]
      };
    }
  );

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr to avoid interfering with stdio protocol
  console.error("Shakespeare MCP server running on stdio");
  console.error(`Loaded ${texts.size} Shakespeare works`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});