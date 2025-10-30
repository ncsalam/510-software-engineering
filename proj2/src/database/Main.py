import ast
import os
import google_tools
import html_tools
import menu_recreator

relative_location = "proj2\\src\\database\\"

if __name__ == "__main__":
  try:
    with open(relative_location+"Restaurant_List.txt", "r", encoding="utf-8") as f:
      restaurant_list = f.read().split(",")
  except FileNotFoundError:
    with open(relative_location+"Cuisine_List.txt", "r", encoding="utf-8") as f:
      cuisine_list = f.read().split(",")
    with open(relative_location+"Location.txt", "r", encoding="utf-8") as f:
      location = f.read()
    google_tools.restaurant_search(cuisine_list, location)
    with open(relative_location+"Restaurant_List.txt", "r", encoding="utf-8") as f:
      restaurant_list = f.read().split(",")
  
  try:
    with open(relative_location+"URL_List.txt", "r", encoding="utf-8") as file:
      content = file.read().strip()
      url_list = content.split(",") if content else []
  except FileNotFoundError:
    url_list = []
  # Generate and collect new URLs
    for restaurant in restaurant_list:
      query = f"{restaurant}-Raleigh Menu"
      payload = google_tools.build_payload(query, start=1, num=1)
      url = google_tools.send_payload(payload)
      url_list.append(url)
    # Save URLs
    with open(relative_location+"URL_List.txt", "w", encoding="utf-8") as file:
      file.write(",".join(url_list))

  with open(relative_location+"URL_List.txt", "r", encoding="utf-8") as f:
    url_list = f.read().split(",")
  
  folder_path = relative_location+"Raw Website Content"
  try:
    os.mkdir(folder_path)
    print(f"Folder '{folder_path}' created successfully.")
  except FileExistsError:
    print(f"Folder '{folder_path}' already exists.")

  i = 0
  for url in url_list:
    restaurant_name = restaurant_list[i]
    html_tools.extract_content(url, f"{folder_path}\\{restaurant_name}.txt", 120)
    i+=1
  
  for filename in os.listdir(folder_path):
    if filename.endswith(".txt"):
      file_path = os.path.join(folder_path, filename)       
      try:
        with open(file_path, "r", encoding="utf-8") as f:
          content = file.read()
          menu_recreator()
            
      except Exception as e:
        print(f"Error reading {file_path}: {e}")




