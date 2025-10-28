import ast
import os
import google_tools
import html_tools

if __name__ == "__main__":
  try:
    with open("Restaurant_List.txt", "r", encoding="utf-8") as f:
      restaurant_list = f.read().split(",")
  except FileNotFoundError:
    with open("Cuisine_list.txt", "r", encoding="utf-8") as f:
      cuisine_list = f.read().split(",")
    with open("Location.txt", "r", encoding="utf-8") as f:
      location = f.read()
    google_tools.restaurant_search(cuisine_list, location)
    with open("Restaurant_List.txt", "r", encoding="utf-8") as f:
      restaurant_list = f.read().split(",")
  
  # try:
  #   with open("URL_List.txt", "r", encoding="utf-8") as file:
  #     content = file.read().strip()
  #     url_list = content.split(",") if content else []
  # except FileNotFoundError:
  url_list = []

  #######################
  # RATE LIMIT AHHHHHHH #
  #######################

  # Generate and collect new URLs
  for restaurant in restaurant_list:
    query = f"{restaurant} Menu"
    payload = google_tools.build_payload(query, start=1, num=1)
    url = google_tools.send_payload(payload)
    url_list.append(url)

# Save back to file as comma-separated values
  with open("URL_List.txt", "w", encoding="utf-8") as file:
    file.write(",".join(url_list))

  with open("URL_List.txt", "r", encoding="utf-8") as f:
    url_list = f.read().split(",")
  
  folder_name = "Website_Content"
  try:
    os.mkdir(folder_name)
    print(f"Folder '{folder_name}' created successfully.")
  except FileExistsError:
    print(f"Folder '{folder_name}' already exists.")

  i = 0
  for url in url_list:
    HTML_Tools.extract_content(url, f"Website_Content\{i}.txt")
    i+=1

