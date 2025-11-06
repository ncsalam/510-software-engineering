"""LLM-powered menu reconstruction utilities.

This module asks an OpenAI chat model to extract structured menu items (Dish, Price, Description)
from raw text snapshots and writes a clean CSV with exactly three columns (no header).
"""
import os
from openai import OpenAI
import csv
import io

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def recreate_menu(raw_text, output_file):
    """Extract a CSV of menu items from raw page text using an LLM.

    Under the hood:
    - Builds a carefully-scoped prompt instructing the model to return CSV only,
      with three columns in each row: Dish, Price, Description (no header).
    - Calls the OpenAI Chat Completions API and captures the first message content.
    - Normalizes line-endings and streams rows through `csv.reader`.
    - Drops obvious "section" and accidental "header" lines to keep the CSV clean.
    - Ensures each written row has exactly 3 cells.
    - Writes the result to `output_file` and prints a success message.

    Parameters
    ----------
    raw_text : str
        The cleaned text snapshot harvested from a restaurant webpage.
    output_file : str | os.PathLike
        Target path (typically under `Menu_CSVs/`).

    Returns
    -------
    None
        Writes a CSV file to disk.
    """
    prompt = f"""
You are a precise menu reconstruction system.

INPUT TEXT:
{raw_text}

TASK:
Extract and rebuild the restaurant's menu clearly and concisely.
- Ignore non-menu content (about us, contact info, etc.)
- Detect only item names, prices, and descriptions
- If there is no description for an item. Make one but make it no more than 10 words
- Only look for food items. Ignore drinks and their prices
- Give subtypes different items (Pad Thai Chicken 6.99 \n Pad Thai Tofu 5.99)
- Output in clean CSV format with columns:
  Dish, Price, and Description but do not include dish and price as headings. Only the items
Return only the CSV (no commentary).
"""

    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {"role": "system", "content": "You extract structured menus from messy restaurant text."},
            {"role": "user", "content": prompt}
        ]
    )

    csv_output = response.choices[0].message.content or ""
    # Normalize line endings so csv.reader behaves consistently
    csv_text = csv_output.replace("\r\n", "\n").replace("\r", "\n")

    reader = csv.reader(io.StringIO(csv_text))
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)

        for row in reader:
            # Skip empty / all-whitespace rows
            if not row or all(not (cell or "").strip() for cell in row):
                continue

            # Normalize cells once (trim quotes & whitespace)
            cells = [(c or "").strip().strip('"').strip("'").strip() for c in row]

            # Skip again if it turned blank after cleaning
            if not any(cells):
                continue

            # --- Key fix #1: drop any "Section: ..." rows, case-insensitive ---
            first = cells[0].lower()
            if first.startswith("section"):
                continue

            # --- Key fix #2 (recommended): skip header-ish rows ---
            # If the model accidentally emits a header row like "Dish, Price, Description"
            # or similar, don't write it.
            headerish = (
                any(w in cells[0].lower() for w in ("dish", "item")) or
                any("price" in (c or "").lower() for c in cells)
            )
            if headerish and len(cells) <= 3:
                # Treat short, clearly header-ish lines as headers to drop
                continue

            # Ensure exactly 3 columns (Dish, Price, Description)
            if len(cells) < 3:
                cells = (cells + [""] * 3)[:3]
            else:
                cells = cells[:3]

            writer.writerow(cells)

    print(f"✅ Menu successfully saved to {output_file}")