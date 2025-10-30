import os
from openai import OpenAI
import csv
import io

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_menu(raw_text, output_file):
    prompt = f"""
You are a precise menu reconstruction system.

INPUT TEXT:
{raw_text}

TASK:
Extract and rebuild the restaurant's menu clearly and concisely.
- Ignore non-menu content (about us, contact info, etc.)
- Detect only item names and prices.
- Give subtypes different items (Pad Thai Chicken 6.99 \n Pad Thai Tofu 5.99)
- Output in clean CSV format with columns:
  Dish and Price
Return only the CSV (no commentary).
"""

    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {"role": "system", "content": "You extract structured menus from messy restaurant text."},
            {"role": "user", "content": prompt}
        ]
    )

    csv_output = response.choices[0].message.content

    reader = csv.reader(io.StringIO(csv_output))
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        seen_header = False
        for row in reader:
            # Skip empty lines
            if not row or all(not cell.strip() for cell in row):
                continue

            # Strip excess quotes and whitespace
            clean_row = [col.strip().strip('"').strip("'") for col in row]

            # Avoid duplicate headers if GPT repeats it
            if not seen_header:
                writer.writerow(clean_row)
                seen_header = True
            elif "section" not in clean_row[0].lower():
                writer.writerow(clean_row)

    print(f"✅ Menu successfully saved to {output_file}")


# Example usage:
if __name__ == "__main__":
    relative_location = "proj2\\src\\database\\"
    with open("proj2\\src\\database\\Raw Website Content\\Raleigh Soul Kitchen.txt", "r", encoding="utf-8") as f:
        raw_text = f.read()
    menu_csv = generate_menu(raw_text, relative_location+"output.csv")
    print(menu_csv)
