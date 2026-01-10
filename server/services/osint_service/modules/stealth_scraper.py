import httpx
from bs4 import BeautifulSoup


async def scrape_website(url: str):
    """
    Scrapes a website for text and links using asynchronous requests.
    """
    headers = {
        "User-Agent": "SummitOSINT/1.0 (https://github.com/BrianCLong/summit; mailto:security@summit.com)"
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, "html.parser")
            text = soup.get_text()
            links = [a["href"] for a in soup.find_all("a", href=True)]
            return {"text": text, "links": links}
        except httpx.RequestError as e:
            return {"error": str(e)}
