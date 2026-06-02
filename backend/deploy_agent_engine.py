"""OPTIONAL: deploy the RAG agent to Vertex AI Agent Engine (managed runtime).

This is scaffolding, NOT used by the FastAPI app (which runs the agent in-process).
Run it manually when you want a managed, autoscaled agent endpoint on GCP:

    python deploy_agent_engine.py --corpus "projects/.../ragCorpora/123"

Notes:
  * Agent Engine bills separately and creates a long-lived resource.
  * The Vertex AI SDK reorganizes these APIs between releases. If the imports
    below fail, check `vertexai.agent_engines` / `vertexai.preview.reasoning_engines`
    for your installed `google-cloud-aiplatform` version.
"""

import argparse

import vertexai
from vertexai.preview import reasoning_engines  # AdkApp wrapper lives here
from vertexai import agent_engines

from app.config import PROJECT_ID, LOCATION
from app.agent.rag_agent import build_agent


def deploy(corpus_name: str, staging_bucket: str):
    vertexai.init(project=PROJECT_ID, location=LOCATION, staging_bucket=staging_bucket)

    # Wrap the ADK agent so Agent Engine can serve it.
    app = reasoning_engines.AdkApp(agent=build_agent(corpus_name), enable_tracing=True)

    remote_app = agent_engines.create(
        agent_engine=app,
        display_name="ragai-agent",
        requirements=[
            "google-adk>=2.1.0",
            "google-genai>=1.75.0",
            "google-cloud-aiplatform[agent_engines]",
        ],
    )
    print("Deployed Agent Engine resource:", remote_app.resource_name)
    return remote_app


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", required=True, help="Full RAG corpus resource name")
    parser.add_argument(
        "--bucket",
        required=True,
        help="GCS staging bucket, e.g. gs://my-bucket",
    )
    args = parser.parse_args()
    deploy(args.corpus, args.bucket)
