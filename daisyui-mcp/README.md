<div align="center">

# 🌼 DaisyUI MCP Server

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![MCP](https://img.shields.io/badge/MCP-Protocol-00D1B2?style=for-the-badge)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**A token‑friendly local MCP server for DaisyUI component documentation**

*Give your AI assistant the power to build beautiful UIs with DaisyUI* 🚀

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Configuration](#configuration) • [FAQ](#frequently-asked-questions)

</div>

## ✨ Features

- **Token‑Efficient** – Only exposes relevant context via MCP tools, saving precious tokens
- **60+ Components** – Full coverage of DaisyUI’s component library
- **Auto‑Updatable** – Fetch the latest docs anytime with one command
- **Customizable** – Edit or add your own component docs to fit your project
- **Fast & Lightweight** – Built with [FastMCP](https://github.com/jlowin/fastmcp) for optimal performance

## 🛠️ MCP Tools

This server exposes two tools that AI assistants can use:

- **`list_components`** – Lists all available DaisyUI components with short descriptions
- **`get_component`** – Gets full documentation for a specific component (classes, syntax, examples)

> 💡 The component docs are pulled from [daisyui.com/llms.txt](https://daisyui.com/llms.txt) and stored locally as markdown files. You can also add your own custom components or edit existing ones to match your project needs.

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/birdseyevue/daisyui-mcp.git
cd daisyui-mcp
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

## 🚀 Usage

### First‑time setup

On first run, the MCP server will not have any component docs. Fetch them by running:

```bash
python update_components.py
```

This fetches the latest `llms.txt` from DaisyUI and generates all the markdown files in `/components`.

### Running the server

```bash
python mcp_server.py
```

### Updating component docs

If DaisyUI releases new components or updates their docs, simply run:

```bash
python update_components.py
```

## ⚙️ Configuration

Add the MCP server to your AI assistant’s configuration.

<details>
<summary><b>Generic Configuration</b></summary>

```json
{
  "servers": {
    "daisyui": {
      "command": "<path-to-repo>/venv/Scripts/python.exe",
      "args": ["<path-to-repo>/mcp_server.py"]
    }
  }
}
```

</details>

<details>
<summary><b>Windows Example</b></summary>

```json
{
  "servers": {
    "daisyui": {
      "command": "C:/Users/username/Downloads/fastmcp/venv/Scripts/python.exe",
      "args": ["C:/Users/username/Downloads/fastmcp/mcp_server.py"]
    }
  }
}
```

</details>

<details>
<summary><b>macOS/Linux Example</b></summary>

```json
{
  "servers": {
    "daisyui": {
      "command": "/home/username/fastmcp/venv/bin/python",
      "args": ["/home/username/fastmcp/mcp_server.py"]
    }
  }
}
```

</details>

## 📁 Project Structure

```
fastmcp/
├── mcp_server.py          # The MCP server
├── update_components.py   # Script to fetch/update component docs
├── requirements.txt       # Dependencies (just fastmcp)
└── components/            # Markdown files for each component
    ├── button.md
    ├── card.md
    ├── modal.md
    ├── table.md
    └── ... (60+ components)
```

## ❓ 1 most Frequently Asked Question

### Why are `update_components.py` and `mcp_server.py` separate scripts?

It may seem more efficient to combine them into a single script that automatically fetches docs on startup. However, keeping them separate provides important flexibility:

- **Preserving custom components** – If you add or modify component markdown files in `/components`, running `update_components.py` would overwrite them with the fresh upstream content. By separating the update step, you can decide when to pull the latest DaisyUI docs without losing your customizations.

- **Control over updates** – You might want to run the server with a known‑good set of docs, and only update when you explicitly choose to. This separation lets you keep the server running while you fetch updates independently.

> **If you don’t need custom components and prefer a one‑step launch**, you can create a simple wrapper script (`.bat`, `.sh`, or `.ps1`) that runs both commands sequentially, or modify the server to call the update function on startup. The current design prioritizes flexibility for users who want to keep their own modifications.

## ❗ Disclaimer

DaisyUI has an official [Blueprint MCP](https://daisyui.com/blueprint/) ($600 lifetime) with premium features.

This project is **not** that. It’s a free, DIY alternative **using their publicly available documentation**.

- ✅ No competition
- ✅ Just a personal tool I wanted to share

> If you want an official experience with premium features, consider supporting DaisyUI by purchasing their [Blueprint MCP](https://daisyui.com/blueprint/)!

## 🤝 Contributing

Contributions are welcome! Feel free to:

- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Submit pull requests

## 📄 License

<div align="center">

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

*Free to use, modify, and distribute! Have fun!* 🎉

</div>

<div align="center">

Made with ❤️ for the DaisyUI community

⭐ Star this repo if you find it useful!

</div>
