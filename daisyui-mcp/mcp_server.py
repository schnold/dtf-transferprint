from pathlib import Path
from fastmcp import FastMCP

COMPONENTS_DIR = Path(__file__).parent / "components"


def _load_component_index() -> dict[str, str]:
    """
    Scan the components/ directory and build an index of component names to descriptions.
    
    Returns:
        dict mapping component name (lowercase) to its description.
    """
    index: dict[str, str] = {}
    
    if not COMPONENTS_DIR.exists():
        return index
    
    for md_file in COMPONENTS_DIR.glob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8")
            lines = content.strip().split("\n")
            
            # Extract component name from ### header (e.g., "### button")
            name = ""
            description = ""
            
            for i, line in enumerate(lines):
                if line.startswith("### "):
                    name = line[4:].strip().lower()
                    # Description is the next non-empty line
                    if i + 1 < len(lines):
                        description = lines[i + 1].strip()
                    break
            
            if name:
                index[name] = description
        except Exception:
            # Skip files that can't be parsed
            continue
    
    return index


def _get_component_content(name: str) -> str | None:
    """
    Read the full Markdown content for a specific component.
    
    Args:
        name: The component name (case-insensitive).
        
    Returns:
        The full Markdown content, or None if not found.
    """

    normalized_name = name.lower().strip()
    file_path = COMPONENTS_DIR / f"{normalized_name}.md"
    
    if file_path.exists():
        try:
            return file_path.read_text(encoding="utf-8")
        except Exception:
            return None
    
    return None


COMPONENT_INDEX: dict[str, str] = _load_component_index()

mcp = FastMCP(name="DaisyUI MCP Server")


@mcp.tool
def list_components() -> str:
    """
    List all available DaisyUI components.
    
    Returns a formatted list of all DaisyUI components with their names and 
    brief descriptions. Use this to discover what components are available
    before calling get_component() for detailed documentation.
    
    Returns:
        A formatted string listing all available components with descriptions.
    """
    if not COMPONENT_INDEX:
        return "No components found. Ensure the components/ directory exists with Markdown files."
    
    sorted_components = sorted(COMPONENT_INDEX.items())
    
    lines = [
        f"Available DaisyUI Components ({len(sorted_components)} total):",
        "",
    ]
    
    for name, description in sorted_components:
        lines.append(f"  • {name} - {description}")
    
    lines.append("")
    lines.append("Use get_component(name) to get detailed documentation for any component.")
    
    return "\n".join(lines)


@mcp.tool
def get_component(name: str) -> str:
    """
    Get detailed documentation for a specific DaisyUI component.
    
    Returns the full documentation including CSS classes, HTML syntax examples,
    and usage rules for the specified component.
    
    Args:
        name: The name of the DaisyUI component (e.g., 'button', 'card', 'badge').
              Case-insensitive.
    
    Returns:
        The full component documentation in Markdown format, or an error message
        if the component is not found.
    """

    normalized_name = name.lower().strip()
    
    # Check if component exists
    if normalized_name not in COMPONENT_INDEX:
        # Find similar component names for suggestions
        suggestions = [
            comp_name for comp_name in COMPONENT_INDEX.keys()
            if normalized_name in comp_name or comp_name in normalized_name
        ]
        
        if not suggestions and len(normalized_name) >= 2:
            suggestions = [
                comp_name for comp_name in COMPONENT_INDEX.keys()
                if comp_name.startswith(normalized_name[:2])
            ]
        
        suggestion_text = ""
        if suggestions:
            suggestions = sorted(suggestions)[:5]  # Limit to 5 suggestions to minimize token usage
            suggestion_text = f"\n\nDid you mean one of these?\n  • " + "\n  • ".join(suggestions)
        
        return f"Component '{name}' not found.{suggestion_text}\n\nUse list_components() to see all available components."
    
    content = _get_component_content(normalized_name)
    
    if content is None:
        return f"Error: Unable to load documentation for '{name}'. Please try again."
    
    return content

if __name__ == "__main__":
    mcp.run()