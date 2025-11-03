import os
import google_tools
import html_tools
import menu_recreator
import time
import sqlite_connection

def create_restaurant_list():
  cuisines = input("Enter Cuisines as a Comma-Separated List: ")
  cuisine_list = cuisines.split(",")
  location = input("Where would you like to search: ")
  google_tools.restaurant_search(cuisine_list, location)

def open_restaurant_list():
  try:
    with open(relative_path+"Restaurant_List.txt", "r", encoding="utf-8") as f:
      restaurant_list = f.read().split(",")
      print("✅ Restaurant List Detected")
      return restaurant_list
  except FileNotFoundError:
    create_restaurant_list()
    with open(relative_path+"Restaurant_List.txt", "r", encoding="utf-8") as f:
      restaurant_list = f.read().split(",")
      print("✅ Restaurant List Created")
      return restaurant_list

def create_url_list():
  url_list = []
  # Generate and collect new URLs
  for restaurant in restaurant_list:
    query = f"{restaurant}-Raleigh Menu"
    payload = google_tools.build_payload(query, start=1, num=1)
    url = google_tools.send_payload(payload)
    url_list.append(url)
  # Save URLs to txt file to make subsequent runs faster and cheaper
  with open(relative_path+"URL_List.txt", "w", encoding="utf-8") as file:
    file.write(",".join(url_list))

def open_url_list():
  try:
    with open(relative_path+"URL_List.txt", "r", encoding="utf-8") as file:
      content = file.read().strip()
      url_list = content.split(",")
      print("✅ URL List Detected.")
      return url_list
  except FileNotFoundError:
    create_url_list()
    with open(relative_path+"URL_List.txt", "r", encoding="utf-8") as f:
      url_list = f.read().split(",")
      print("✅ URL List Created")
      return url_list

def make_website_content_folder():
  content_folder_path = relative_path+"Raw Website Content"
  try:
    os.mkdir(content_folder_path)
    print(f"Folder '{content_folder_path}' created successfully.")
  except FileExistsError:
    print(f"Folder '{content_folder_path}' already exists.")

def extract_website_content():
  i = 0
  for url in url_list:
    restaurant_name = restaurant_list[i]
    html_tools.extract_content(url, f"{content_folder_path}\\{restaurant_name}.txt")
    i+=1

def make_csv_folder():
  try:
    os.mkdir(csv_folder_path)
    print(f"Folder '{csv_folder_path}' created successfully.")
  except FileExistsError:
    print(f"Folder '{csv_folder_path}' already exists.")

def create_menu_csv():
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

if __name__ == "__main__":
  relative_path = "proj2\\src\\database\\"
  content_folder_path = relative_path+"Raw Website Content"
  csv_folder_path = relative_path+"Menu_CSVs\\"

  restaurant_list = open_restaurant_list()
  url_list = open_url_list()
  make_website_content_folder()
  extract_website_content()
  make_csv_folder()
  create_menu_csv()
  sqlite_connection.upload_data()