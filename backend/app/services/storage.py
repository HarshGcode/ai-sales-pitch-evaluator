import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from fastapi import UploadFile

from app.config import settings


class StorageService(ABC):
    @abstractmethod
    def save(self, file: UploadFile, subfolder: str) -> str:
        """Persist the uploaded file and return a storage key (relative path)."""

    @abstractmethod
    def get_path(self, key: str) -> Path:
        """Resolve a storage key to a local filesystem path for reading."""

    @abstractmethod
    def delete(self, key: str) -> None: ...


class LocalDiskStorage(StorageService):
    def __init__(self, root: str | None = None):
        self.root = Path(root or settings.STORAGE_ROOT)

    def save(self, file: UploadFile, subfolder: str) -> str:
        directory = self.root / subfolder
        directory.mkdir(parents=True, exist_ok=True)
        original_name = file.filename or "upload"
        suffix = Path(original_name).suffix
        key = f"{subfolder}/{uuid.uuid4()}{suffix}"
        target = self.root / key
        with target.open("wb") as out:
            while chunk := file.file.read(1024 * 1024):
                out.write(chunk)
        file.file.seek(0)
        return key

    def get_path(self, key: str) -> Path:
        return self.root / key

    def delete(self, key: str) -> None:
        path = self.get_path(key)
        if path.exists():
            path.unlink()


def get_storage_service() -> StorageService:
    if settings.STORAGE_BACKEND != "local":
        raise NotImplementedError(f"Storage backend '{settings.STORAGE_BACKEND}' is not implemented yet")
    return LocalDiskStorage()
