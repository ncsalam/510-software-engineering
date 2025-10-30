import requests
from bs4 import BeautifulSoup

def extract_content(url, output_file, min_lines=120):
    try:
        response = requests.get(url)
        response.raise_for_status()  # raises error for bad status codes
        soup = BeautifulSoup(response.text, "html.parser")

        # Remove unwanted tags
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        # Extract visible text
        text = soup.get_text(separator="\n")
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        line_count = len(lines)

        # Only create the file if it meets the minimum line count
        if line_count > min_lines:
            with open(output_file, "w", encoding="utf-8") as file:
                file.write("\n".join(lines))
            print(f"✅ {output_file} saved ({line_count} lines).")
        else:
            print(f"⚠️ Skipped {output_file} — only {line_count} lines.")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
