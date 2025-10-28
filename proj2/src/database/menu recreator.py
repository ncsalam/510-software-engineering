import os
from openai import OpenAI

API_Key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=API_Key)

response = client.chat.completions.create(
    model="gpt-5-nano",
    messages=[
        {"role": "system", "content": "You are a concise assistant."},
        {"role": "user", "content": "Summarize quantum entanglement in one sentence."}
    ],

)

print(response.choices[0].message.content)
