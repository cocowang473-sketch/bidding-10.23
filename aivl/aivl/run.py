from pathlib import Path

from dotenv import load_dotenv
import os

import uvicorn

# 必须先加载 .env，再读 HOST/PORT
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000") or "8000")
    print(f"Listening on http://{host}:{port}", flush=True)
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
