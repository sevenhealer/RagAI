import os
import vertexai
from google import genai
from vertexai import rag
from typing import Optional


PROJECT_ID = "ragai-07"
LOCATION = "us-central1"
CREDENTIALS_PATH = "/Users/rohanchatterjee/Documents/Projects/ragai-07-3af2fb185f78_new.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH


vertexai.init(project=PROJECT_ID, location=LOCATION)
client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)


#Create Corpus
def create_corpus(embedding_model="publishers/google/models/text-embedding-005", display_name="my-rag-corpus"):
    rag_corpus = rag.create_corpus(
        display_name=display_name,
        backend_config=rag.RagVectorDbConfig(
            rag_embedding_model_config=rag.RagEmbeddingModelConfig(
                vertex_prediction_endpoint=rag.VertexPredictionEndpoint(
                    publisher_model=embedding_model
                )
            )
        ),
    )
    print(f"Corpus created: {rag_corpus.name}")
    return rag_corpus


# print(create_corpus())


#Delete Corpus
def delete_corpus(corpus_name):
    return rag.delete_corpus(name=corpus_name)


# print(delete_corpus("projects/750217035946/locations/us-central1/ragCorpora/3173348887435935744"))


#List Corpus
def list_corpus(page_size=50, page_token: Optional[str] = None):
    return rag.list_corpora(page_size,page_token)

# print(list_corpus(100))

page1 = list_corpus(100)
page2 = list_corpus(page_size=100,page_token=page1.next_page_token)
page3 = list_corpus(page_size=100,page_token=page2.next_page_token)
page4 = list_corpus(page_size=100,page_token=page3.next_page_token)
page5 = list_corpus(page_size=100,page_token=page4.next_page_token)

count=0
for corpus in page5.rag_corpora:
    count=count+1
    print(corpus.name)
print(count)