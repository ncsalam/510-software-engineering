import os

def check_files_in_folder(folder_path):
    """Iterate through all .txt files in a folder and check line count."""
    for filename in os.listdir(folder_path):
        if filename.endswith(".txt"):
            file_path = os.path.join(folder_path, filename)
            
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                
                line_count = len(lines)
                if line_count > 110:
                    print(filename)
            
            except Exception as e:
                print(f"Error reading {file_path}: {e}")



