import requests
from bs4 import BeautifulSoup


# Both are strings
def grab_html(url, output_file):
    try:
        # Send a GET request to the URL
        html = requests.get(url).text
        # html_content = BeautifulSoup(html, 'html.parser')
        # stripped_content = html_content.get_text(strip=True, separator='\n')

        with open(output_file, "w", encoding="utf-8") as file:
            file.write(html)

        print(f"HTML saved to {output_file}")
        return html

    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None
