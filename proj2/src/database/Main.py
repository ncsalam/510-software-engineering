import os
import google_tools
import html_tools
import menu_recreator
import time

relative_path = "proj2\\src\\database\\"

if __name__ == "__main__":
  try:
    with open(relative_path+"Restaurant_List.txt", "r", encoding="utf-8") as f:
      restaurant_list = f.read().split(",")
  except FileNotFoundError:
    with open(relative_path+"Cuisine_List.txt", "r", encoding="utf-8") as f:
      cuisine_list = f.read().split(",")
    with open(relative_path+"Location.txt", "r", encoding="utf-8") as f:
      location = f.read()
    google_tools.restaurant_search(cuisine_list, location)
    with open(relative_path+"Restaurant_List.txt", "r", encoding="utf-8") as f:
      restaurant_list = f.read().split(",")
  
  try:
    with open(relative_path+"URL_List.txt", "r", encoding="utf-8") as file:
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
    with open(relative_path+"URL_List.txt", "w", encoding="utf-8") as file:
      file.write(",".join(url_list))

  with open(relative_path+"URL_List.txt", "r", encoding="utf-8") as f:
    url_list = f.read().split(",")
  
  content_folder_path = relative_path+"Raw Website Content"
  try:
    os.mkdir(content_folder_path)
    print(f"Folder '{content_folder_path}' created successfully.")
  except FileExistsError:
    print(f"Folder '{content_folder_path}' already exists.")

  i = 0
  for url in url_list:
    restaurant_name = restaurant_list[i]
    html_tools.extract_content(url, f"{content_folder_path}\\{restaurant_name}.txt", 120)
    i+=1
  
  csv_folder_path = relative_path+"Menu_Files\\"
  try:
    os.mkdir(csv_folder_path)
    print(f"Folder '{csv_folder_path}' created successfully.")
  except FileExistsError:
    print(f"Folder '{csv_folder_path}' already exists.")


  for filename in os.listdir(content_folder_path):
    if filename.endswith(".txt"):
      file_path = os.path.join(content_folder_path, filename)       
      try:
        with open(file_path, "r", encoding="utf-8") as file:
          content = file.read()
          csv_name = filename.removesuffix(".txt")
          menu_recreator.recreate_menu(content, csv_folder_path+csv_name)
          print("Chat has returned")
          time.sleep(10)
          
            
      except Exception as e:
        print(f"Error reading {file_path}: {e}")

