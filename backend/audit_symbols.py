"""Syntax + symbol audit for every core file in app/. Exits 1 if any problem.

Run: python audit_symbols.py
"""
import pathlib
import sys
from io import StringIO

BASE = pathlib.Path(__file__).resolve().parent / "app"

REQUIRED = {
    "services/embedding_service.py": ["embed_texts", "embed_text", "get_genai_client"],
    "services/llm_service.py": ["rewrite_query", "answer"],
    "services/search_service.py": ["def search"],
    "services/conversation_service.py": ["get_owned", "get_or_create", "add_turn"],
    "services/attachment_service.py": ["def extract_text"],
    "core/exceptions.py": ["QuotaExceededError"],
    "routers/conversations_controller.py": ['@router.', "def "],
    "routers/search_controller.py": ['@router.', "def "],
}

problems = []


def check_syntax(path: pathlib.Path) -> None:
    try:
        compile(path.read_text(encoding="utf-8"), str(path), "exec")
    except SyntaxError as exc:
        problems.append(f"SYNTAX {path.name}: line {exc.lineno}: {exc.msg}")


def check_symbols(path: pathlib.Path, symbols: list[str]) -> None:
    text = path.read_text(encoding="utf-8")
    for sym in symbols:
        if sym not in text:
            problems.append(f"SYMBOL {path.name}: missing {sym!r}")


for rel, symbols in REQUIRED.items():
    path = BASE / rel
    if not path.exists():
        problems.append(f"MISSING FILE: {rel}")
        continue
    check_syntax(path)
    check_symbols(path, symbols)

for problem in problems:
    print("PROBLEM:", problem)

if problems:
    print(f"\n{len(problems)} problem(s).")
    sys.exit(1)
print("audit OK")
