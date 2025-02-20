import requests # type: ignore

LINKEDIN_API_URL = "https://api.linkedin.com/v2/"
ACCESS_TOKEN = "TU_ACCESS_TOKEN"

def search_profiles(keyword):
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
    params = {"q": "people", "keywords": keyword}
    
    response = requests.get(LINKEDIN_API_URL + "search", headers=headers, params=params)
    
    if response.status_code == 200:
        return response.json()
    else:
        return {"error": "No se pudo obtener información"}