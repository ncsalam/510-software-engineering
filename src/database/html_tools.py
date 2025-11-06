"""Minimal HTML-to-text extraction utilities for menu rebuilding.

This module fetches a page, strips non-content tags, and writes a plain-text
snapshot to disk for later downstream parsing.
"""
import requests
from bs4 import BeautifulSoup


def extract_content(url, output_file, min_lines=120, max_lines=10000):
    """Fetch and save a cleaned, plain-text snapshot of a web page.

    Under the hood:
    - Downloads the URL and raises on HTTP errors.
    - Parses HTML with BeautifulSoup and removes `script`, `style`, and `noscript` tags.
    - Extracts visible text, normalizes whitespace, and splits on line breaks.
    - Writes the text to `output_file` **only** if `min_lines < line_count < max_lines` to avoid
      extremely short or extremely noisy pages.

    Parameters
    ----------
    url : str
        The target page to fetch.
    output_file : str | os.PathLike
        Path for the text snapshot to write.
    min_lines : int, optional
        Minimum number of non-empty lines required to write the file, by default 120.
    max_lines : int, optional
        Maximum number of lines allowed, by default 10000.

    Returns
    -------
    None
        Writes a file and prints a short status message.
    """
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
        if line_count > min_lines and line_count < max_lines:
            with open(output_file, "w", encoding="utf-8") as file:
                file.write("\n".join(lines))
            print(f"✅ {output_file} saved ({line_count} lines).")
        else:
            print(f"⚠️ Skipped {output_file} — only {line_count} lines.")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")