"""
KEY ROTATOR — round-robins multiple API keys for one provider.

A provider configured as e.g. HUGGINGFACE_API_KEYS="key1,key2,key3" gets
one adapter instance backed by all three; a 429/401/403 advances to the
next key instead of failing the whole call.
"""

import logging

logger = logging.getLogger(__name__)


def mask_key(key: str) -> str:
    if len(key) <= 8:
        return "***"
    return f"{key[:4]}...{key[-4:]}"


class KeyRotator:
    def __init__(self, provider: str, keys: list[str]):
        if not keys:
            raise ValueError(f"{provider}: KeyRotator needs at least one key")
        self.provider = provider
        self._keys = keys
        self._index = 0

    @property
    def current(self) -> str:
        return self._keys[self._index]

    def rotate(self) -> str:
        self._index = (self._index + 1) % len(self._keys)
        logger.info(
            f"[{self.provider}] rotated to key {self._index + 1}/{len(self._keys)} "
            f"({mask_key(self.current)})"
        )
        return self.current

    def __len__(self) -> int:
        return len(self._keys)
