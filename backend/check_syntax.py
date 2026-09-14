"""Compile-check every backend .py file (excluding .venv + __pycache__).

Run: python check_syntax.py
"""
import ast
import pathlib
import sys

base = pathlib.Path(__file__).resolve().parent / "app"
failures = []
count = 0
for p in base.rglob("*.py"):
    count += 1
    try:
        ast.parse(p.read_text(encoding="utf-8"), filename=str(p))
    except SyntaxError as e:
        failures.append((str(p), e.lineno, e.msg))

print(f"checked {count} files, {len(failures)} syntax errors")
for path, line, msg in failures:
    print(f"FAIL {path}:{line}: {msg}")
sys.exit(1 if failures else 0)