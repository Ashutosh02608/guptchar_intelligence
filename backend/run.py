import os
import sys
from dotenv import load_dotenv
import uvicorn

# Load environment configuration from root .env
load_dotenv()

# Ensure workspace packages (backend, ai, extractor) can be imported
workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "false").lower() in ("true", "1")
    uvicorn.run("backend.main:app", host=host, port=port, reload=reload, log_level="info")
