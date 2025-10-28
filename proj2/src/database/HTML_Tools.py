import requests
from bs4 import BeautifulSoup


# Both are strings
def extract_content(url, output_file):
    try:
        html = requests.get(url)
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "sytle", "noscript"]):
            tag.decompose()

        text = soup.get_text(separator="\n")
        text = "\n".join(line.strip() for line in text.splitlines() if line.strip())

        with open(output_file, "w", encoding="utf-8") as file:
            file.write(text)

        print(f"Content saved to {output_file}")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None
