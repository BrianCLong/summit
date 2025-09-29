import asyncio
import logging
from datetime import datetime, timedelta

import aiohttp

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


class GDELTCrawler:
    def __init__(self, api_key=None, rate_limit_per_second=1):
        self.api_key = api_key  # GDELT typically doesn't require an API key for basic access
        self.base_url = "https://api.gdeltproject.org/api/v2/doc/doc"
        self.session = None
        self.rate_limit_per_second = rate_limit_per_second
        self.semaphore = asyncio.Semaphore(rate_limit_per_second)  # For basic rate limiting

    async def _get_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session

    async def _fetch(self, params):
        async with self.semaphore:  # Wait for semaphore to acquire a slot
            session = await self._get_session()
            try:
                async with session.get(self.base_url, params=params) as response:
                    response.raise_for_status()  # Raise an exception for HTTP errors
                    return await response.json()
            except aiohttp.ClientError as e:
                logging.error(f"Error fetching GDELT data: {e}")
                return None
            finally:
                await asyncio.sleep(
                    1 / self.rate_limit_per_second
                )  # Ensure rate limit is respected

    async def search_articles(self, query, start_date, end_date, num_articles=10):
        """
        Searches GDELT for articles based on a query and date range.
        start_date and end_date should be in YYYYMMDD format.
        """
        logging.info(f"Searching GDELT for '{query}' from {start_date} to {end_date}")
        params = {
            "query": query,
            "format": "json",
            "startdatetime": start_date + "000000",  # YYYYMMDDHHMMSS
            "enddatetime": end_date + "235959",
            "maxrecords": num_articles,
            "sortby": "relevance",
            "mode": "ArtList",  # Get article list
        }
        data = await self._fetch(params)
        if data and "articles" in data:
            logging.info(f"Found {len(data['articles'])} articles for '{query}'")
            return data["articles"]
        return []

    async def close(self):
        if self.session:
            await self.session.close()
            self.session = None


async def main():
    crawler = GDELTCrawler(rate_limit_per_second=0.5)  # 2 seconds per request
    today = datetime.now()
    yesterday = today - timedelta(days=1)
    start_date = yesterday.strftime("%Y%m%d")
    end_date = today.strftime("%Y%m%d")

    try:
        articles = await crawler.search_articles(
            "Ukraine war", start_date, end_date, num_articles=5
        )
        for article in articles:
            logging.info(f"Article Title: {article.get('title')}")
            logging.info(f"Article URL: {article.get('url')}")
            logging.info("-" * 20)
    finally:
        await crawler.close()


if __name__ == "__main__":
    asyncio.run(main())
