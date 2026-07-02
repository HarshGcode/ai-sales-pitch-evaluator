from pathlib import Path

from docx import Document
from pypdf import PdfReader


class UnsupportedFileTypeError(ValueError):
    pass


def extract_text(path: Path, original_filename: str) -> str:
    suffix = Path(original_filename).suffix.lower()
    if suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".pdf":
        return _extract_pdf(path)
    if suffix == ".docx":
        return _extract_docx(path)
    raise UnsupportedFileTypeError(f"Unsupported file type: {suffix}")


def _extract_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(path: Path) -> str:
    document = Document(str(path))
    return "\n".join(p.text for p in document.paragraphs)
