from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pathlib import Path
from config import settings


# -- EMBEDDING SETUP ----------------------------------------------------
def get_embeddings():
    """Local embeddings via Ollama — no internet required."""
    return OllamaEmbeddings(model=settings.EMBED_MODEL)


# -- INDEX CORPUS -------------------------------------------------------
def build_index() -> Chroma:
    """
    Load all PDFs and TXT files from the docs directory,
    chunk them, embed with nomic-embed-text, and store in ChromaDB.
    Run once — subsequent loads use the persisted index.
    """
    docs_dir = Path(settings.DOCS_DIR)
    all_docs = []

    if not docs_dir.exists():
        docs_dir.mkdir(parents=True, exist_ok=True)

    for path in docs_dir.iterdir():
        if path.suffix == ".pdf":
            loader = PyPDFLoader(str(path))
        elif path.suffix in (".txt", ".md"):
            loader = TextLoader(str(path))
        else:
            continue
        all_docs.extend(loader.load())

    if not all_docs:
        print("! No documents found in docs directory. Index will be empty.")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,   # 500 tokens per chunk — good for policy docs
        chunk_overlap=80,  # Overlap to avoid context splits mid-sentence
    )
    chunks = splitter.split_documents(all_docs)

    persist_dir = Path(settings.CHROMA_PERSIST_DIR)
    persist_dir.mkdir(parents=True, exist_ok=True)

    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        persist_directory=settings.CHROMA_PERSIST_DIR,
    )
    print(f"[SUCCESS] Indexed {len(chunks)} chunks from {len(all_docs)} documents")
    return vector_store


def load_index() -> Chroma:
    """Load a previously built ChromaDB index. Instant on subsequent runs."""
    persist_dir = Path(settings.CHROMA_PERSIST_DIR)
    if not persist_dir.exists() or not any(persist_dir.iterdir()):
        print("! No existing index found. Building index now...")
        return build_index()

    return Chroma(
        persist_directory=settings.CHROMA_PERSIST_DIR,
        embedding_function=get_embeddings(),
    )


# -- RETRIEVAL ----------------------------------------------------------
def retrieve(
    query: str,
    vector_store: Chroma | None,
    k: int = 4,
) -> list[dict]:
    """
    Retrieve top-k most relevant policy/SOP chunks for a given query.
    Returns a list of dicts with 'content' and 'source' keys.
    """
    if vector_store is None:
        return []

    try:
        results = vector_store.similarity_search(query, k=k)
        return [
            {"content": doc.page_content, "source": doc.metadata.get("source", "Unknown")}
            for doc in results
        ]
    except Exception:
        return []


# -- GROUNDED GENERATION ------------------------------------------------
def generate_grounded_plan(
    intake_record: dict,
    retrieved_docs: list[dict],
    gemma_fn,  # Pass in chat_text function
) -> str:
    """
    Given an extracted intake record and retrieved policy chunks,
    ask Gemma 4 to generate an action plan grounded in the documents.
    """
    context = "\n\n".join([
        f"[{doc['source']}]\n{doc['content']}"
        for doc in retrieved_docs
    ])
    prompt = f"""You are a disaster relief case manager.

INTAKE RECORD:
{intake_record}

RELEVANT RELIEF POLICIES AND STANDARDS:
{context}

Based ONLY on the intake record and the above policy documents, generate:
1. TRIAGE SUMMARY: 2-3 sentences describing the person's situation
2. IMMEDIATE ACTIONS: Numbered list of next steps (max 5)
3. RESOURCE NEEDS: Specific resources required
4. MISSING INFO: What the volunteer should ask next
5. ESCALATION: Whether this case needs supervisor review (YES/NO + reason)
6. POLICY CITATIONS: Which document sections justify your triage decision

Be specific, brief, and actionable. Real lives depend on this being clear."""
    return gemma_fn(prompt)
