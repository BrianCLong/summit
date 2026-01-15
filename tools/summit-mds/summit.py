#!/usr/bin/env python3
import argparse
import logging
import os

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from duckduckgo_search import DDGS
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from termcolor import colored

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class SummitSummarizer:
    def __init__(self, model: str = "gpt-4o", max_iterations: int = 3, mock: bool = False):
        self.model = model
        self.max_iterations = max_iterations
        self.mock = mock
        self.client = None
        if not self.mock:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.warning("OPENAI_API_KEY not found. Switching to mock mode.")
                self.mock = True
            else:
                self.client = OpenAI(api_key=api_key)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def search_documents(self, query: str, limit: int = 5) -> list[str]:
        """Retrieve relevant URLs for the query."""
        logger.info(colored(f"Searching for: {query}", "cyan"))

        if self.mock:
            logger.info("Mock mode: Returning placeholder URLs.")
            return [
                "https://example.com/article1",
                "https://example.com/article2",
                "https://example.com/article3",
            ]

        urls = []
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=limit))
                for r in results:
                    urls.append(r["href"])
        except Exception as e:
            logger.error(f"Search failed: {e}")
            raise  # Let tenacity retry

        return urls

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def extract_content(self, url: str) -> str:
        """Extract main text content from a URL."""
        logger.info(f"Extracting content from: {url}")

        if self.mock:
            return f"This is the mock content for {url}. It contains information relevant to the user's query about {url}."

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")

            # Simple extraction heuristic: fetch all paragraphs
            paragraphs = soup.find_all("p")
            text = " ".join([p.get_text() for p in paragraphs])

            # Basic cleaning
            text = " ".join(text.split())
            return text
        except Exception as e:
            logger.error(f"Failed to extract content from {url}: {e}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _call_llm(self, messages: list[dict[str, str]]) -> str:
        """Helper to call LLM or return mock response."""
        if self.mock:
            return "Mock LLM Response: This is a simulated output summarizing the content."

        try:
            response = self.client.chat.completions.create(model=self.model, messages=messages)
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise

    def iterative_summarize(self, text: str, query: str) -> str:
        """Perform iterative summarization (SummIt approach)."""
        if not text:
            return ""

        # Truncate text if too long for simple demo (chunking could be more sophisticated)
        text_chunk = text[:10000]

        logger.info(colored("Starting iterative summarization...", "yellow"))

        # Step 1: Initial Draft
        draft_prompt = f"Write a comprehensive summary of the following text, focusing on the query: '{query}'.\n\nText:\n{text_chunk}"
        current_summary = self._call_llm([{"role": "user", "content": draft_prompt}])

        for i in range(self.max_iterations):
            logger.info(f"Iteration {i + 1}/{self.max_iterations}")

            # Step 2: Evaluation (Critique)
            critique_prompt = f"""
            You are a critical editor. Review the following summary against the user query '{query}' and the original text snippet provided below.
            Identify specific missing details, inaccuracies, or areas for improvement.
            If the summary is already excellent and accurate, reply with "SATISFIED".

            Original Text Snippet:
            {text_chunk[:2000]}... (truncated)

            Current Summary:
            {current_summary}
            """
            critique = self._call_llm([{"role": "user", "content": critique_prompt}])

            if "SATISFIED" in critique.upper():
                logger.info(colored("Evaluator is satisfied.", "green"))
                break

            # Step 3: Refinement
            refine_prompt = f"""
            Refine the following summary based on the critique provided.

            Current Summary:
            {current_summary}

            Critique:
            {critique}

            Please provide the rewritten, improved summary.
            """
            current_summary = self._call_llm([{"role": "user", "content": refine_prompt}])

        return current_summary

    def merge_summaries(self, summaries: list[str], query: str) -> str:
        """Synthesize multiple summaries into a final report."""
        logger.info(colored("Merging summaries...", "blue"))
        if not summaries:
            return "No summaries to merge."

        combined_text = "\n\n".join([f"Source {i + 1}:\n{s}" for i, s in enumerate(summaries)])

        merge_prompt = f"""
        Synthesize the following summaries into a single, coherent report that answers the query: '{query}'.
        Ensure the final report is well-structured and covers key information from all sources.

        Summaries:
        {combined_text}
        """
        return self._call_llm([{"role": "user", "content": merge_prompt}])

    def fact_check(self, final_report: str, original_texts: list[str]) -> str:
        """Verify facts in the report against original texts."""
        logger.info(colored("Running fact check...", "red"))

        # In a real system, we might look up specific claims.
        # Here, we pass a context window of the original texts (truncated).
        context = "\n\n".join([t[:2000] for t in original_texts if t])

        check_prompt = f"""
        Verify the following report against the provided source contexts.
        Flag any statements that appear unsupported or contradicted by the sources.
        If all facts seem supported, output "VERIFIED". Otherwise, list the issues and provide a corrected version of the report.

        Source Contexts:
        {context}

        Report:
        {final_report}
        """
        return self._call_llm([{"role": "user", "content": check_prompt}])

    def run(self, query: str):
        """Main execution pipeline."""
        print(
            colored(
                f"Summit Auto-Summarizer initialized for query: {query}", "green", attrs=["bold"]
            )
        )

        # 1. Search
        try:
            urls = self.search_documents(query)
        except Exception as e:
            logger.error(f"Search completely failed after retries: {e}")
            return

        if not urls:
            logger.error("No documents found.")
            return

        summaries = []
        original_texts = []

        # 2. Extract & Summarize Loop
        for url in urls:
            try:
                content = self.extract_content(url)
                if not content:
                    continue
                original_texts.append(content)

                summary = self.iterative_summarize(content, query)
                summaries.append(summary)
                print(f"Processed {url}")
            except Exception as e:
                logger.error(f"Error processing {url}: {e}")

        # 3. Merge
        try:
            final_report = self.merge_summaries(summaries, query)
        except Exception as e:
            logger.error(f"Merge failed: {e}")
            return

        # 4. Fact Check
        try:
            verification_result = self.fact_check(final_report, original_texts)
        except Exception as e:
            logger.error(f"Fact check failed: {e}")
            verification_result = "Fact check unavailable."

        print("\n" + "=" * 50)
        print(colored("FINAL REPORT", "magenta", attrs=["bold"]))
        print("=" * 50)

        # If the output indicates verification, we print the original report as verified.
        # Otherwise, we print the output which presumably contains corrections.
        if "VERIFIED" in verification_result.upper():
            print(colored("Status: Verified", "green"))
            print(final_report)
        else:
            print(colored("Status: Issues Found / Corrected", "yellow"))
            print(verification_result)

        print("=" * 50)


def main():
    parser = argparse.ArgumentParser(
        description="Summit: Automated Iterative Multi-Document Summarization"
    )
    parser.add_argument("query", help="The query/topic to summarize")
    parser.add_argument("--model", default="gpt-4o", help="LLM model to use (default: gpt-4o)")
    parser.add_argument(
        "--iterations", type=int, default=3, help="Max iterations for refinement (default: 3)"
    )
    parser.add_argument("--mock", action="store_true", help="Run in mock mode (no API calls)")

    args = parser.parse_args()

    summarizer = SummitSummarizer(model=args.model, max_iterations=args.iterations, mock=args.mock)
    summarizer.run(args.query)


if __name__ == "__main__":
    main()
