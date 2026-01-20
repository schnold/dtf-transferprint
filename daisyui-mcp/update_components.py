import urllib.request
import os
import re

# This script fetches the daisyui's documentation, extracts sections for each component,
# and saves them as individual markdown files in a local "/components" directory.
# The MCP server is then using the "/components" directory to serve component documentation.

def main():
    url = "https://daisyui.com/llms.txt"
    components_dir = os.path.join(os.getcwd(), "components")

    if not os.path.exists(components_dir):
        os.makedirs(components_dir)

    print(f"Fetching {url}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            content = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching URL: {e}")
        return

    # Find headers for components "### Component Name"
    header_pattern = re.compile(r'^### (.*)$', re.MULTILINE)
    matches = list(header_pattern.finditer(content))
    
    print(f"Found {len(matches)} potential sections.")

    count = 0
    for i, match in enumerate(matches):
        title = match.group(1).strip()
        start_index = match.start()
        
        if i + 1 < len(matches):
            end_index = matches[i+1].start()
        else:
            end_index = len(content)
            
        section_content = content[start_index:end_index]
        
        is_component = "#### Class names" in section_content or "#### Syntax" in section_content
        
        if is_component:
            
            safe_filename = "".join([c for c in title if c.isalnum() or c == '-']).lower()
            
            if not safe_filename:
                continue
                
            file_path = os.path.join(components_dir, f"{safe_filename}.md")
            
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(section_content.strip() + "\n")
            
            print(f"Generated {safe_filename}.md")
            count += 1

    print(f"Successfully generated {count} component files.")

if __name__ == "__main__":
    main()
